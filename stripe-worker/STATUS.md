# Payments — status and TODOs (last updated 2026-08-04)

Working notes for the Stripe leg (`bandincc-crawler/UNIFICATION_BRAINSTORM.md`
§8i). Setup mechanics live in `README.md`; this file is "what's done, what's
next, and what not to re-litigate". Delete it once payments are live.

**Where things stand:** the Worker is deployed and fully configured, both
directions. The site pages exist in the repo but have not deployed yet, and
carry placeholder Stripe URLs. What is left is the live-mode cutover and the
OSS registration.

---

## ⚠️ Read first — the Stripe URLs on the site are placeholders

`locales/it.json` → `pages.abbonamento` holds three Stripe URLs, all still
`TODO_…`:

| Key | Needs |
|---|---|
| `plans[0].href` | the **live** monthly Payment Link + `?locale=it` |
| `plans[1].href` | the **live** annual Payment Link + `?locale=it` |
| `manage.href` | the **live** customer-portal login URL |

`lib/subscription.ts` → `isPlaceholderLink()` detects the `TODO_` marker, and
`/abbonamento/` then renders the price cards with a greyed-out "Attivazione a
breve" instead of a button, while `/grazie/` drops its portal link. So the page
is safe to deploy as it is — it just cannot sell anything yet.

This was deliberate: asserting the real shape in the test suite would have gone
red until the URLs were pasted, and a red suite blocks *every* deploy, including
the newsletter that chains off it. `cypress/e2e/subscription.cy.ts` asserts the
placeholder contract now and the live contract (https, `buy.stripe.com`,
`locale=it`, `target=_blank`) the moment the real URLs land — no test edit
needed.

---

## 🚨 Hard blocker — nothing goes live until this is done

**Non-Union OSS registration is NOT in place.** A Swiss company selling a
digital subscription B2C into the EU owes VAT in the *customer's* country, and
for a non-EU seller there is **no threshold** — VAT is due from the very first
EU subscriber. Register in one member state, file quarterly; needs a Swiss/EU
VAT accountant. **This is the long-lead item — it runs on someone else's
turnaround, so it should be in flight before the remaining engineering, not
after.**

### "Can I start charging now and sort the tax out later?" (asked 2026-08-04)

Mechanically yes; it is a bad trade. Two things are true at once:

- OSS registration normally takes effect from **the first day of the quarter
  after you apply**, so sales made before that are not covered by it.
- There is a carve-out for exactly this case: if the **first** supply happens
  before registering, the scheme can apply from the date of that first supply
  **provided the member state of identification is notified by the 10th day of
  the month following it**. Miss that window and the pre-registration sales fall
  outside OSS — they then have to be declared through a direct VAT registration
  in each member state where a customer sat, which is the entire administrative
  cost OSS exists to avoid.

So "charge now, file later" hangs on a hard deadline measured in days, set by
the timing of a sale that could arrive at any moment, in a scheme that is not
yet open. Confirm the details with the accountant before relying on any of it —
this is a reading of the rules, not tax advice. The low-drama version is to keep
the page in its current unsellable state until the registration exists.

### Accepted risk, not a blocker (decided 2026-08-03)

**Returning unsubscribers cannot be reactivated by API.** Shipping without the
`/grazie/` re-subscribe form: the subscriber base is zero, so there is nobody to
strand, and the failure is loud rather than silent. `/grazie/` now tells anyone
affected to write to info@bandincc.it, which is the whole mitigation until the
form exists. Revisit when someone actually complains — see "Deferred" below.

---

## → Resume here

**1. Verify the unsubscribe → cancel path once.** `MAILERLITE_WEBHOOK_SECRET`
went in on 2026-08-04, *after* the 2026-08-03 test round, so `POST /mailerlite`
has never been exercised end to end. It is the one payment-adjacent path with no
live evidence behind it, and MailerLite **disables a webhook after 3 days of
non-2xx**, so a wrong secret ends with the integration quietly switching itself
off.

