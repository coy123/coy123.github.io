// The welcome email — sent once, the moment a checkout completes.
//
// Why it exists: the seven-day delay (lib/embargo.ts) hides every newly
// detected bando from the public site for a week, and the daily campaign only
// mails what is NEW that day. So someone who subscribed on a Tuesday used to
// get nothing at all until the next detection: no confirmation from us (only
// Stripe's receipt), and no way to see the bandi they had just paid for. This
// email closes both holes — it thanks them, and it hands over exactly the set
// they cannot see anywhere else.
//
// Design constraints, in order of importance:
//
//   1. It must never cost an entitlement. Every failure in here is caught and
//      logged by the caller and the webhook still answers 200. A missing
//      welcome email is recoverable (tomorrow's campaign, then the site);
//      a 500 makes Stripe retry the whole event, which re-grants and re-mails.
//   2. It must not send twice. Stripe redelivers `checkout.session.completed`
//      on its own schedule, and any 500 later in the handler replays it. The
//      guard is `welcome_sent_at` in the Stripe customer's metadata — no new
//      binding, and visible in the dashboard when something looks wrong.
//   3. It must show what is CURRENTLY embargoed, not what was new today. That
//      is `isPublished` from lib/embargo.ts, the same function the site and the
//      Cypress suite use, applied to data.json at send time. Expired bandi are
//      not in that set: they are published on the site whatever their detection
//      date says, and a closed bando is not what the subscription bought.

import type Stripe from 'stripe'

import {
  RELEASE_DELAY_DAYS,
  currentDay,
  detectionDay,
  isPublished,
  releaseCutoff,
} from '../../lib/embargo'
import { composeWelcome, renderEmail, trimStrings } from '../../newsletter/render.mjs'
// One email to one person, built out of MailerLite's campaign API — it has no
// transactional endpoint. See newsletter/mailerlite.mjs for why it looks like
// this, and for what it buys: no second provider, no new DNS, no new processor.
import {
  cleanupWelcomeGroups,
  italianLanguageId,
  mailerliteClient,
  sendOneOff,
} from '../../newsletter/mailerlite.mjs'
// The welcome email's own shell — prose first, then the table. The daily
// campaign's shell (email_template.html) is a different email and is not used
// here; the bandi table is the one piece the two share.
import shellTemplate from '../../newsletter/welcome_template.html'
import tableTemplate from '../../newsletter/email_table.html'

export interface WelcomeEnv {
  // The same key the entitlement grant uses — this email is a MailerLite
  // campaign aimed at a group of one, so there is nothing extra to configure.
  // Typed optional only because the Worker's own REQUIRED check owns it.
  MAILERLITE_API_KEY?: string
  STRIPE_PORTAL_URL?: string
  DEPLOY_MODE?: string
}

/**
 * data.json, read straight from the repo it is curated in.
 *
 * ── If the repo is ever made private, this breaks. ───────────────────────────
 * The repo is public today, which is an accepted trade-off (see CLAUDE.md):
 * the embargoed rows are therefore already readable by anyone who thinks to
 * look at GitHub, and the audience is not technical. The moment that changes,
 * this fetch 404s and the welcome email silently loses its table — it will not
 * fail loudly, because a fetch error here is caught and swallowed by design.
 *
 * The replacement, in rough order of effort: (a) a fine-grained read-only PAT
 * as a Worker secret and the contents API instead of raw; (b) a KV namespace
 * that .github/workflows/deploy.yml writes the embargoed set into, which also
 * removes the GitHub dependency entirely. (b) is the better home if the site
 * ever needs the data at runtime for anything else.
 * ────────────────────────────────────────────────────────────────────────────
 */
const DATA_URL = 'https://raw.githubusercontent.com/coy123/coy123.github.io/master/data/data.json'

/** A row of data/data.json, as it is stored (`detectedat`, lowercase). */
interface RawBid {
  location: string
  amount: number
  deadline: string
  url: string
  image: string
  detectedat?: string
}

/** The same row once the detection date has been folded to an Italian day. */
interface Bid extends RawBid {
  detectedAt?: string
}

/**
 * The bandi a brand-new subscriber cannot see on the site: everything still
 * inside its seven-day window.
 *
 * A row whose `detectedat` is missing or unreadable counts as published — the
 * same fallback `lib/data.ts` applies — so it is simply left out of the email.
 * That is the right direction for a send: the site is already showing it, so
 * it is not part of what the subscription bought.
 *
 * So is a bando whose scadenza has already passed, for the same reason plus a
 * better one: an archive row backfilled last week is on the site and cannot be
 * entered anyway, and "here is what you paid for" is a poor thing to say over
 * a list of closed bandi. `isPublished` makes that call — see `hasExpired` in
 * lib/embargo.ts.
 */
