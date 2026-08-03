# Payments — where I left off (2026-08-02)

Working notes for the Stripe leg (`bandincc-crawler/UNIFICATION_BRAINSTORM.md`
§8i). Setup mechanics live in `README.md`; this file is only "what's done, what's
next". Delete it when payments go live.

## → Resume here

Local testing of the Worker (`npm run dev` + `stripe listen`) is reported done.
**Next action: deploy.**

```sh
cd stripe-worker
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
npx wrangler secret put MAILERLITE_API_KEY
npm run deploy
```

Then register the endpoint in Stripe (test mode):
`https://bandincc-stripe.<subdomain>.workers.dev`, subscribed to **exactly**
`checkout.session.completed`, `customer.subscription.updated`,
`customer.subscription.deleted`.

Creating it mints a **new** `whsec_…` — re-run
`npx wrangler secret put STRIPE_WEBHOOK_SECRET` with that value, replacing the
one from `stripe listen`. Then `npm run tail` and smoke-test.

> If local testing didn't actually finish, redo it before deploying: `stripe
> listen --forward-to http://localhost:8787` + `npm run dev`, complete a real
> test checkout, confirm the address lands in the MailerLite group.

## Done

- **Stripe steps 1–4** — account, one product + two recurring prices
  (€5.90/mo, €59/yr, EUR, tax-inclusive), tax decision, Payment Links.
- **Cloudflare** — account created, `wrangler login` done, deps installed
  (stripe v22, wrangler v4).
- **Worker scaffolded and committed** — `src/index.ts` covers steps 15–19:
  signature verification, the three-event switch, `status:'active'` explicit,
  400 on bad signature / 500 on MailerLite failure so Stripe retries.
  Typechecks against Stripe v22; the four SDK APIs it uses were runtime-verified.
- `wrangler.toml` has the real `MAILERLITE_GROUP_ID`; `.dev.vars` filled locally
  (gitignored — **not** in git, so it's only on this machine).
- `stripe-worker` added to the root `tsconfig.json` exclude list. Without it
  `next build` pulls the Worker into the site's TS program, fails on the missing
  `stripe` module, and blocks the deploy.

**Unrelated but finished this session:** the newsletter now chains off a
successful deploy via `workflow_run` instead of the push, and diffs against the
last commit actually mailed (moving `newsletter-sent` tag) so a batch missed by a
failed deploy *or* a failed send is retried automatically. See `CLAUDE.md` →
CI/CD. Committed and live; nothing outstanding.

## Remaining

**Finish step 5 (the webhook)**

1. Deploy + register the endpoint — see "Resume here" above.
2. **BUG — a previously-unsubscribed address is never reactivated.** Found
   2026-08-03 during the first local test. MailerLite will not move a contact out
   of `unsubscribed` via a plain `POST /subscribers`, even with
   `status: 'active'` set. The API returns 2xx, the Worker logs `Granted …`, and
   the customer receives nothing — a paying subscriber silently getting no
   email, the exact failure §8i calls out. Payment is fresh consent so
   reactivating is legitimate; the open question is which MailerLite call does
   it (`PUT /subscribers/{id}`? a dedicated reactivation?). **Verify against
   current MailerLite docs before writing the fix** — do not guess in a payment
   path. Worth handling explicitly rather than silently: if reactivation is not
   possible, `grant` should throw so the failure is loud.
   Interacts with step 20: if unsubscribing cancels the Stripe subscription, a
   returning customer arrives via a fresh checkout and hits this same wall.
3. **Step 20, not yet written:** MailerLite `subscriber.unsubscribed` → cancel
   the Stripe subscription, on this same Worker. Today `{$unsubscribe}` stops the
   email but **not** the charge → angry customer, then a chargeback. §8i calls
   this v1. Open question: how MailerLite signs its webhooks — needs checking
   against current docs, since that inbound call must be authenticated or anyone
   can cancel arbitrary subscriptions. Fallback is an unguessable path segment.

**Step 6 — site changes (Next.js)**

3. `/grazie/` page — the Payment Link redirect target.
4. Pricing/subscribe section linking both Payment Links. **Push annual:** the
   fixed ~€0.30/transaction is ~8% of €5.90 but only ~3.4% of €59, so the ~17%
   discount roughly funds itself.
5. "Manage subscription" link to the Stripe customer-portal login URL.
6. All copy into `locales/it.json` under `pages.*`.

**Step 7 — before going live**

7. Privacy policy naming **Stripe and MailerLite as processors**, plus
   deletion-on-request; subscriber data stays out of git.
8. Point the crawler's `mailTo` at the colleague (last unticked non-payment item,
   §8f item 6).
