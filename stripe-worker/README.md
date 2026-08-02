# stripe-worker

Cloudflare Worker that turns a Stripe subscription into MailerLite group
membership, and back. Covers steps 15–19 of the payments plan
(`bandincc-crawler/UNIFICATION_BRAINSTORM.md` §8i).

MailerLite group membership **is** the subscription. This Worker only adds and
removes people; the newsletter send pipeline
(`.github/workflows/newsletter.yml`) knows nothing about Stripe.

It lives in this repo but is **not** part of the site build — its own
`package.json`, its own `node_modules`, and nothing under `app/`, so
`output: 'export'` never sees it. Deploys are manual and independent of the site.

## Why a separate host at all

GitHub Pages is static and the Netlify site is staging-only, so there is nowhere
in the existing deploy to put a live endpoint. A Worker is free at this volume
(100k requests/day), has nothing to patch, and keeps a production payment path
off the staging deploy.

**DNS stays at IONOS.** The `*.workers.dev` hostname is a perfectly good webhook
endpoint, and `bandincc.it`'s zone carries the MailerLite DKIM/SPF records plus
the DMARC policy. Moving the zone to Cloudflare for a prettier URL would put
newsletter deliverability at risk for no functional gain.

## First-time setup

```sh
cd stripe-worker

# Writes current versions into package.json — that is why they are not pinned here.
npm install stripe
npm install -D wrangler typescript @cloudflare/workers-types

npx wrangler login          # interactive browser OAuth, one time
```

Then set `MAILERLITE_GROUP_ID` in `wrangler.toml` (same value as the
`MAILERLITE_GROUP_ID` GitHub secret — it identifies the list, it does not grant
access to it, so it is not a secret).

## Secrets — two places, both required

Wrangler does **not** read `.env`, and `.dev.vars` is **not** uploaded. These are
two separate mechanisms and you need both:

| Where | What reads it | How |
|---|---|---|
| `.dev.vars` | `wrangler dev` only, locally | `cp .dev.vars.example .dev.vars` and fill in |
| Cloudflare | the **deployed** Worker | `npx wrangler secret put NAME` |

```sh
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
npx wrangler secret put MAILERLITE_API_KEY
```

Skipping the `secret put` step leaves the live Worker with `undefined` for all
three: every request fails signature verification and no one is ever added to
the group.

`STRIPE_SECRET_KEY` is needed even though the signature is checked with
`STRIPE_WEBHOOK_SECRET` — subscription events carry a customer *id*, not an
email, so resolving the address costs one Stripe API call.

## Local testing

Use the Stripe CLI; it verifies the real signature path rather than stubbing it.

```sh
stripe login
stripe listen --forward-to http://localhost:8787   # prints the whsec_… for .dev.vars
npm run dev                                        # in another terminal

stripe trigger checkout.session.completed
stripe trigger customer.subscription.deleted
```

Check the MailerLite group after each one. Confirming the Stripe event log shows
`200` is not the same as confirming the subscriber landed in the group — and the
group is what the newsletter actually sends to.

**Use a throwaway MailerLite group while testing.** A test subscriber left in the
real group receives real campaigns the next time `data.json` changes and deploys.
The send is fully automatic with no human gate.

## Deploy

```sh
npm run deploy
npm run tail      # live logs
```

Then in the Stripe dashboard add the endpoint (`https://bandincc-stripe.<subdomain>.workers.dev`)
subscribed to **exactly** these three events:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Stripe prints the signing secret when the endpoint is created — that is the
`STRIPE_WEBHOOK_SECRET` for the deployed Worker, and it is **different** from the
one `stripe listen` printed for local use.

Test mode and live mode are separate: endpoints, keys and signing secrets do not
copy across. You will do this twice.

## Behaviour

| Stripe event | Action |
|---|---|
| `checkout.session.completed` (mode `subscription`) | add to group, `status: 'active'` |
| `customer.subscription.updated` → `active`/`trialing` | add to group |
| `customer.subscription.updated` → anything else | remove from group |
| `customer.subscription.deleted` | remove from group |

Responses: `400` on a bad or missing signature, `500` when MailerLite fails (so
Stripe retries), `200` otherwise — including for event types it ignores.

### Things that look like bugs but are not

- **A portal cancellation does not revoke immediately.** Stripe sets
  `cancel_at_period_end` and leaves the status `active`; the customer paid
  through the end of the period and keeps the newsletter until
  `customer.subscription.deleted` fires at the boundary.
- **Redelivery is unguarded.** MailerLite's subscriber POST is an upsert and the
  group DELETE tolerates a 404, so Stripe's at-least-once delivery needs no
  idempotency key.
- **`past_due` revokes right away**, per §8i, rather than waiting out Smart
  Retries. A recovery re-adds them; the upsert makes that free.
- **`trialing` is entitled** even though §8i configures no free trial. It is
  listed so enabling one later does not silently lock out every trialist.

## Not done yet

The MailerLite `subscriber.unsubscribed` → cancel-the-Stripe-subscription flow
(§8i, step 20). Today, clicking `{$unsubscribe}` stops the email but **not** the
charge, which is how you get an angry customer and then a chargeback. It belongs
on this same Worker, and its inbound call needs authenticating too — otherwise
anyone can cancel arbitrary subscriptions.
