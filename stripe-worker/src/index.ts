// Stripe -> MailerLite entitlement webhook (UNIFICATION_BRAINSTORM.md §8i).
//
// MailerLite group membership IS the subscription. This Worker's only job is to
// put payers into the group and take them out again; the send pipeline
// (.github/workflows/newsletter.yml) knows nothing about Stripe and needs no
// edit. Everything downstream keys off group membership alone.
//
// Two routes, one Worker:
//   POST /            Stripe -> MailerLite  (entitlement: grant / revoke)
//   POST /mailerlite  MailerLite -> Stripe  (unsubscribe cancels the subscription)
//
// The second exists because {$unsubscribe} stops the email but not the charge,
// and someone paying for nothing eventually files a chargeback. Note the two
// directions need OPPOSITE failure strategies: Stripe retries a 5xx for days,
// which makes a loud failure a useful alarm, whereas MailerLite DISABLES a
// webhook after 3 days of non-2xx, so "nothing to do" must answer 200 there.

import Stripe from 'stripe'

export interface Env {
  STRIPE_SECRET_KEY: string
  STRIPE_WEBHOOK_SECRET: string
  MAILERLITE_API_KEY: string
  MAILERLITE_GROUP_ID: string
  // Only the /mailerlite route needs this, so it is deliberately NOT in
  // REQUIRED: a deploy that predates the secret must keep the Stripe path
  // working rather than 500 every entitlement event.
  MAILERLITE_WEBHOOK_SECRET?: string
}

// Stripe's endpoint is registered at the root and stays there; the unsubscribe
// route is additive so no dashboard change is needed.
const MAILERLITE_PATH = '/mailerlite'

const MAILERLITE = 'https://connect.mailerlite.com/api'

// Every binding the Worker cannot run without. Deploying is independent of
// uploading secrets, so a Worker that is live but unconfigured is a normal
// state to end up in, not an exotic one.
const REQUIRED = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'MAILERLITE_API_KEY',
  'MAILERLITE_GROUP_ID',
] as const satisfies readonly (keyof Env)[]

// Subscription statuses that keep someone on the list. Everything else
// (past_due, unpaid, canceled, incomplete, incomplete_expired, paused) revokes.
//
// `trialing` is dead weight today — §8i deliberately configures no free trial,
// since at this price point a trial mostly attracts card testing. It is listed
// so that turning one on later does not silently lock out every trialist.
const ENTITLED = new Set<Stripe.Subscription.Status>(['active', 'trialing'])

