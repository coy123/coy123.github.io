# Payments — status and TODOs (last updated 2026-08-04)

Working notes for the Stripe leg (`bandincc-crawler/UNIFICATION_BRAINSTORM.md`
§8i). Setup mechanics live in `README.md`; this file is "what's done, what's
next, and what not to re-litigate". Delete it once payments are live.

---

## ⚠️ Read first — uncommitted work

At the close of the 2026-08-03 session these were **modified but not committed**:

- `stripe-worker/src/index.ts` — `preferred_locales`, the `grant` verification,
  and the whole step-20 route
- `stripe-worker/README.md`, `stripe-worker/STATUS.md`
- `bandincc-crawler` (a nested submodule pointer; predates this work)

Commit before doing anything else. Also note `.dev.vars` is gitignored, so the
three local test secrets exist **only on that machine** and are not recoverable
from the repo.

## ⚠️ Deployed ≠ what is in the repo

The **deployed** Worker is the version with branch logging and the startup
binding check. Three changes are written and typechecked but **NOT deployed**:

1. `preferred_locales: ['it']` on the customer at checkout
2. `grant` verifying the echoed subscriber (the reactivation fix)
3. the entire `POST /mailerlite` route (step 20)

One `npm run deploy` picks up all three. Until then the live Worker behaves as it
did on 2026-08-03.

---

## 🚨 Hard blockers — nothing goes live until these are done

1. **Non-Union OSS registration is NOT in place.** A Swiss company selling a
   digital subscription B2C into the EU owes VAT in the *customer's* country, and
   for a non-EU seller there is **no threshold** — VAT is due from the very first
   EU subscriber. Register in one member state, file quarterly; needs a Swiss/EU
   VAT accountant. **This is the long-lead item — it runs on someone else's
   turnaround, so start it before the remaining engineering, not after.** Going
   live without it means knowingly accruing unremitted VAT from sale one.
2. **Step 20 is written but not activated.** See "Resume here" — it needs a
   MailerLite webhook, a secret, and a deploy.

### Accepted risk, not a blocker (decided 2026-08-03)

**Returning unsubscribers cannot be reactivated by API.** Shipping without the
`/grazie/` re-subscribe form: the subscriber base is zero, so there is nobody to
strand, and the failure is now loud rather than silent. Revisit when someone
actually complains — the fix is under "Deferred" below.

---

## → Resume here

Step 5 (the webhook, items 15–20) is **code-complete**. What remains is
activation.

**1. Deploy the three pending changes**

```sh
cd stripe-worker
npm run deploy
```

**2. Activate step 20**

- MailerLite → Integrations → Webhooks → new webhook for
  **`subscriber.unsubscribed`** → `https://bandincc-stripe.bandincc.workers.dev/mailerlite`
- `npx wrangler secret put MAILERLITE_WEBHOOK_SECRET` — the secret **MailerLite
  generates for that webhook**, which is *not* the API key
- Redeploy is not needed after `secret put`; it republishes the Worker itself

**3. Re-run the deployed-Worker tests** (all passed on 2026-08-03 except the new
paths):

| Test | How | Expect |
|---|---|---|
| Grant | Real checkout via Payment Link, **fresh address** | `Granted …` in `npm run tail`, address in the MailerLite group |
| `preferred_locales` *(new)* | `stripe customers retrieve cus_… \| grep preferred_locales` | `["it"]` |
| Revoke | Stripe dashboard → cancel subscription **immediately** | `Revoked …`, address leaves the group |
| Unsubscribe → cancel *(new)* | Click `{$unsubscribe}` in a campaign as a test subscriber | Stripe subscription cancels |
| Signature rejection | See the curl block below | `400` both times |

```sh
URL=https://bandincc-stripe.bandincc.workers.dev
PAYLOAD='{"id":"evt_test","object":"event","type":"checkout.session.completed","data":{"object":{}}}'

echo -n "no signature      (want 400): "
curl -s -o /dev/null -w '%{http_code}\n' -X POST "$URL" -d "$PAYLOAD"

echo -n "wrong signing key (want 400): "
T=$(date +%s)
SIG=$(printf '%s' "$T.$PAYLOAD" | openssl dgst -sha256 -hmac "whsec_not_the_real_one" -hex | sed 's/.* //')
curl -s -o /dev/null -w '%{http_code}\n' -X POST "$URL" \
  -H "stripe-signature: t=$T,v1=$SIG" -d "$PAYLOAD"
```