9. Recreate **everything** in live mode — product, prices, Payment Links, portal
   config, webhook endpoint. None of it copies from test. Swap in live keys and
   the live signing secret, then one real €5.90 charge on your own card, refunded.
10. Non-Union OSS registration with a Swiss/EU VAT accountant. No threshold —
    VAT is due from the first EU subscriber, so this must exist before live
    payments, not after.

## Decisions already made — don't re-open

- **Stripe, not a Merchant-of-Record.** EU VAT self-filed via non-Union OSS. The
  MoR premium buys nothing once that admin is in-house anyway.
- **One product, two prices.** Two products would split reporting, break
  monthly↔annual switching in the portal, and force the webhook to know two ids.
- **Tax behaviour inclusive**, and it is **irreversible per price** — changing it
  means new prices and re-issued Payment Links.
- **No free trial** at this price point; it mostly attracts card testing.
- **Cloudflare Worker as the host.** GH Pages is static, Netlify is staging-only.
  **DNS stays at IONOS** — the zone carries MailerLite DKIM/SPF + DMARC, and
  moving it for a prettier hostname risks newsletter deliverability for nothing.
- **Live MailerLite group for testing, no test group** — the only addresses
  involved are already on the list, so `grant` is a no-op upsert. See gotchas.
- **Entitlement = group membership.** Stripe only adds and removes; the send
  pipeline knows nothing about Stripe and needs no edit.

## Gotchas that will bite

- **Three different `whsec_…` values** exist: `stripe listen` (local), the test
  dashboard endpoint, the live dashboard endpoint. Mixing them up fails every
  signature check with a confusing error.
- **Testing on the live group:** exercise the *grant* path only through **real
  checkouts with your own address**. Never `stripe trigger
  checkout.session.completed` — its fixture invents an email that would join the
  live list and hard-bounce on the next campaign, which is exactly the
  sender-reputation damage §8e warns about. `stripe trigger` is fine for
  update/delete (a fixture email just 404s on lookup).
- **The cancel test really removes you from the live newsletter.** Re-add
  yourself and the colleague afterwards or you'll silently miss a real send.
- **A `200` in Stripe's event log is not proof.** Check the MailerLite group
  directly — the group is what actually gets sent to.
- **`status:'active'` must stay explicit**, and double opt-in must stay **off**
  on this group. Otherwise an API-created subscriber sits at `unconfirmed` and
  receives nothing — a paying customer silently gets no email.
- **Testing with an address that ever unsubscribed will look like a broken
  Worker**: green 200s, `Granted …` in the log, nothing in the group. Use a
  never-seen address, and see the bug above.
- **A portal cancellation does not revoke immediately** — by design. Stripe sets
  `cancel_at_period_end` with status still `active`; revocation happens at
  `customer.subscription.deleted`. Looks like a missing case; isn't.

## Where things live

| What | Where |
|---|---|
| Decision record (§8a–8i) | `bandincc-crawler/UNIFICATION_BRAINSTORM.md` |
| Worker setup, secrets, deploy | `stripe-worker/README.md` |
| Worker handler | `stripe-worker/src/index.ts` |
| Newsletter send + deploy coupling | `CLAUDE.md` → CI/CD, `.github/workflows/newsletter.yml` |