- Click `{$unsubscribe}` in a campaign as a test subscriber
- Expect: the Stripe subscription cancels immediately; `npm run tail` logs it;
  MailerLite → Integrations → Webhooks shows a 2xx in the delivery history

`wrangler secret put` republishes the Worker itself, so **no redeploy is needed**
after setting the secret.

**2. Recreate everything in live mode** — product, prices, Payment Links, portal
config, Stripe webhook endpoint, MailerLite webhook. **None of it copies from
test.** Swap in the live keys and the live signing secret
(`npx wrangler secret put`, then `npm run deploy`).

**3. Paste the three live URLs** into `locales/it.json` (see "Read first"). The
`?locale=it` on both Payment Links is not optional — without it Stripe renders
checkout in the *browser's* language, and a fair share of this audience runs an
English-configured browser. The suite enforces it once the URLs are real.

**4. Then:** switch each Payment Link to **After payment → Redirect** pointing at
`https://www.bandincc.it/grazie/` (they currently use Stripe's default hosted
confirmation page), and run one real €5.90 charge on your own card, refunded.

**5. OSS registration** — the blocker above. Must exist before live payments.

---

## Done

**Stripe setup (steps 1–4)** — account, one product with two recurring prices
(€5.90/mo, €59/yr, EUR, **tax-inclusive**), tax decision, two Payment Links
(test mode).

**The Worker (step 5, items 15–20)** — `bandincc-stripe.bandincc.workers.dev`,
deployed 2026-08-03, endpoint registered in test mode, all four secrets set
(`MAILERLITE_WEBHOOK_SECRET` on 2026-08-04). Covers:

- Stripe signature verification (`constructEventAsync` + SubtleCrypto — the sync
  form needs Node crypto and fails on Workers)
- the three-event entitlement switch, `status:'active'` explicit
- an upfront binding check naming any missing secret
- `preferred_locales: ['it']` so the customer portal and Stripe's own emails are
  Italian
- `grant` verifying the echoed subscriber instead of trusting the 200
- `POST /mailerlite` — unsubscribe cancels the Stripe subscription immediately

Verified against the deployed Worker on 2026-08-03: grant, revoke, signature
rejection, `preferred_locales`. **Not yet verified: unsubscribe → cancel** (see
"Resume here").

**Step 6 — site changes (2026-08-04).** All copy in `locales/it.json`, nothing
hardcoded in a component:

