// Stripe -> MailerLite entitlement webhook (UNIFICATION_BRAINSTORM.md §8i).
//
// MailerLite group membership IS the subscription. This Worker's only job is to
// put payers into the group and take them out again; the send pipeline
// (.github/workflows/newsletter.yml) knows nothing about Stripe and needs no
// edit. Everything downstream keys off group membership alone.
//
// Not handled here yet: the MailerLite `subscriber.unsubscribed` webhook that
// cancels the Stripe subscription (§8i, step 20). Clicking {$unsubscribe} today
// stops the email but NOT the charge, which is how you get a chargeback. That
// endpoint lands on this same Worker in a second pass.

import Stripe from 'stripe'

export interface Env {
  STRIPE_SECRET_KEY: string
  STRIPE_WEBHOOK_SECRET: string
  MAILERLITE_API_KEY: string
  MAILERLITE_GROUP_ID: string
}

const MAILERLITE = 'https://connect.mailerlite.com/api'

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
const grant = async (env: Env, email: string): Promise<void> => {
  const res = await mailerlite(env, '/subscribers', {
    method: 'POST',
    body: JSON.stringify({
      email,
      groups: [env.MAILERLITE_GROUP_ID],
      status: 'active',
    }),
  })

  if (!res.ok) {
    throw new Error(`MailerLite grant failed: ${res.status} ${await res.text()}`)
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

    const signature = request.headers.get('stripe-signature')
    if (!signature) {
      return new Response('Missing stripe-signature header', { status: 400 })
    }

    const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      // Workers have no Node http stack; the SDK must go through fetch.
      httpClient: Stripe.createFetchHttpClient(),
    })

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
