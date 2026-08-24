// Renders — and optionally sends — the welcome email, without a checkout.
//
// The Worker (stripe-worker/src/welcome.ts) sends this automatically when
// someone subscribes. This script exists for the two things that cannot wait
// for a checkout:
//
//   1. Seeing what the email looks like before it goes to a paying customer,
//      including the empty state, which is rare enough that it would otherwise
//      only ever be seen by the one subscriber unlucky enough to hit it.
//   2. Backfilling by hand — subscribers who paid before this email existed
//      never got one.
//
// Usage, from the repo root:
//
//   node scripts/preview-welcome.mjs                       -> HTML on stdout
//   node scripts/preview-welcome.mjs --out /tmp/mail.html   -> HTML to a file
//   node scripts/preview-welcome.mjs --empty                -> the no-bandi email
//   node scripts/preview-welcome.mjs --remote               -> what the WORKER would send
//   node scripts/preview-welcome.mjs --text                 -> the plain-text part
//   MAILERLITE_API_KEY=… node scripts/preview-welcome.mjs --send someone@example.com
//
// By default it reads the LOCAL data/data.json. `--remote` reads the same URL
// the Worker does — `master` on GitHub — which is what a real send is built
// from, whatever branch you happen to have checked out. Use it to see what a
// staging checkout will actually produce.

import { readFileSync, writeFileSync } from 'node:fs'

import { composeWelcome, renderEmail, trimStrings } from '../newsletter/render.mjs'
import {
  cleanupWelcomeGroups,
  italianLanguageId,
  mailerliteClient,
  sendOneOff,
} from '../newsletter/mailerlite.mjs'
// The one definition of "hidden", shared with the site and the Cypress suite.
// Node >= 22.18 strips the types on the fly; this script is never run in CI, so
// that local-only capability is fine here and nowhere else.
import { RELEASE_DELAY_DAYS, detectionDay, isPublished, releaseCutoff } from '../lib/embargo.ts'

const args = process.argv.slice(2)
const flag = (name) => args.includes(name)
const value = (name) => {
  const i = args.indexOf(name)
  return i === -1 ? undefined : args[i + 1]
}

const PORTAL_URL = 'https://billing.stripe.com/p/login/cNi14namu0kOaTH4fXfEk00?locale=it'

const template = (name) => readFileSync(new URL(`../newsletter/${name}`, import.meta.url), 'utf8')

// Must stay in step with DATA_URL in stripe-worker/src/welcome.ts.
const REMOTE_DATA =
  'https://raw.githubusercontent.com/coy123/coy123.github.io/master/data/data.json'

const rows = async () => {
  if (flag('--empty')) return []
  if (!flag('--remote')) return JSON.parse(readFileSync('data/data.json', 'utf8'))

  const res = await fetch(`${REMOTE_DATA}?t=${Date.now()}`)
  if (!res.ok) throw new Error(`${REMOTE_DATA} → ${res.status}`)
  return res.json()
}

const cutoff = releaseCutoff()
const bandi = (await rows())
  .map(trimStrings)
  .map((row) => ({ ...row, detectedAt: detectionDay(row.detectedat) }))
  .filter((row) => !isPublished(row, cutoff))

const composed = composeWelcome(bandi, {
  portalUrl: PORTAL_URL,
  tableTemplate: template('email_table.html'),
  releaseDays: RELEASE_DELAY_DAYS,
})

const html = renderEmail(template('welcome_template.html'), composed)

const recipient = value('--send')

if (!recipient) {
  const out = value('--out')
  const body = flag('--text') ? composed.text : html

  if (out) {
    writeFileSync(out, body)
    console.error(`Wrote ${out}`)
  } else {
    console.log(body)
  }

  console.error(`\nSubject: ${composed.subject}`)
  console.error(
    `Bandi in anteprima (cutoff ${cutoff}, ${flag('--remote') ? 'master' : 'local'}): ${bandi.length}`
  )
  for (const b of bandi) console.error(`  - ${b.location} — rilevato ${b.detectedAt}`)
  process.exit(0)
}

// --- Actually sending ------------------------------------------------------
// The same path the Worker takes: a MailerLite campaign aimed at a throwaway
// group holding this one address (newsletter/mailerlite.mjs). The recipient
// must already be a MailerLite subscriber — for a backfill they are, since they
// are paying and the entitlement grant put them on the list.
//
// No idempotency guard here, unlike the Worker: this is a deliberate manual
// act, and the operator knows who they are mailing. Nothing is written back to
// the Stripe customer either, so a later automatic send is still possible —
// set `welcome_sent_at` on the customer in the Stripe dashboard if you want to
// be sure this address is never mailed again by the Worker.

const key = process.env.MAILERLITE_API_KEY
if (!key) throw new Error('MAILERLITE_API_KEY is not set')

const call = mailerliteClient(key)
await cleanupWelcomeGroups(call)

const campaignId = await sendOneOff(call, {
  email: recipient,
  subject: composed.subject,
  html,
  languageId: await italianLanguageId(call),
})

console.error(`Campaign ${campaignId} scheduled for ${recipient} — ${bandi.length} bando/i`)