- `app/abbonamento/page.tsx` — pitch, both plans (annual highlighted, "due mesi
  in omaggio"), portal link, `Product` JSON-LD with both offers. Not in the main
  nav: the desktop bar is already wider than its container at `lg` with the seven
  labels it has. Reached from the home-page banner ad, the two desktop side
  rails and a footer link — see `CLAUDE.md` → Ad Slots.
- `app/grazie/page.tsx` — the Payment Link redirect target. `noindex` and absent
  from `public/sitemap.xml` on purpose: it is a post-payment confirmation, not
  content, and indexed it would compete with `/abbonamento/`. Carries no order
  details — a static export cannot read the Stripe session, and entitlement comes
  from the webhook, not from this page loading.
- `lib/subscription.ts` — the placeholder guard described above.
- `cypress/e2e/subscription.cy.ts`, plus `/abbonamento` in
  `cypress/support/routes.ts` (`ROUTES` + `FOOTER_LINKS`).

**Step 7 — privacy policy (2026-08-04).** `locales/it.json` →
`pages.privacyPolicy` now has a section 6 naming **Stripe Payments Europe
(Irlanda)** and **MailerLite (Lituania)** as art. 28 processors and stating what
each receives; section 9 spells out deletion-on-request via info@bandincc.it
within 30 days; the legal bases now include art. 6(1)(b) and (c); retention
distinguishes the subscriber email from the fiscal records. **Section 10 was
factually wrong** and is rewritten — it claimed no data leaves the EEA, which
stops being true the moment Stripe and MailerLite are in the chain.

**Notify (§8f item 6)** — no change needed: `mailTo` is already
info@bandincc.it, which is the colleague's address.

**Unrelated, finished and live:** the newsletter chains off a successful deploy
via `workflow_run` rather than the push, and diffs against the last commit
actually mailed (moving `newsletter-sent` tag), so a batch missed by a failed
deploy *or* a failed send is retried automatically. See `CLAUDE.md` → CI/CD.
Nothing outstanding.

---

## Remaining

1. Verify unsubscribe → cancel (never tested — "Resume here" 1).
2. Recreate everything in live mode ("Resume here" 2).
3. Paste the three live Stripe URLs into `locales/it.json` ("Resume here" 3).
4. Payment Links → **After payment → Redirect** to `/grazie/`; one real charge,
   refunded.
5. **OSS registration** — the blocker.

### Open, low stakes

- **Does the portal login URL accept `?locale=it`?** Unverified, so the link
  ships bare. `preferred_locales: ['it']` already covers everything *after* the
  customer identifies themselves; only the login screen itself is in question.
- **Cookie policy is untouched**, deliberately: Stripe Checkout and the portal
  are hosted on Stripe's own domains, so they set no cookies on bandincc.it.
- **The controller is still identified only as "bandincc.it"** in privacy policy
  section 1. Once money changes hands, art. 13 wants the Swiss company's legal
  name and address, and a controller outside the EU offering services to EU data
  subjects may also need an art. 27 EU representative. Left alone because the
  legal entity's details are not in this repo — worth one question to the
  accountant who handles the OSS registration.

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
- **`/abbonamento` stays out of the main nav.** The desktop bar's seven labels
  already run wider than its container at `lg` — that is why the wordmark is
  hidden below `xl`. The home-page CTA and the footer link are the entry points.

---

## Gotchas that will bite

- **Three different `whsec_…` values** exist: `stripe listen` (local), the test
  dashboard endpoint, the live dashboard endpoint. Mixing them up fails every
  signature check with a confusing error. A fourth, unrelated secret belongs to
  the MailerLite webhook.
- **`wrangler secret put` is separate from `wrangler deploy`** — but it
  republishes the Worker itself, so setting a secret needs no redeploy after it.
  A deployed but unconfigured Worker is still a normal state to end up in.
- **The MailerLite API key is ~987 chars** and gets silently truncated by
  terminal paste into the hidden prompt. Pipe it:
  `printf '%s' "$MAILERLITE_API_KEY" | npx wrangler secret put MAILERLITE_API_KEY`.
  A truncated key is indistinguishable from a good one until MailerLite answers
  `401 Unauthenticated` — `secret list` shows names, never values.
- **`.dev.vars` is gitignored**, so the local test secrets exist only on the
  machine that created them and are not recoverable from the repo.
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
- **Deleting the `TODO_` marker is what arms the site.** The moment a real URL
  replaces a placeholder, `/abbonamento/` starts rendering live buy buttons and
  the suite starts enforcing the live link contract. Do not paste a *test-mode*
  Payment Link in as a stopgap: it would ship a working checkout that charges
  nobody and grants nothing.

---

## Where things live

| What | Where |
|---|---|
| Decision record (§8a–8i) | `bandincc-crawler/UNIFICATION_BRAINSTORM.md` |
| Worker setup, secrets, deploy, behaviour | `stripe-worker/README.md` |
| Worker handler | `stripe-worker/src/index.ts` |
| Stripe URLs + all subscription copy | `locales/it.json` → `pages.abbonamento`, `pages.grazie` |
| Placeholder guard | `lib/subscription.ts` |
| Subscription pages | `app/abbonamento/page.tsx`, `app/grazie/page.tsx` |
| Subscription tests | `cypress/e2e/subscription.cy.ts` |
| Newsletter send + deploy coupling | `CLAUDE.md` → CI/CD, `.github/workflows/newsletter.yml` |
| Live Worker | `https://bandincc-stripe.bandincc.workers.dev` (`/` Stripe, `/mailerlite` unsubscribe) |