**4. Then step 6 (site) and step 7 (live cutover)** below.

---

## Done

**Stripe setup (steps 1–4)** — account, one product with two recurring prices
(€5.90/mo, €59/yr, EUR, **tax-inclusive**), tax decision, two Payment Links.

**The Worker (step 5, items 15–20)** — `bandincc-stripe.bandincc.workers.dev`,
endpoint registered in test mode, all secrets set, grant + revoke + signature
rejection verified end to end against the deployed Worker on 2026-08-03. Covers:

- Stripe signature verification (`constructEventAsync` + SubtleCrypto — the sync
  form needs Node crypto and fails on Workers)
- the three-event entitlement switch, `status:'active'` explicit
- an upfront binding check naming any missing secret
- `preferred_locales: ['it']` so the customer portal and Stripe's own emails are
  Italian *(written, not deployed)*
- `grant` verifying the echoed subscriber instead of trusting the 200
  *(written, not deployed)*
- `POST /mailerlite` — unsubscribe cancels the Stripe subscription immediately
  *(written, not deployed)*

**Infrastructure** — `stripe-worker` is in the root `tsconfig.json` exclude list.
Without it `next build` pulls the Worker into the site's TS program, fails on the
missing `stripe` module, and blocks the site deploy.

**Unrelated, finished and live:** the newsletter now chains off a successful
deploy via `workflow_run` rather than the push, and diffs against the last commit
actually mailed (moving `newsletter-sent` tag), so a batch missed by a failed
deploy *or* a failed send is retried automatically. See `CLAUDE.md` → CI/CD.
Nothing outstanding.

---

## Remaining

### Step 6 — site changes (Next.js)

1. **`/grazie/` page** — the Payment Link redirect target. Note the links
   currently use Stripe's default hosted confirmation page; switch each to
   **After payment → Redirect** and point at `https://www.bandincc.it/grazie/`.
2. **Pricing/subscribe section** linking both Payment Links. **Push annual:** the
   fixed ~€0.30/transaction is ~8% of €5.90 but only ~3.4% of €59, so the ~17%
   discount roughly funds itself.
   **Append `?locale=it` to both hrefs** (`&locale=it` if the URL already has
   params). Without it Stripe renders checkout in the *browser's* language, and a
   fair share of the audience runs an English-configured browser. Put it in the
   `locales/it.json` href so it cannot get dropped. Stripe localises only its own
   UI — the product name and price description render exactly as typed.
3. **"Manage subscription" link** to the Stripe customer-portal login URL.
4. All copy into `locales/it.json` under `pages.*`, like everything else.

### Step 7 — before going live

5. **Privacy policy** naming **Stripe and MailerLite as processors**, plus
   deletion-on-request. Subscriber data stays out of git.
6. **Point the crawler's `mailTo` at the colleague** — the last unticked
   non-payment item (§8f item 6).
7. **Recreate everything in live mode**: product, prices, Payment Links, portal
   config, webhook endpoint, MailerLite webhook. **None of it copies from test.**
   Swap in live keys and the live signing secret, then one real €5.90 charge on
   your own card, refunded.
8. **OSS registration** — blocker 1. Must exist *before* live payments.

### Deferred

**A `/grazie/` MailerLite subscribe form**, so a returning unsubscriber can
re-subscribe themselves right after paying. MailerLite treats a form or landing
page as an approved reactivation route, which is the only path around the API
restriction. Accepted risk for now (see above).

---

## Decisions already made — don't re-open

- **Stripe, not a Merchant-of-Record.** EU VAT self-filed via non-Union OSS; the
  MoR premium buys nothing once that admin is in-house anyway.
- **One product, two prices.** Two products would split reporting, break
  monthly↔annual switching in the portal, and force the webhook to know two ids.
