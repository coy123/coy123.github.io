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
npx wrangler secret put MAILERLITE_WEBHOOK_SECRET   # for the /mailerlite route
```

The MailerLite API key is ~1,000 characters and gets silently truncated by
terminal paste into the hidden prompt. Pipe it instead:

```sh
set -a; . ./.dev.vars; set +a
printf '%s' "$MAILERLITE_API_KEY" | npx wrangler secret put MAILERLITE_API_KEY
```

A truncated key looks identical to a good one until MailerLite answers
`401 Unauthenticated` — `secret list` shows names, never values.

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

### Two Workers, one per Stripe mode

Because a signing secret is per mode and one Worker can hold only one
`STRIPE_WEBHOOK_SECRET`, test and live get their own deployment:

| | Worker | Stripe | MailerLite group | Built by |
|---|---|---|---|---|
| Production | `bandincc-stripe` | live | the real subscriber group | `deploy.yml` → GitHub Pages |
| Staging | `bandincc-stripe-test` | test | a throwaway group | `netlify-deploy.yml` → Netlify |

```sh
npm run deploy:test   # wrangler deploy --env test
npm run tail:test
```

Secrets and vars are **per environment** and nothing is inherited from the top
level, so all four secrets go up again with `--env test`:

```sh
printf '%s' "$MAILERLITE_API_KEY" | npx wrangler secret put MAILERLITE_API_KEY --env test
```

(The pipe is not optional for that one — see "Known limitation".) The MailerLite
API key is the *same* key in both environments, since MailerLite has no test
mode; only `MAILERLITE_GROUP_ID` in `wrangler.toml` differs, and that is what
keeps a staging checkout out of the real list.

Which mode the *site* links to is a build-time switch, `STRIPE_MODE`, resolved
in `lib/subscription.ts` and set per workflow. The staging build ships the
`hrefTest` URLs from `locales/it.json`; production ships `href`.

## Behaviour

Two routes, opposite directions:

### `POST /` — Stripe → MailerLite (entitlement)

| Stripe event | Action |
|---|---|
| `checkout.session.completed` (mode `subscription`) | add to group, `status: 'active'`, **send the welcome email**, set `preferred_locales: ['it']` |
| `customer.subscription.updated` → `active`/`trialing` | add to group |
| `customer.subscription.updated` → anything else | remove from group |
| `customer.subscription.deleted` | remove from group |

Responses: `400` on a bad or missing signature, `500` when MailerLite fails (so
Stripe retries), `200` otherwise — including for event types it ignores.

### `POST /mailerlite` — MailerLite → Stripe (unsubscribe)

On `subscriber.unsubscribed`, finds every Stripe customer with that email and
**cancels their subscriptions immediately**.

Immediate is deliberate. Cancelling at period end leaves the subscription
`active` and fires `customer.subscription.updated`, which the entitlement route
treats as entitled — so it would try to re-add the person who just
unsubscribed, MailerLite would refuse, and `grant`'s verification would throw. A
retry storm caused by our own cancellation. Immediate cancellation fires
`customer.subscription.deleted`, which routes to `revoke` and is already correct.

Verification: HMAC-SHA256 of the raw body. Both the `Signature` (current API,
hex) and `X-MailerLite-Signature` (classic API, base64) headers are accepted,
because MailerLite's docs describe both and getting it wrong means rejecting
every real call. Every variant still requires the secret.

**Failure strategy here is the opposite of the Stripe route.** MailerLite marks
a webhook inactive after 3 days of non-2xx replies, so an unrecognised payload
or an unsubscriber who never paid returns `200` (with a log line) rather than an
error. Only a missing secret, bad signature, malformed JSON, or a genuine Stripe
failure returns non-2xx.

### Things that look like bugs but are not

- **A portal cancellation does not revoke immediately.** Stripe sets
  `cancel_at_period_end` and leaves the status `active`; the customer paid
  through the end of the period and keeps the newsletter until
  `customer.subscription.deleted` fires at the boundary.
- **Redelivery is unguarded.** MailerLite's subscriber POST is an upsert and the
  group DELETE tolerates a 404, so Stripe's at-least-once delivery needs no
  idempotency key.
- **`grant` verifies the echoed subscriber rather than trusting the 200.**
  MailerLite refuses to reactivate unsubscribed/bounced/junk contacts (abuse
  prevention) but reports that refusal as a success carrying the *old* status.
  A non-`active` result therefore throws, on purpose, even though retrying
  cannot fix it — a loudly failing webhook is the only alarm available, and it
  beats a paying customer silently receiving nothing. The remedy is manual:
  reactivate in the MailerLite app, or have them re-subscribe through a
  MailerLite form or landing page.
- **`past_due` revokes right away**, per §8i, rather than waiting out Smart
  Retries. A recovery re-adds them; the upsert makes that free.
- **`trialing` is entitled** even though §8i configures no free trial. It is
  listed so enabling one later does not silently lock out every trialist.

## Registering the MailerLite webhook

In MailerLite → Integrations → Webhooks, create one for **`subscriber.unsubscribed`**
pointing at `https://bandincc-stripe.<subdomain>.workers.dev/mailerlite`.

MailerLite generates a **secret** for that webhook — that is
`MAILERLITE_WEBHOOK_SECRET`, and it is unrelated to the API key.

