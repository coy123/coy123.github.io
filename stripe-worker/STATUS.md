# Payments — status and TODOs (last updated 2026-08-06)

Working notes for the Stripe leg (`bandincc-crawler/UNIFICATION_BRAINSTORM.md`
§8i). Setup mechanics live in `README.md`; this file is "what's done, what's
next, and what not to re-litigate". Delete it once payments are live.

**Where things stand:** the Worker is deployed and fully configured, both
directions. The site pages are **live on staging** and the whole test-mode funnel
works there end to end; `master` is deliberately held back (see "Remaining" 6).
The **live-mode** Stripe URLs are still placeholders. What is left is the
live-mode cutover and the OSS registration.

---

## ⚠️ Read first — the LIVE Stripe URLs on the site are placeholders

`locales/it.json` → `pages.abbonamento` holds three live Stripe URLs, all still
`TODO_…`:

| Key | Needs |
|---|---|
| `plans[0].href` | the **live** monthly Payment Link + `?locale=it` |
| `plans[1].href` | the **live** annual Payment Link + `?locale=it` |
| `manage.href` | the **live** customer-portal login URL |

Their `hrefTest` counterparts are all real — test mode is fully wired, see below.

`lib/subscription.ts` → `isPlaceholderLink()` detects the `TODO_` marker, and
`/abbonamento/` then renders the price cards with a greyed-out "Attivazione a
breve" instead of a button, while `/grazie/` drops its portal link. So the page
is safe to deploy as it is — it just cannot sell anything on the live domain yet.

This was deliberate: asserting the real shape in the test suite would have gone
red until the URLs were pasted, and a red suite blocks *every* deploy, including
the newsletter that chains off it. `cypress/e2e/subscription.cy.ts` asserts the
placeholder contract now and the live contract (https, `buy.stripe.com`,
`locale=it`, `target=_blank`) the moment the real URLs land — no test edit
needed.

---

## Staging runs Stripe test mode (added 2026-08-05)

So the whole funnel — page → Payment Link → checkout → `/grazie/` → Worker →
MailerLite — can be exercised on staging without moving money or touching a real
subscriber. The site is `output: 'export'`, so there is no server to branch on a
hostname: the choice is made at build time from **`STRIPE_MODE`**.

| | Stripe | JSON key | Worker | MailerLite group | Workflow |
|---|---|---|---|---|---|
| Production | live | `href` | `bandincc-stripe` | real subscribers | `deploy.yml` (`stripe-mode: live`) |
| Staging | test | `hrefTest` | `bandincc-stripe-test` | throwaway | `netlify-deploy.yml` (`stripe-mode: test`) |

- `lib/subscription.ts` → `stripeHref(link, mode)` picks the URL;
  `currentStripeMode()` defaults to **`live`**, and that direction is deliberate.
  A build that loses the variable falls back to the placeholder state on staging
  (visible, harmless); the reverse would put a test checkout on the real domain.
- An empty slot never falls through to the *other* mode — it resolves to a
  `TODO_` URL and renders "Attivazione a breve".
- `isTestModeLink()` keys on Stripe's `test_` path segment
  (`buy.stripe.com/test_…`, `billing.stripe.com/p/login/test_…`). Host cannot
  tell the modes apart, so that segment is the only discriminator a static build
  has.
- **The gate is `subscription.cy.ts`, not the build.** `e2e.yml` passes
  `STRIPE_MODE` to *both* the build and the test run, and the spec resolves the
  links for that mode and then looks for those exact hrefs in the DOM — so a
  mode/link mismatch, or the two steps disagreeing, fails the suite before either
  deploy job starts.
- `/abbonamento` renders an amber "ambiente di prova" banner in test mode only.
  Test checkout is otherwise indistinguishable from the real thing, redirect
  included.

**Test mode is fully wired (done 2026-08-05/06).** All three `hrefTest` values in
`locales/it.json` are real test-mode links carrying `?locale=it`, and
`[env.test.vars]` in `wrangler.toml` holds the throwaway group
(`194986214311330839`). Nothing on the test side is a placeholder any more — the
`TODO_` markers that remain are all in the **live** `href` keys.