const mailerlite = (env: Env, path: string, init: RequestInit = {}) =>
  fetch(`${MAILERLITE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.MAILERLITE_API_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...init.headers,
    },
  })

// POST /subscribers is an upsert, which is what makes Stripe's at-least-once
// redelivery safe to ignore: the same event arriving twice is a no-op.
//
// `status: 'active'` must be explicit (§8i). With double opt-in enabled an
// API-created subscriber sits at `unconfirmed` and receives no campaigns — a
// paying customer would silently get nothing, which is the worst failure this
// Worker can produce. Payment IS the confirmation.
//
// `resubscribe` is MailerLite's documented parameter for "resubscribe previously
// unsubscribed subscribers", and a fresh payment is fresh consent. But their
// docs also state that unsubscribed / bounced / junk subscribers "cannot be
// reactivated due to abuse prevention measures" and must come back via the app,
// a form or a landing page. Those two statements contradict each other, so the
// flag is sent AND the outcome is verified below. Never trust it to have worked.
const grant = async (env: Env, email: string): Promise<void> => {
  const res = await mailerlite(env, '/subscribers', {
    method: 'POST',
    body: JSON.stringify({
      email,
      groups: [env.MAILERLITE_GROUP_ID],
      status: 'active',
      resubscribe: true,
    }),
  })

  if (!res.ok) {
    throw new Error(`MailerLite grant failed: ${res.status} ${await res.text()}`)
  }

  // The dangerous case is not an error response — it is a 200 carrying the OLD
  // status. MailerLite accepts the write, silently declines to reactivate, and
  // returns the subscriber still `unsubscribed`. Without this check the log says
  // "Granted", Stripe is told 200, and a paying customer receives nothing
  // forever. Read the echoed subscriber instead of assuming; costs no extra call.
  const body = (await res.json()) as {
    data?: { status?: string; groups?: unknown[] }
  }

  const status = body.data?.status
  if (status && status !== 'active') {
    throw new Error(
      `MailerLite left ${email} at status "${status}" instead of active. Their API ` +
        'refuses to reactivate unsubscribed/bounced/junk subscribers (abuse prevention), ' +
        'so this cannot be fixed by retrying. The customer IS PAYING AND RECEIVING ' +
        'NOTHING: reactivate them by hand in the MailerLite app, or have them ' +
        're-subscribe through a MailerLite form or landing page.',
    )
  }

  // Advisory only. The response shape for a populated `groups` is not pinned down
  // in MailerLite's docs (their example shows an empty array even on success), so
  // throwing here risks failing every legitimate checkout on a shape guess.
  // Warn — do not turn an unverified assumption into a retry storm.
  const groups = body.data?.groups
  if (Array.isArray(groups) && groups.length > 0) {
    const ids = groups.map((g) =>
      String(g !== null && typeof g === 'object' ? (g as { id?: unknown }).id : g),
    )
    if (!ids.includes(String(env.MAILERLITE_GROUP_ID))) {
      console.warn(
        `${email} is active but group ${env.MAILERLITE_GROUP_ID} is not in [${ids.join(', ')}]`,
      )
    }
  }
}

// Removes the group, not the subscriber: they keep their record (and their
// unsubscribe history) and simply stop receiving the paid newsletter.
const revoke = async (env: Env, email: string): Promise<void> => {
  const lookup = await mailerlite(env, `/subscribers/${encodeURIComponent(email)}`)

  // Never subscribed, or already gone. Both are the state we want.
  if (lookup.status === 404) return
  if (!lookup.ok) {
    throw new Error(`MailerLite lookup failed: ${lookup.status} ${await lookup.text()}`)
  }

  const { data } = (await lookup.json()) as { data: { id: string } }

  const res = await mailerlite(env, `/subscribers/${data.id}/groups/${env.MAILERLITE_GROUP_ID}`, {
    method: 'DELETE',
  })

  // 404 = not in the group to begin with, i.e. a redelivered event.
  if (!res.ok && res.status !== 404) {
    throw new Error(`MailerLite revoke failed: ${res.status} ${await res.text()}`)
  }
}

// Everything Stripe renders for this customer — the no-code customer portal,
// receipts, invoices, dunning mail — falls back to their browser locale unless
// preferred_locales says otherwise. The audience is Italian, but plenty of them
// run an English-configured browser, and an Italian checkout followed by an
// English "your payment failed" email is the kind of seam that makes a small
// operation look unreliable.
//
// The `locale` param that would do this directly only exists on API-created
// portal sessions; the no-code portal login link the site uses cannot take one.
// Setting it on the customer is the lever that reaches that link.
//
// Best-effort on purpose: a language preference is cosmetic. Throwing here would
// return 500, make Stripe retry, and put the entitlement grant at risk for the
// sake of a locale — so failures are logged and swallowed.
const PORTAL_LOCALE = 'it'

const preferItalian = async (
  stripe: Stripe,
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
): Promise<void> => {
  if (!customer) return
  const id = typeof customer === 'string' ? customer : customer.id

  try {
    await stripe.customers.update(id, { preferred_locales: [PORTAL_LOCALE] })
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    console.warn(`Could not set preferred_locales on ${id}: ${reason}`)
  }
}

// A subscription event carries a customer id, not an email, so this costs one
// Stripe API call — which is why STRIPE_SECRET_KEY is needed even though the
// signature is verified with STRIPE_WEBHOOK_SECRET.
const customerEmail = async (
  stripe: Stripe,
  customer: string | Stripe.Customer | Stripe.DeletedCustomer,
): Promise<string | null> => {
  const id = typeof customer === 'string' ? customer : customer.id
  const record = await stripe.customers.retrieve(id)

  return record.deleted ? null : record.email
}

// ---------------------------------------------------------------------------
// MailerLite unsubscribe -> cancel the Stripe subscription (§8i, step 20)
//
// Clicking {$unsubscribe} stops the email but not the charge. Left alone that is
// someone paying €5.90/month for nothing until they notice — then a chargeback,
// which costs a fee on top of the refund and damages account standing.
//
// Cancellation is IMMEDIATE, and that is a design choice, not a shortcut.
// Cancelling at period end would leave the subscription `active` and fire
// customer.subscription.updated, which this Worker treats as entitled — so it
// would try to re-add the very person who just unsubscribed, MailerLite would
// refuse (abuse prevention), grant's verification would throw, and a retry storm
// would follow from our own cancellation. Immediate cancellation fires
// customer.subscription.deleted instead, which routes to revoke and is already
// correct. The customer loses the tail of a paid period; at this price that is
// the better trade and the honest reading of "I want out".
// ---------------------------------------------------------------------------

// Anything not in here is already over and cannot bill again.
const TERMINAL = new Set<Stripe.Subscription.Status>(['canceled', 'incomplete_expired'])

const timingSafeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

// MailerLite's docs disagree with themselves across API versions: the current
// one describes a `Signature` header holding a hex HMAC-SHA256 of the raw body
// keyed by the webhook's secret, while the classic one describes
// `X-MailerLite-Signature` holding the same digest base64-encoded. Both headers
// and both encodings are accepted — this is not a weakening, since every variant
// still requires knowing the secret, and guessing wrong would either reject
// every real call or (far worse) invite us to skip verification altogether.
export const mailerliteSignatureValid = async (
  secret: string,
  payload: string,
  provided: string,
): Promise<boolean> => {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(payload)))

  const hex = [...mac].map((b) => b.toString(16).padStart(2, '0')).join('')
  const base64 = btoa(String.fromCharCode(...mac))

  return timingSafeEqual(provided, hex) || timingSafeEqual(provided, base64)
}

// The docs place the address only as "the email property within the main
// object", without pinning the nesting, so the likely wrappers are searched
// rather than assumed.
const findEmail = (node: unknown, depth = 0): string | null => {
  if (depth > 3 || node === null || typeof node !== 'object') return null
  const record = node as Record<string, unknown>

  if (typeof record.email === 'string' && record.email.includes('@')) return record.email

  for (const key of ['subscriber', 'data', 'object']) {
    const nested = findEmail(record[key], depth + 1)
    if (nested) return nested
  }
  return null
}

// Individual delivery is the default, but a webhook can be marked "batchable",
// which wraps several events in an `events` array. Both are handled.
export const unsubscribedEmails = (body: unknown): string[] => {
  if (body === null || typeof body !== 'object') return []
  const root = body as Record<string, unknown>
  const items = Array.isArray(root.events) ? root.events : [root]

  const emails: string[] = []
  for (const item of items) {
    if (item === null || typeof item !== 'object') continue
    const record = item as Record<string, unknown>
    const type = typeof record.event === 'string' ? record.event : record.type

    if (type !== 'subscriber.unsubscribed') continue
    const email = findEmail(record)
    if (email) emails.push(email)
  }
  return emails
}

// `list` and `cancel` are two round trips with a gap between them, and a
// subscription can reach a terminal state inside that gap: a concurrent
// canceller, a redelivery of the same unsubscribe, a batched payload naming the
// address twice, or the customer clicking unsubscribe in two tabs. Stripe
// reports a cancel against an already-cancelled subscription as `resource_missing`
// — "No such subscription: sub_…" — even though the object is still retrievable.
//
// Observed for real on 2026-08-05: while `bandincc-stripe` still carried test
// keys, both MailerLite webhooks reached the same test account and raced. The
// cancellation succeeded, and the loser still returned 500.
//
// Within this function the id came from a `list` on this same account moments
// earlier, so `resource_missing` cannot mean "wrong id" or "wrong mode" — it can
// only mean the subscription is already in the state we wanted. Anything else
// still throws: `/mailerlite` answering 200 to a genuine failure would drop a
// cancellation permanently and leave someone paying for a newsletter they have
// unsubscribed from.
const alreadyCancelled = (err: unknown): boolean => {
  const stripeError = err as { code?: string; statusCode?: number } | null | undefined
  return stripeError?.code === 'resource_missing' || stripeError?.statusCode === 404
}

const cancelSubscriptionsFor = async (stripe: Stripe, email: string): Promise<number> => {
  // One email can map to several Stripe customers (a repeat buyer who checked
  // out twice), so every match is swept, not just the first.
  const customers = await stripe.customers.list({ email, limit: 100 })
  let cancelled = 0

  for (const customer of customers.data) {
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'all',
      limit: 100,
    })

    for (const subscription of subscriptions.data) {
      if (TERMINAL.has(subscription.status)) continue

      try {
        await stripe.subscriptions.cancel(subscription.id)
      } catch (err) {
        if (!alreadyCancelled(err)) throw err
        // Someone else got there first. The desired state holds, so this is a
        // no-op, not a failure — and it is deliberately not counted, since
        // `cancelled` reports what THIS call changed.
        console.log(`${subscription.id} for ${email} was already cancelled elsewhere`)
        continue
      }

      cancelled += 1
      console.log(`Cancelled ${subscription.id} for ${email} (was ${subscription.status})`)
    }
  }
  return cancelled
}

const handleMailerLite = async (
  request: Request,
  stripe: Stripe,
  env: Env,
): Promise<Response> => {
  const secret = env.MAILERLITE_WEBHOOK_SECRET
  if (!secret) {
    console.error('MAILERLITE_WEBHOOK_SECRET is not set — refusing to process unsubscribes')
    return new Response('Worker misconfigured: missing MAILERLITE_WEBHOOK_SECRET', { status: 500 })
  }

  const provided =
    request.headers.get('Signature') ?? request.headers.get('X-MailerLite-Signature')
  if (!provided) {
    return new Response('Missing Signature header', { status: 400 })
  }

  // Raw body: the HMAC covers the exact bytes sent.
  const payload = await request.text()

  if (!(await mailerliteSignatureValid(secret, payload, provided))) {
    // Unverified callers must never reach the cancellation path — otherwise
    // anyone who finds this URL can cancel arbitrary subscriptions.
    console.error('Rejected MailerLite webhook: signature mismatch')
    return new Response('Signature verification failed', { status: 401 })
  }

  let body: unknown
  try {
    body = JSON.parse(payload)
  } catch {
    return new Response('Malformed JSON', { status: 400 })
  }

  const emails = unsubscribedEmails(body)

  if (emails.length === 0) {
    // Deliberately 200. MailerLite disables a webhook after 3 days of non-2xx
    // replies, so "not an event we act on" must not look like a failure.
    // A shape mismatch would land here too, hence logging the keys we did see.
    const shape = body !== null && typeof body === 'object' ? Object.keys(body).join(', ') : typeof body
    console.log(`No unsubscribe emails in payload (top-level keys: ${shape})`)
    return new Response('ok', { status: 200 })
  }

  let cancelled = 0
  for (const email of emails) cancelled += await cancelSubscriptionsFor(stripe, email)

  // Most unsubscribers never paid, so zero cancellations is the normal case.
  console.log(`Unsubscribe processed for ${emails.join(', ')} — ${cancelled} subscription(s) cancelled`)
  return new Response('ok', { status: 200 })
}

const handle = async (event: Stripe.Event, stripe: Stripe, env: Env): Promise<void> => {
  switch (event.type) {
    // The moment of purchase. The email is on the session itself, so no customer
    // lookup is needed on the hot path.
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session

      // A one-off payment is not an entitlement. Logged rather than dropped in
      // silence: a Payment Link built off a non-recurring price lands here, and
      // the symptom is a green 200 with nothing happening in MailerLite.
      if (session.mode !== 'subscription') {
        console.log(`Ignoring checkout ${session.id}: mode=${session.mode}, expected subscription`)
        return
      }

      const email = session.customer_details?.email ?? session.customer_email
      if (!email) throw new Error(`checkout.session.completed ${session.id} carried no email`)

      await grant(env, email)

      // After the grant, never before: the entitlement is the job, this is
      // decoration. Idempotent, so Stripe's redelivery just sets it again.
      await preferItalian(stripe, session.customer)

      console.log(`Granted ${email} (checkout ${session.id})`)
      return
    }

    // Renewals, failed payments, recoveries, plan switches, and cancellations
    // scheduled for period end all arrive here.
    //
    // A portal cancellation sets cancel_at_period_end and leaves status
    // `active` — so this correctly does NOT revoke: they paid through the end of
    // the period and keep the newsletter until customer.subscription.deleted
    // fires at the boundary. Looks like a missing case; it is the intended one.
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const email = await customerEmail(stripe, subscription.customer)
      if (!email) {
        console.log(`Ignoring ${subscription.id}: customer has no email (deleted?)`)
        return
      }

      if (ENTITLED.has(subscription.status)) {
        await grant(env, email)
        console.log(`Granted ${email} (${subscription.id} is ${subscription.status})`)
      } else {
        await revoke(env, email)
        console.log(`Revoked ${email} (${subscription.id} is ${subscription.status})`)
      }
      return
    }

    // The subscription is genuinely over: cancelled and past its final period,
    // or killed by Smart Retries giving up on a dead card.
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const email = await customerEmail(stripe, subscription.customer)
      if (!email) {
        console.log(`Ignoring ${subscription.id}: customer has no email (deleted?)`)
        return
      }

      await revoke(env, email)
      console.log(`Revoked ${email} (${subscription.id} deleted)`)
      return
    }

    // Reachable only if the Stripe endpoint is subscribed to more than the three
    // events this Worker handles.
    default:
      console.log(`Ignoring unhandled event type ${event.type}`)
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 })
    }

    // Checked before anything uses them. Without this the first symptom is
    // `new Stripe()` throwing "Neither apiKey nor config.authenticator
    // provided" — which says nothing about the actual cause (a secret that was
    // never uploaded) and is easy to misread as a code fault. 500 rather than
    // 400 so Stripe keeps retrying and the events land once it is fixed.
    const missing = REQUIRED.filter((name) => !env[name])
    if (missing.length) {
      console.error(
        `Missing binding(s): ${missing.join(', ')}. ` +
          'Secrets go up with `wrangler secret put <NAME>`; ' +
          'MAILERLITE_GROUP_ID is a plain var in wrangler.toml.',
      )
      return new Response(`Worker misconfigured: missing ${missing.join(', ')}`, { status: 500 })
    }

    const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      // Workers have no Node http stack; the SDK must go through fetch.
      httpClient: Stripe.createFetchHttpClient(),
    })

    // Routed before the Stripe path so the root URL keeps its meaning and the
    // registered Stripe endpoint needs no change.
    if (new URL(request.url).pathname === MAILERLITE_PATH) {
      return handleMailerLite(request, stripe, env)
    }

    const signature = request.headers.get('stripe-signature')
    if (!signature) {
      return new Response('Missing stripe-signature header', { status: 400 })
    }

    // The RAW body, never JSON.parse'd first: the signature covers the exact
    // bytes Stripe sent, and re-serializing changes them.
    const payload = await request.text()

    let event: Stripe.Event
    try {
      event = await stripe.webhooks.constructEventAsync(
        payload,
        signature,
        env.STRIPE_WEBHOOK_SECRET,
        undefined,
        // constructEvent (sync) needs Node crypto and throws on Workers. The
        // async form + SubtleCrypto is the only combination that works here.
        Stripe.createSubtleCryptoProvider(),
      )
    } catch (err) {
      // Verification is not optional: without it anyone who finds this URL can
      // POST themselves a paid subscription (§8i).
      const reason = err instanceof Error ? err.message : String(err)
      console.error(`Rejected unverified webhook: ${reason}`)
      return new Response(`Signature verification failed: ${reason}`, { status: 400 })
    }

    try {
      await handle(event, stripe, env)
    } catch (err) {
      // 5xx so Stripe retries. Returning 200 here would drop the entitlement
      // change permanently — a paying customer who never joins the group, or a
      // cancelled one who keeps receiving. Retries are safe: grant upserts and
      // revoke tolerates an already-removed subscriber.
      const reason = err instanceof Error ? err.message : String(err)
      console.error(`${event.type} (${event.id}) failed: ${reason}`)
      return new Response(`Handler failed: ${reason}`, { status: 500 })
    }

    return new Response('ok', { status: 200 })
  },
} satisfies ExportedHandler<Env>