Until the secret is set the route answers `500` and refuses to process
anything, while the Stripe route keeps working: `MAILERLITE_WEBHOOK_SECRET` is
deliberately excluded from the startup binding check so a deploy that predates it
cannot take the entitlement path down.

## The welcome email

`src/welcome.ts`, sent once on `checkout.session.completed`.

Without it a new subscriber got **nothing** from us — Stripe's receipt and then
silence, since the daily campaign only mails bandi detected *that day* and the
site hides everything from the last seven days (`lib/embargo.ts`). They had paid
for a head start they could not see. This email thanks them and hands over
exactly the currently-embargoed set.

**Where the data comes from.** The Worker fetches `data/data.json` from
`raw.githubusercontent.com`, which works because the website repo is public —
an accepted trade-off, not an oversight. **If that repo is ever made private
this fetch 404s and the email silently loses its table**, because a failure in
here is caught and swallowed by design. The replacement is a read-only PAT, or
better a KV namespace that `deploy.yml` writes the embargoed set into. The
comment above `DATA_URL` says the same thing where someone will actually see it.

**What it shares with the daily campaign.** Everything visual:
`newsletter/email_template.html` (the shell), `newsletter/email_table.html` (the
table, a separate file so an email with no bandi can drop it entirely) and
`newsletter/render.mjs` (rows, slugs, dates, copy). The templates are bundled
into the Worker as text modules — see the `[[rules]]` block in `wrangler.toml`
and `src/html.d.ts`. The seven-day rule itself is imported straight from
`lib/embargo.ts`, so the site, the Cypress suite and this email can never
disagree about what "hidden" means.

**Sent twice?** No: `welcome_sent_at` in the Stripe customer's metadata is
checked first and written after a successful send. Stripe redelivers
`checkout.session.completed` freely, and any 500 later in the handler replays
it, so the guard matters. It is written *after* the send on purpose — a failure
between the two duplicates an email, which is the harmless direction.

**It can never fail a webhook.** Every path in `sendWelcomeEmail` is caught and
logged; the handler still answers 200. A 500 would make Stripe retry the whole
event, re-granting and re-sending. So a mail problem is visible only in
`wrangler tail` — grep for `Welcome email`.

**The footer carries `{$unsubscribe}`**, like the daily campaign, because this
email *is* a MailerLite campaign — MailerLite substitutes the token as it sends,
and injects an unsubscribe link of its own if one is missing. Clicking it
reaches this Worker's `/mailerlite` route and cancels the Stripe subscription;
the customer-portal link beside it is the gentler door to the same room.

### How a one-off send works without a transactional provider

MailerLite's API sends **campaigns**, to groups or segments — there is no
transactional endpoint. (Their transactional product is MailerSend: a separate
account, separate domain verification, three more DNS records at IONOS and a
third processor in the privacy policy.) So `newsletter/mailerlite.mjs` builds a
one-off out of what the campaign API does have:

1. create a throwaway group `welcome-<timestamp>-<random>`
2. add the one subscriber to it
3. create a campaign targeting that group, schedule it `instant`
4. leave the group; the **next** send deletes the stale ones

Two details are load-bearing. The group is **per send, never reused**: a
campaign resolves its recipients when the send starts, so a shared "outbox"
group would mail the first subscriber's email to whoever arrived in the window.
And the cleanup happens on the **next** run rather than straight after
scheduling, because deleting a group out from under a send that is still
resolving it is a race with no callback to wait for.

Costs, which are real but small: delivery is campaign-speed (minutes, not
seconds) and the dashboard collects one `Benvenuto — …` campaign per
subscriber. Benefits: no second provider, no new DNS, no new secret, and the
sender is the address MailerLite has already verified.

There is **nothing to set up**. `MAILERLITE_API_KEY` is already required for the
entitlement grant, so the welcome email works as soon as the Worker is deployed.

### Previewing and backfilling

`scripts/preview-welcome.mjs` (repo root) renders the exact same email locally,
no checkout and no deploy involved:

```sh
node scripts/preview-welcome.mjs --out /tmp/welcome.html   # from local data.json
node scripts/preview-welcome.mjs --remote                  # from master, i.e. what a real send builds
node scripts/preview-welcome.mjs --empty                   # the no-bandi variant
MAILERLITE_API_KEY=… node scripts/preview-welcome.mjs --send someone@example.com
```

`--remote` reads the same URL the Worker does, so it answers "what will a
checkout produce right now?" whatever branch is checked out.

`--send` goes through the same throwaway-group campaign the Worker uses, so the
recipient must already be a MailerLite subscriber — for a backfill they are.

`--send` is the backfill tool for subscribers who paid before this existed. It
reads the **local** `data/data.json`, so pull first, and it sets no
`welcome_sent_at` — mark the customer by hand in Stripe if you want to be sure
the Worker never mails them too.

## Known limitation

**A previously-unsubscribed address cannot be re-granted by API.** MailerLite
refuses to reactivate unsubscribed/bounced/junk contacts (abuse prevention) and
reports the refusal as a success carrying the old status — so `grant` verifies
the echoed subscriber and throws rather than logging a false `Granted`. The
remedy is manual (reactivate in the MailerLite app) or a MailerLite form/landing
page, which is an approved reactivation route. Accepted as a known limitation
while the subscriber base is zero; see `STATUS.md`.