The test portal link's id happens to be byte-identical to the monthly Payment
Link's (`test_cNi14namu0kOaTH4fXfEk00`). That is not a copy-paste slip — checked
2026-08-06, `billing.stripe.com/p/login/test_cNi14namu0kOaTH4fXfEk00?locale=it`
serves the real BandiNCC portal login. Don't "fix" it.

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

### Accepted risk, not a blocker (decided 2026-08-03, softened 2026-08-05)

**Returning unsubscribers cannot be reactivated by API** — this turns out to be
**less absolute than MailerLite's docs claim**. Tested 2026-08-05 against
`denisuzelgecici@gmail.com`, immediately after it unsubscribed by clicking
`{$unsubscribe}` in a real campaign: `POST /subscribers` with
`status:'active', resubscribe:true` — the exact call `grant()` makes — returned
200 and the **stored** record came back `active`, back in the group, with
`unsubscribed_at: null`. No dashboard delete, no form, no manual step.

What that does **not** establish: MailerLite's restriction names "unsubscribed /
bounced / junk", and only the first was tested. A hard bounce or a spam complaint
may still be unreactivatable, and that is the case their abuse prevention is
presumably actually for. It is also one observation against documentation that
says the opposite, so it can change without notice.

Which is exactly why **`grant()`'s echoed-status verification stays**. It is not
redundant now that reactivation appears to work — it is the thing that will
notice the day it stops, instead of leaving a paying customer silently receiving
nothing.

`/grazie/`'s "scrivici a info@bandincc.it" copy stays too, as the net for the
cases still unproven. Shipping without the re-subscribe form remains fine: the
subscriber base is zero, and the failure is loud rather than silent.

---

## → Resume here — the go-live runbook

**This is the answer to "what is left to do?". Give these ten steps, in this
order, and check nothing else is stale before answering.** OSS registration is
being handled by the owner directly and is tracked below, not in this list.

**A hard ordering constraint to state first:** both live Payment Links redirect to
`https://www.bandincc.it/grazie/`, and **`/grazie/` does not exist on `master`**
(neither does `/abbonamento/`). Until the merge, a live checkout ends on a 404.
So the real charge has to come *after* the merge, not before.

---

**1. Live product + prices.** In Stripe **live** mode, confirm or create one
product with two recurring prices — €5.90/month, €59/year, EUR, **tax behaviour
inclusive**. Nothing copies from test. Inclusive is irreversible per price:
getting it wrong means new prices and re-issued Payment Links.

**2. Verify the two live Payment Links.** They already exist (created 2026-08-04,
redirect set). For each, confirm **After payment → Redirect** is
`https://www.bandincc.it/grazie/` **with the trailing slash** — the site is
`trailingSlash: true`, and the test-mode pair disagree with each other, so the
live pair may too. Copy both URLs.

**3. Live customer portal config.** Enable it in live mode, allow monthly↔annual
switching and cancellation, copy the portal login URL.

**4. Live Stripe webhook endpoint.** Register
`https://bandincc-stripe.bandincc.workers.dev/` in **live** mode for exactly three
events: `checkout.session.completed`, `customer.subscription.updated`,
`customer.subscription.deleted`. Copy the `whsec_…`. This is a *third* distinct
signing secret — not the `stripe listen` one, not the test endpoint's.

**5. Swap the production Worker's secrets.** `bandincc-stripe` still carries
**test** Stripe keys — it was the original test deployment and only became
"production" when `--env test` was added:

```
printf '%s' "$LIVE_SECRET_KEY" | npx wrangler secret put STRIPE_SECRET_KEY
printf '%s' "$LIVE_WHSEC"      | npx wrangler secret put STRIPE_WEBHOOK_SECRET
```

No `--env`. Leave both `MAILERLITE_*` secrets alone. `secret put` republishes the
Worker, so no deploy is owed after.

**6. Check the MailerLite side of production.** STATUS is ambiguous here — one
line lists "live MailerLite webhook" as outstanding, another says webhook
`194877758477698574` and its secret are already correct. Verify rather than
assume: the webhook targets `…workers.dev/mailerlite`, and `MAILERLITE_GROUP_ID`
in `[vars]` is the real subscriber group `193718534342181983`.

**7. Paste the three live URLs** into `locales/it.json` → `pages.abbonamento`,
the **`href`** keys (not `hrefTest`), each keeping `?locale=it`. Deleting the
`TODO_` markers is what arms the buy buttons.