export const embargoedBandi = (rows: RawBid[], at: number = Date.now()): Bid[] => {
  const cutoff = releaseCutoff(at)
  const today = currentDay(at)
  return rows
    .map((row) => trimStrings(row) as RawBid)
    .map((row): Bid => ({ ...row, detectedAt: detectionDay(row.detectedat) }))
    .filter((row) => !isPublished(row, cutoff, today))
}

const fetchBandi = async (): Promise<RawBid[]> => {
  // raw.githubusercontent sits behind a CDN with a short cache; the query
  // string keeps a just-pushed bando from being missed by a few minutes.
  const res = await fetch(`${DATA_URL}?t=${Date.now()}`, {
    headers: { Accept: 'application/json' },
    cf: { cacheTtl: 0 },
  })

  if (!res.ok) throw new Error(`data.json fetch failed: ${res.status}`)

  const parsed = await res.json()
  if (!Array.isArray(parsed)) throw new Error('data.json did not parse as an array')
  return parsed as RawBid[]
}

/**
 * Sends the welcome email, unless this customer has already had one.
 *
 * Never throws — every path returns, logging what it did. The caller may not
 * turn a mail problem into a webhook failure (see the header of this file), and
 * putting that rule here rather than at the call site keeps it from being
 * forgotten by the next handler that wants to send something.
 */
export const sendWelcomeEmail = async (
  stripe: Stripe,
  env: WelcomeEnv,
  email: string,
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null
): Promise<void> => {
  try {
    if (!env.MAILERLITE_API_KEY) {
      console.error('No welcome email sent: MAILERLITE_API_KEY is not configured.')
      return
    }

    const customerId = customer ? (typeof customer === 'string' ? customer : customer.id) : null

    // A guest checkout with no customer cannot be marked, so it cannot be
    // deduplicated either. Subscription-mode Payment Links always create one,
    // so this is close to unreachable — and sending twice beats not sending.
    if (customerId) {
      const record = await stripe.customers.retrieve(customerId)
      if (!record.deleted && record.metadata?.welcome_sent_at) {
        console.log(
          `Welcome email already sent to ${email} on ${record.metadata.welcome_sent_at} — skipping`
        )
        return
      }
    } else {
      console.warn(`No customer on the checkout for ${email}: sending unguarded`)
    }

    const bandi = embargoedBandi(await fetchBandi())

    // Copy and layout live in newsletter/render.mjs alongside the campaign's,
    // so `scripts/preview-welcome.mjs` can render exactly this email locally
    // without a Worker, a checkout or a deploy.
    const composed = composeWelcome(bandi, {
      portalUrl: env.STRIPE_PORTAL_URL ?? '',
      tableTemplate,
      releaseDays: RELEASE_DELAY_DAYS,
    })

    const html = renderEmail(shellTemplate, composed)

    // Both Workers send through the same MailerLite account — there is only one,
    // and it has no test mode — so the subject line is what tells a staging send
    // apart in an inbox and in the campaign list.
    const prefix = env.DEPLOY_MODE === 'test' ? '[test] ' : ''

    const call = mailerliteClient(env.MAILERLITE_API_KEY)

    // Deletes the throwaway groups left by earlier sends. Before the send
    // rather than after, so a failure below still leaves the account tidy next
    // time; it swallows its own errors and can never block the email.
    await cleanupWelcomeGroups(call)

    const campaignId = await sendOneOff(call, {
      email,
      subject: `${prefix}${composed.subject}`,
      html,
      namePrefix: prefix,
      languageId: await italianLanguageId(call),
    })

    console.log(`Welcome campaign ${campaignId} scheduled for ${email}`)

    // After the send, never before: marking first would turn one failed send
    // into a permanently missing email. The cost of this order is that a
    // failure between send and mark can duplicate the email on redelivery,
    // which is the harmless direction.
    if (customerId) {
      await stripe.customers.update(customerId, {
        metadata: { welcome_sent_at: new Date().toISOString() },
      })
    }

    console.log(`Welcome email sent to ${email} with ${bandi.length} embargoed bando/i`)
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    console.error(`Welcome email for ${email} failed (entitlement is unaffected): ${reason}`)
  }
}