- **Tax behaviour inclusive**, and **irreversible per price** — changing it means
  new prices and re-issued Payment Links.
- **No free trial** at this price point; it mostly attracts card testing.
- **Cloudflare Worker as the host.** GH Pages is static, Netlify is staging-only.
  **DNS stays at IONOS** — that zone carries the MailerLite DKIM/SPF records and
  the DMARC policy, and moving it for a prettier hostname risks newsletter
  deliverability for nothing.
- **Live MailerLite group for testing, no test group** — the only addresses
  involved are already on the list, so `grant` is a no-op upsert.
- **Entitlement = group membership.** Stripe only adds and removes; the send
  pipeline knows nothing about Stripe and needs no edit.
- **Unsubscribe cancels immediately, not at period end.** At period end the
  subscription stays `active` and fires `customer.subscription.updated`, which
  the entitlement route reads as entitled — it would try to re-add the person who
  just unsubscribed, MailerLite would refuse, and `grant`'s verification would
  throw. A retry storm caused by our own cancellation.

---

## Gotchas that will bite

- **Three different `whsec_…` values** exist: `stripe listen` (local), the test
  dashboard endpoint, the live dashboard endpoint. Mixing them up fails every
  signature check with a confusing error. A fourth, unrelated secret belongs to
  the MailerLite webhook.
- **`wrangler secret put` is separate from `wrangler deploy`.** A deployed but
  unconfigured Worker is a normal state to end up in.
- **The MailerLite API key is ~987 chars** and gets silently truncated by
  terminal paste into the hidden prompt. Pipe it:
  `printf '%s' "$MAILERLITE_API_KEY" | npx wrangler secret put MAILERLITE_API_KEY`.
  A truncated key is indistinguishable from a good one until MailerLite answers
  `401 Unauthenticated` — `secret list` shows names, never values.
- **Stop `stripe listen` before testing the deployed Worker**, or the CLI and the
  dashboard endpoint both deliver and every event is handled twice.
- **`npm run tail` drops its connection**, and a closed terminal takes it with it.
  `[observability]` is on, so the Cloudflare dashboard retains the logs — check
  there before concluding an event never arrived.
- **A `200` in Stripe's event log is not proof.** Check the MailerLite group
  directly; the group is what actually gets sent to.
- **Grant path: real checkouts only.** Never `stripe trigger
  checkout.session.completed` — its fixture invents an email that would join the
  live list and hard-bounce on the next campaign, exactly the sender-reputation
  damage §8e warns about. `stripe trigger` is fine for update/delete, where a
  fixture email just 404s on lookup.
- **The cancel test really removes you from the live newsletter.** Re-add
  yourself and the colleague or you will silently miss a real send.
- **Cancel *immediately*, not at period end, when testing revoke.** At period end
  the status stays `active` and no revoke fires — correct behaviour that looks
  exactly like a broken Worker.
- **Testing with an address that ever unsubscribed looks like a broken Worker**:
  green 200s and nothing in the group. Use a never-seen address.
- **`status:'active'` must stay explicit** and double opt-in must stay **off** on
  this group, or an API-created subscriber sits at `unconfirmed` and receives
  nothing.
- **The two webhook directions need opposite failure strategies.** Stripe retries
  a 5xx for ~3 days, so a loud failure is a useful alarm. MailerLite **disables a
  webhook after 3 days of non-2xx**, so on `/mailerlite` "nothing to do" must
  answer 200 or the integration silently switches itself off.

---

## Where things live

| What | Where |
|---|---|
| Decision record (§8a–8i) | `bandincc-crawler/UNIFICATION_BRAINSTORM.md` |
| Worker setup, secrets, deploy, behaviour | `stripe-worker/README.md` |
| Worker handler | `stripe-worker/src/index.ts` |
| Newsletter send + deploy coupling | `CLAUDE.md` → CI/CD, `.github/workflows/newsletter.yml` |
| Live Worker | `https://bandincc-stripe.bandincc.workers.dev` (`/` Stripe, `/mailerlite` unsubscribe) |