**8. Run the suite locally with `STRIPE_MODE=live` before merging.** This one
matters: `netlify-deploy.yml` passes `stripe-mode: test`, so staging asserts
`hrefTest` and will stay green no matter what you pasted into `href`. The live
contract (https, `buy.stripe.com`, `locale=it`, `target=_blank`) is first
exercised by `deploy.yml` — *on master*. A malformed live URL therefore fails the
master deploy, and the newsletter chains off that deploy. Build and run
`test:e2e:static` with `STRIPE_MODE=live` locally first.

**9. Merge to `master`.** Re-check `data/` parity immediately before (identical at
90/90 as of 2026-08-06) — `newsletter.yml` diffs against the `newsletter-sent`
tag and would mail the whole backlog as one campaign. This merge is the launch:
it publishes `/abbonamento/`, `/grazie/`, the three ad slots and the footer link.

**10. One real €5.90 charge on your own card, then refund.** Now `/grazie/`
exists, so the full path is real: checkout → redirect → webhook → MailerLite.
Then verify directly in the live group — **a 200 in Stripe's event log is not
proof**. Note the revoke half genuinely removes you from the live newsletter, so
re-add yourself and the colleague afterwards.

Two things to keep in mind while testing: never run `stripe trigger
checkout.session.completed` against the live Worker (its fixture invents an email
that joins the live list and hard-bounces), and stop any `stripe listen` first or
every event gets handled twice.

---

## Background to the runbook

**~~Verify the unsubscribe → cancel path once.~~ DONE 2026-08-05** — the
faithful test, on staging: a real campaign to the test group, `{$unsubscribe}`
clicked by a real subscriber. Stripe went `canceled`, MailerLite went
`unsubscribed` with no groups, and both webhooks sit at `response_code=200,
enabled=true`. Both directions of the integration now have live evidence behind
them.

One thing surfaced and is fixed in `src/index.ts`: because `bandincc-stripe`
still carries **test** keys, both MailerLite webhooks reached the same test
Stripe account and raced to cancel the same subscription. The winner succeeded;
the loser's `subscriptions.cancel` hit an already-cancelled subscription, which
Stripe reports as `resource_missing`, and `/mailerlite` returned 500.
`cancelSubscriptionsFor` now treats that as the no-op it is — the same tolerance
`revoke()` already had for its 404 — and still throws on anything else. **Shipped 2026-08-05 to
both Workers** (`npm run deploy:test` + `npm run deploy`); the only change to
`src/index.ts` since is a comment, so neither owes a redeploy.

The race disappears at live cutover (the production Worker will look in the live
account and find nothing), but the fix stands on its own: a redelivery, a batched
payload naming an address twice, or a double click produce the same collision,
and a 5xx on `/mailerlite` is the expensive kind of wrong — MailerLite
**disables a webhook after 3 days of non-2xx**.

**Why `?locale=it` is not optional** (runbook step 7): without it Stripe renders
checkout in the *browser's* language, and a fair share of this audience runs an
English-configured browser. The suite enforces it once the URLs are real.

**OSS registration** — the blocker described above. Must exist before live
payments. **Being handled by the owner directly**; it is not part of the runbook
and does not need to be raised in status answers.

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
rejection, `preferred_locales`. **Unsubscribe → cancel verified 2026-08-05** on
the staging/test pair, via a real campaign and a real `{$unsubscribe}` click.

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

**Payment Link redirects (2026-08-04)** — both the test and the live links now
use **After payment → Redirect** to `https://www.bandincc.it/grazie/` instead of
Stripe's hosted confirmation page.

**Promotion of the newsletter across the site (2026-08-04)** — the three ad
slots that were commented out now carry `NewsletterAd`: the home banner, the two
desktop side rails (hidden on `/abbonamento` and `/grazie`), and the bid-detail
strip. `/grazie` also got a CSS-only confetti/balloon celebration. See
`CLAUDE.md` → Ad Slots.

**Deployed to staging (2026-08-04)** and verified there. `netlify-deploy.yml`
runs the full Cypress suite before it publishes, so the whole batch — the two new
pages, the ad slots, `subscription.cy.ts`, and the reworked hero — is green
against the built export. Only the merge to `master` is left.

**Unrelated, finished and live:** the newsletter chains off a successful deploy
via `workflow_run` rather than the push, and diffs against the last commit
actually mailed (moving `newsletter-sent` tag), so a batch missed by a failed
deploy *or* a failed send is retried automatically. See `CLAUDE.md` → CI/CD.
Nothing outstanding.

---

## Remaining

**The work is the ten-step runbook in "→ Resume here" above — that is the list,
don't restate it here.** Two standing items that sit outside it:

- **OSS registration** — handled by the owner directly, outside this repo.
- ~~Verify unsubscribe → cancel~~ — done 2026-08-05 on staging. ~~Redeploy both
  Workers~~ — both shipped 2026-08-05 with the `resource_missing` fix.

And the reasoning behind runbook step 9, which is worth not re-litigating:

- **Merge to `master` — this is the launch, and it happens LAST** (decided
  2026-08-05). It was listed as independent of the rest because the placeholder
  guard makes the pages safe to ship unsold; that is true but beside the point.
  The subscription pages, the newsletter ads in all three slots and the footer
  link would announce a product to real visitors weeks before it can take a
  payment, so `master` stays where it is until live mode works end to end.
  Staging is green, so when the time comes it is the same tested export going to
  GitHub Pages — no extra risk from the wait.

  Re-checked 2026-08-06: `data/` is still **identical** on `master` and `dev`
  (90 bandi each), so holding master back is not accumulating a newsletter
  batch. `staging` and `dev` are the same commit; `master` is 9 behind. Re-check
  before merging if the crawler has landed anything since — `newsletter.yml`
  diffs against the `newsletter-sent` tag and would mail the whole backlog in one
  campaign.

### Open, low stakes

- ~~**Does the portal login URL accept `?locale=it`?**~~ **Answered 2026-08-05:
  yes.** The test-mode portal login screen renders in Italian with the param.
  Both `manage.href` and `manage.hrefTest` in `locales/it.json` now carry it, so
  keep it when the live URL is pasted in — it is the one surface
  `preferred_locales: ['it']` cannot reach, since that only applies once the
  customer has identified themselves.
- **Cookie policy is untouched**, deliberately: Stripe Checkout and the portal
  are hosted on Stripe's own domains, so they set no cookies on bandincc.it.

### Closed, do not reopen

- **Privacy policy section 1** ("bandincc.it" as the controller, no legal entity
  name, no art. 27 representative) — reviewed and accepted as-is on 2026-08-04.
- **`components/SideAdBanner.tsx`** is dead code, the leftover "EGAF" placeholder
  from the old ad slots. Kept on purpose in case that rail is ever sold.
- **A `/grazie/` MailerLite re-subscribe form — declined 2026-08-06.** Not
  necessary; do not propose it again. It was only ever a workaround for
  MailerLite refusing API reactivation, and the API reactivated a plain
  unsubscriber directly (see "Accepted risk" above). The mitigations that stay:
  `grant()`'s echoed-status verification, so a refusal is loud, and the
  "scrivici a info@bandincc.it" line on `/grazie/`.

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
- ~~**Live MailerLite group for testing, no test group**~~ — **reversed
  2026-08-05.** It held while testing meant a handful of manual `stripe trigger`
  calls against addresses already on the list. It stops holding now that staging
  runs a full test-mode checkout funnel on every deploy: those checkouts carry
  whatever address the tester types, and a live group is not the place for them.
  Staging now has its own group (see "Staging runs Stripe test mode"). The
  pleasant side effect is that the revoke test no longer removes anyone from the
  real newsletter.
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
- **Grant path against the LIVE Worker: real checkouts only.** Never `stripe
  trigger checkout.session.completed` there — its fixture invents an email that
  would join the live list and hard-bounce on the next campaign, exactly the
  sender-reputation damage §8e warns about. `stripe trigger` is fine for
  update/delete, where a fixture email just 404s on lookup. Against
  `bandincc-stripe-test` the restriction lifts: fixture addresses land in the
  throwaway group, which no campaign sends to.
- **The cancel test really removes you from the live newsletter** — when run
  against the production Worker. Re-add yourself and the colleague or you will
  silently miss a real send. Against `--env test` it only touches the throwaway
  group, which is the point of having one.
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
