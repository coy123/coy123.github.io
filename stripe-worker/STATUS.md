# Payments — status and TODOs (last updated 2026-08-07)

Working notes for the Stripe leg (`bandincc-crawler/UNIFICATION_BRAINSTORM.md`
§8i). Setup mechanics live in `README.md`; this file is "what's done, what's
next, and what not to re-litigate". Delete it once payments are live.

**Where things stand:** the Worker is deployed and fully configured, both
directions. The site pages are **live on staging** and the whole test-mode funnel
works there end to end; `master` is deliberately held back (see "Remaining" 6).
The **live-mode** Stripe URLs are still placeholders. What is left is the OSS
registration, the rest of the tax configuration in Stripe, and the live-mode
cutover.

**Updated 2026-08-07 — steps 2 through 10 are DONE.** Live product and prices
confirmed; tax-inclusive pricing and the newsletter tax code set as Stripe Tax
*account defaults* (reversible) rather than per price (irreversible); Tax ID
collection on and billing address required on all four Payment Links; live portal
verified; live webhook endpoint registered on the same API version as test;
production Worker swapped to a live restricted key + live `whsec` and probe-
verified; the three live URLs pasted into `locales/it.json`; the
`STRIPE_MODE=live` suite green locally; and the staging funnel re-tested after
the checkout-options change.

**What is left: step 11 (merge = launch), step 12 (one real charge), then OSS
registration immediately after the first sale.** Step 1 moved *behind* the launch
on 2026-08-07: neither Austria's nor Ireland's portal will accept a non-Union OSS
application without a first-supply date, which does not exist until someone buys.
See "Registration attempt 2026-08-07" under step 1 — **the 10th of the month
following the first sale is a hard deadline with no slack in it.** Plus one
deliberate deferral: `automatic_tax` is still `false` on all four links and
**becomes mandatory the moment a registration is added** — see step 3.

The plan also changed shape: selling before the OSS registration is now an
accepted, costed option (**plan A**, see "If we do sell before OSS lands"), so
step 1 no longer hard-blocks the merge. It does still gate how long the
notification window is, which is why the *month* the page opens in now matters.

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
after.** It is **runbook step 1**: the owner does it personally and reports back,
and it stays in every status answer until they do.

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

**Both rules CONFIRMED 2026-08-07** against the European Commission's own OSS
registration page (`vat-one-stop-shop.ec.europa.eu/one-stop-shop/register-oss_en`),
which had been recorded here since 2026-08-04 as an unverified reading. Effect is
"the first day of the calendar quarter following that in which the taxable person
informs the Member State of identification"; the exception applies "provided that
the Member State of identification is informed of this by the tenth day of the
month following that first supply", and failure requires direct registration in
the consumption Member State(s). Plan A's cost profile therefore stands.

So "charge now, file later" hangs on a hard deadline measured in days, set by
the timing of a sale that could arrive at any moment, in a scheme that is not
yet open. Confirm the details with the accountant before relying on any of it —
this is a reading of the rules, not tax advice. The low-drama version is to keep
the page in its current unsellable state until the registration exists.

### If we do sell before OSS lands: plan A, not plan B (decided 2026-08-07)

A follow-up question — *can we switch tax collection on in Stripe now and fix the
invoices later?* — resolves into two different plans with very different
exposure. **Plan A is the decision.**

- **Plan A — sell with zero registrations declared in Stripe.** Stripe computes
  0%, invoices show €5.90 with no VAT line. When OSS goes active, the VAT is
  back-paid out of revenue already collected. Because prices are **inclusive**
  the buyer pays €5.90 either way, so nothing customer-facing changes; the cost is
  ~€1.06 of margin per Italian sale, retroactively. **Every document issued stays
  correct** — there is nothing to fix, only a bill to settle.
- **Plan B — declare the registration early so Stripe states VAT. Rejected.**
  Under the EU VAT Directive, **VAT entered on an invoice is owed because it was
  entered on the invoice** (Art. 203): state it without being entitled to charge
  it and the full amount is due regardless of intent, and unwinding it needs
  credit notes and reissuance rather than a quiet edit. It also issues B2B
  customers invoices carrying a VAT line with no valid VAT number, which they
  cannot use to deduct input VAT — and this audience is largely `partita IVA`, so
  that is most of the book, not an edge case.

**"Fix the invoices later" is not available inside Stripe.** `active_from` accepts
only `now` or a future timestamp, so a later registration cannot recompute or
reissue anything from before it. Under plan A that costs nothing (the documents
were never wrong); under plan B every correction is manual, per invoice, outside
Stripe. That asymmetry is the whole argument.

**The notification deadline is rolling, not a fixed date.** It is keyed to the
month of the **first supply** — first sale in August → notify by 10 September;
first sale on 2 September → 10 October. Until `/abbonamento/` is on `master`
nothing is sellable, so **no clock is running at all**. The trap is that the
window is *shortest* when sales open late in a month: merging on 30 August could
leave 11 days, merging on 1 September leaves five or six weeks. **If sales open
before OSS is granted, open them at the start of a month** — it is free and it
buys most of the margin for error.

This does not decouple from step 1 as much as it looks: notifying the member
state of identification presupposes one has been chosen and the application is
far enough along to file against. Confirm the carve-out and the deadline with the
accountant before relying on either — as above, a reading of the rules, not tax
advice.

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

**This is the answer to "what is left to do?". Give these twelve steps, in this
order, and check nothing else is stale before answering.** OSS registration is
step 1 and **must be listed every time** (revoked 2026-08-06 — it was previously
suppressed from status answers). The owner does that step personally and will say
when it is done; until then it stays in the list.

**A hard ordering constraint to state first:** both live Payment Links redirect to
`https://www.bandincc.it/grazie/`, and **`/grazie/` does not exist on `master`**
(neither does `/abbonamento/`). Until the merge, a live checkout ends on a 404.
So the real charge has to come *after* the merge, not before.

---

**1. Non-Union OSS registration.** The hard blocker — see the section above for
why there is no threshold for a non-EU seller and why "charge now, file later"
hangs on a deadline measured in days. **The owner handles this personally and
will report when it is done; nobody else can move it.** It is the long-lead item,
so it should be in flight while the rest of the runbook is worked.

**Softened 2026-08-07:** this used to read "nothing below step 11 can go live
without it". Selling before OSS is granted is now an accepted, costed option —
but only as **plan A** (zero registrations declared in Stripe, VAT back-paid out
of inclusive revenue), never plan B, and only with the rolling notification
deadline understood. See "If we do sell before OSS lands" above; do not re-derive
that trade-off. One question remains for the
accountant: how reverse-charge B2B revenue gets declared alongside the OSS
return. (The other one — whether tax-inclusive pricing is right for a mixed
B2C/B2B book — was answered **inclusive** on 2026-08-07 and applied; see step 2.)

**Ask the accountant for the *effective date*, not just "it's filed."** Stripe's
`active_from` on a tax registration accepts only `now` or a **future**
timestamp — **there is no backdating** (verified against the API reference
2026-08-07). Any sale that settles before the registration is active gets zero
tax calculated, permanently; correcting it means rebuilding those invoices by
hand outside Stripe. That is the mechanical reason step 1 must land before step
11, on top of the legal one. Once the effective date is known the registration
can be created ahead of time with `active_from` set to it, and it switches itself
on — that is the honest version of "set it up before OSS exists". Creating it
*without* a registration is possible (Stripe verifies nothing) but pointless:
`/abbonamento/` is not on `master`, so there is nothing to sell yet.

Registering directly with the authority is not the only route — Stripe can
register on your behalf outside the US via Taxually. Named here as an option
because it changes the lead time; the choice is the accountant's.

### Registration attempt 2026-08-07 — deferred until after the first sale

**Decision: register immediately AFTER the first sale, not before.** Two things
were tried and both pointed the same way:

- **Austria — blocked.** FinanzOnline login fails despite an existing account.
  Unresolved; the non-EU OSS path (Austria calls it **Non-EU-OSS (eVAT)**) may
  need separate credentials from an ordinary FinanzOnline account. Not
  investigated further because of the next point.
- **Ireland — cannot be completed early, by design.** Its non-Union OSS form
  **requires the date of the first supply** and a tick-box declaring all data
  correct. With no sale yet there is no truthful date to give, so the form cannot
  be submitted before launch. This is the deciding constraint, and it is very
  likely not Ireland-specific: the carve-out is worded around informing the state
  about a supply that *has occurred*, so any member state's form may ask the same.

**Member state of identification is therefore still open** — Austria and Ireland
both remain valid (a non-EU business may choose any). Ireland's form at least
loads and is in English; Austria's blocker is a login problem, not a rule.

**Accepted risk: process latency inside the deadline window.** Registering only
after the first sale means the *entire* registration — credentials included — has
to complete before the 10th of the month following that sale. A sale on the 30th
leaves eleven days. The alternative (open the account early, notify the date
later) was not available, because neither portal would take an application
without a first-supply date. **So the deadline is the critical path and there is
no slack in it — treat registration as the first action after the first sale,
not a task for later that week.**

**Bounded worst case.** If the deadline is missed, pre-registration supplies fall
outside OSS and need direct VAT registration in each member state where a
customer sat. The audience is Italian NCC operators, so realistically that is
**one direct Italian registration**, not a pan-EU exercise — and since
`billing_address_collection` is now `required` on all four links, the actual
countries will be known rather than guessed.

**On the first sale — do these in this order:**

1. Record the date of the first `checkout.session.completed` (Stripe timestamps
   it; this is the "first supply date" the form asks for).
2. Register for non-Union OSS naming that date, before the 10th of the following
   month.
3. Once granted, create the Stripe tax registration with `active_from` set to the
   effective date Austria/Ireland gives, **and** turn on `automatic_tax` on all
   four Payment Links in the same sitting — see step 3 on why doing one without
   the other fails silently.
4. Re-run the staging funnel afterwards: a tax line mid-checkout is a checkout
   change.

**~~2. Live product + prices.~~ DONE 2026-08-07.** Already existed in live mode
and needed no changes:

- Product `prod_UyWn4isXcO6DFE` "Abbonamento BandiNCC"
- `price_1TyZkOGZN5xaIveHNTFjI7F7` — €5.90 EUR/month → link `…fEk00`
- `price_1TyZlUGZN5xaIveHtakxPrNE` — €59.00 EUR/year → link `…fEk01`

Tax-inclusive was applied **at account level, not per price** — Stripe Tax
settings now read `defaults.tax_behavior: inclusive` and
`defaults.tax_code: txcd_10503002` ("Digital other news or documents —
downloadable — subscription — with conditional rights", the newsletter code; the
periodical codes were rejected because this sends on new bandi, not at regular
intervals). Both prices remain `tax_behavior: unspecified` and the product
remains `tax_code: null`; **both inherit the defaults, and that is correct — not
a regression.**

This was deliberate. The claim that inclusive is irreversible per price is only
true **once set**: from `unspecified` the field is updatable in place, once. Using
the account default keeps the decision reversible, is what Stripe itself
recommends, and — contrary to what was assumed here — `automatic_tax` does *not*
reject prices whose `tax_behavior` is `unspecified` when a default exists. **No
irreversible write has been made to this account.**

**3. Tax configuration — make Stripe distinguish business from private
customers.** As a Swiss (non-EU) seller: a B2C sale into the EU carries the
customer's national VAT rate, but a sale to an EU **business** with a valid VAT
number is **reverse charge — no VAT is charged at all**, and those supplies fall
outside OSS entirely (they are not on the OSS return). Stripe cannot tell the two
apart unless it is told to ask. Do all of this **before** step 4 locks the links:

- ~~**Enable Stripe Tax** in live mode~~ — **already active** (verified
  2026-08-07: `/v1/tax/settings` → `status: active`, head office Oberglatt/CH).
  Decided 2026-08-06 in preference to computing VAT by hand — see "Stripe Tax vs.
  doing it by hand" below for the numbers behind that.
- **Add the OSS registration to it** once step 1 lands — **and not before.**
  `automatic_tax` then applies each member state's rate. **Live registrations are
  currently zero** (`/v1/tax/registrations` → `count 0`), so Stripe Tax is
  switched on but computing 0% everywhere. That is expected, not a fault — it is
  also exactly the state plan A depends on, so **do not declare a registration
  early to "start collecting"** (see "plan A, not plan B" above). Create it with
  `country_options[<state of identification>][type]=oss_non_union` and
  `active_from` set to the effective date — see step 1 on why the date matters.
- ~~**Turn on Tax ID collection**~~ **DONE 2026-08-07** — `tax_id_collection`
  is now `true` on all four links (both live, both test). Note the claim that a
  supplied VAT number is "zero-rated as reverse charge and the invoice carries the
  reverse-charge treatment" is **only true once a registration exists**. Pre-OSS,
  with zero registrations, Stripe computes 0% for everyone and a business and a
  consumer receive byte-identical invoices — no VAT line, no reverse-charge note.
  Collection is on anyway because it is **record-keeping, not tax logic**: VIES
  validation runs regardless of registration state, so the B2B/B2C split of the
  pre-OSS book is captured at the time of sale and can be classified later.
  Without it that split cannot be reconstructed and everything defaults to B2C.
  **Decided 2026-08-07:** business customers get the same plain invoice during the
  gap; anyone who writes in gets helped by hand, which the captured + validated
  VAT number makes possible.
- ~~**Set billing address collection to required**~~ **DONE 2026-08-07** —
  `required` on all four links. Needed for rate determination, and as a non-EU
  seller you want two non-contradictory pieces of place-of-supply evidence —
  billing country plus the card issuer country in
  `charge.payment_method_details.card.country`. Under plan A it is the
  **load-bearing** one: without a billing country per sale there is no way to work
  out what is owed to which member state later, and that is true even under the
  simplest "treat it all as B2C" treatment, since the rate is the customer's
  national rate.
- **`automatic_tax` is still `false` on all four — deliberately deferred
  2026-08-07.** With zero registrations it would compute 0% anyway, so it buys
  nothing today. **Two things it defers rather than avoids, and both bite later:**
  (a) turning it on becomes *mandatory* at OSS time — a registration added while
  `automatic_tax` is off means Stripe calculates nothing while we are registered,
  i.e. liability for VAT never collected, **with no error raised anywhere**;
  (b) the staging funnel re-test moves to OSS time too, which is a worse moment
  for it. A tax line appearing mid-checkout is exactly the kind of change that
  makes an otherwise-passing Payment Link behave differently.
- ~~**Owed now, not at OSS time:** one test checkout on staging to re-prove
  checkout → `/grazie/` → Worker → MailerLite.~~ **DONE 2026-08-07.** Required
  billing address plus a tax ID field *is* a checkout change, and the Cypress
  suite cannot see it — it asserts the hrefs, never what happens inside Stripe's
  hosted page. Re-run this whenever a link's checkout options change again.
- **Do not expect the prices to read `inclusive`** — they read `unspecified` and
  inherit `defaults.tax_behavior: inclusive` from the account. That is the
  intended state as of 2026-08-07 (step 2). What to confirm instead is that the
  Tax settings default is still `inclusive`; if someone sets a price-level value,
  *that* becomes the irreversible one.

Three consequences to be aware of rather than surprised by:

- **Inclusive pricing means a business customer pays the same €5.90.** The
  consumer's €5.90 is gross of e.g. 22% Italian VAT; the reverse-charge business
  pays €5.90 with no VAT in it and we keep the difference. If a business should
  instead *pay less*, prices must be **exclusive** — irreversible per price.
- **The tax ID field is optional for the buyer.** Anyone who leaves it blank is
  charged as a consumer. Safe failure direction, but some businesses will pay VAT
  they could have avoided. Note this audience is largely `partita IVA` holders,
  so B2B may be the majority of the book, not an edge case.
- **Stripe Tax is billed per transaction, including renewals and including
  zero-tax (reverse-charge) ones** — 0.5%, so ~€0.03 on €5.90. Budget ~€3/month
  per 100 monthly subscribers. It does **not** file anything; the OSS return is
  still ours.

**~~4. Verify the two live Payment Links.~~ Redirects VERIFIED 2026-08-07** —
both already end in `https://www.bandincc.it/grazie/` **with** the trailing
slash, so the `trailingSlash: true` worry is settled. The live URLs, for step 9
(add `?locale=it` to each):

- monthly `plink_1U0j3uGZN5xaIveHie2O8Gwc` → `https://buy.stripe.com/cNi14namu0kOaTH4fXfEk00`
- annual  `plink_1U0j4BGZN5xaIveHdpqNXGQf` → `https://buy.stripe.com/28EaEX8emc3w9PDfYFfEk01`

Note the live slugs are the test slugs minus the `test_` prefix — which is direct
confirmation that `isTestModeLink()`'s discriminator is sound.

Updated 2026-08-07: `tax_id_collection` is now `true` and
`billing_address_collection` is `required` on all four links; `automatic_tax`
remains `false` on all four by decision (step 3). The test pair's trailing-slash
disagreement is also fixed — `test_cNi14…fEk00` was redirecting to `/grazie`
without the slash and now matches the other three.

**~~5. Live customer portal config.~~ ALREADY DONE — verified 2026-08-07.**
Live config `bpc_1TzukCGZN5xaIveHqkH7Clbe`, active and default:

- login page **enabled** → `https://billing.stripe.com/p/login/cNi14namu0kOaTH4fXfEk00`
  (this is the URL step 9 needs, plus `?locale=it`)
- `subscription_cancel`: enabled, `at_period_end`, reasons collected
- `subscription_update`: enabled, `default_allowed_updates: ["price"]` — the
  monthly↔annual switching the step asks for
- `invoice_history`, `payment_method_update`: enabled
- `customer_update` allows `tax_id` — useful under plan A, since a business can
  add its VAT number itself after the fact
- headline set: "BandiNCC collabora con Stripe per la fatturazione."

**The portal login slug is identical to the live monthly Payment Link slug**
(`cNi14namu0kOaTH4fXfEk00` on both `buy.stripe.com` and
`billing.stripe.com/p/login/`), and the same is true of the test pair. That is
what Stripe actually returns — **not** a copy-paste error in `locales/it.json`.
Do not "fix" it.

Two things still worth a look, neither blocking:

- ~~**`subscription_update.products` is absent from the API response**~~ —
  **checked in the Dashboard 2026-08-07: both prices are listed**, so plan
  switching genuinely works. Note the field simply does not come back on this
  endpoint even when populated, so **absence proves nothing** — do not re-raise
  this from the API output alone. The settings live at
  `dashboard.stripe.com/settings/billing/portal` (Settings → Billing → Customer
  portal), *not* under Product catalog, which is where the search naturally goes.
- **The test portal config diverges from live**, so staging cannot rehearse the
  portal faithfully: test `bpc_1U19PJGZN5xaIveHFL6Ew1Qo` has
  `subscription_update.enabled: false` (no plan switching at all), no `tax_id` in
  `customer_update`, no headline, and a shorter cancellation-reason list. Align it
  if the portal is ever going to be exercised on staging.

**~~6. Live Stripe webhook endpoint.~~ DONE 2026-08-07** — `we_1U1nJ7GZN5xaIveH0fIgB3h2`
→ `https://bandincc-stripe.bandincc.workers.dev`, enabled, exactly the three
events, and **`api_version` matched to the test endpoint's `2026-06-24.dahlia`**
so staging stays a faithful rehearsal of the payload shape. Original instructions
below for reference.

**6 (original). Live Stripe webhook endpoint.** Register
`https://bandincc-stripe.bandincc.workers.dev/` in **live** mode for exactly three
events: `checkout.session.completed`, `customer.subscription.updated`,
`customer.subscription.deleted`. Copy the `whsec_…`. This is a *third* distinct
signing secret — not the `stripe listen` one, not the test endpoint's.

**~~7. Swap the production Worker's secrets.~~ DONE 2026-08-07.**
`bandincc-stripe` previously carried **test** Stripe keys — it was the original
test deployment and only became "production" when `--env test` was added. It now
holds a **live restricted key** plus the live `whsec`. Verified by probing the
deployed Worker: both `/` and `/mailerlite` return `400` (past the `REQUIRED`
check, failing signature verification as they should) on 15/15 request pairs.

`STRIPE_SECRET_KEY` is an `rk_live_…` restricted key, **not** the account secret
key, scoped to exactly what `src/index.ts` calls:

| Resource | Level | Used by |
|---|---|---|
| Customers | Write | `customers.update` (183), `.retrieve` (198), `.list` (320) |
| Subscriptions | Write | `subscriptions.list` (324), `.cancel` (334) |

`webhooks.constructEventAsync` (522) verifies locally and needs no API scope. If
the Worker ever grows a new Stripe call it will fail with
`more_permissions_required` naming the missing scope — expected, not a fault.
Don't confuse this key with the CLI's read-only `rk_live_` from `stripe login`.

Use guards when re-running, and **verify by probe, never by `secret list`** — see
the two new entries in "Gotchas that will bite":

```
read -rs -p "value: " V; echo
[ -n "$V" ] && printf '%s' "$V" | npx wrangler secret put NAME || echo "EMPTY — aborted"
```

No `--env`. Leave both `MAILERLITE_*` secrets alone. `secret put` republishes the
Worker, so no deploy is owed after.

**What the probe does *not* prove: that the values are correct.** A wrong-but-
present `whsec` is indistinguishable from a right one until a real signed event
arrives. That is step 12's job.

**8. Check the MailerLite side of production.** STATUS is ambiguous here — one
line lists "live MailerLite webhook" as outstanding, another says webhook
`194877758477698574` and its secret are already correct. Verify rather than
assume: the webhook targets `…workers.dev/mailerlite`, and `MAILERLITE_GROUP_ID`
in `[vars]` is the real subscriber group `193718534342181983`.

**~~9. Paste the three live URLs~~ DONE 2026-08-07** — all three `TODO_` markers
in `locales/it.json` → `pages.abbonamento` are gone, `?locale=it` kept on each:

```
plans[0].href  https://buy.stripe.com/cNi14namu0kOaTH4fXfEk00?locale=it
plans[1].href  https://buy.stripe.com/28EaEX8emc3w9PDfYFfEk01?locale=it
manage.href    https://billing.stripe.com/p/login/cNi14namu0kOaTH4fXfEk00?locale=it
```

**`manage.href` and `plans[0].href` share the slug `cNi14namu0kOaTH4fXfEk00`.**
That is correct — Stripe returns the same slug for the monthly Payment Link and
the portal login page, on different hosts, and the already-working `hrefTest`
pair has the identical collision. Do not "fix" it.

**The buy buttons are now armed in live builds.** `isPlaceholderLink()` no longer
matches, so a `STRIPE_MODE=live` export renders real buttons instead of
"Attivazione a breve". Staging is unaffected: `netlify-deploy.yml` passes
`stripe-mode: test`, `stripeHref` resolves `hrefTest`, and those were already
real — so `subscription.cy.ts` was already asserting the live contract there and
its behaviour does not change. What *does* change is the `master` path: the spec
will now assert the live contract (https, `buy.stripe.com`, `locale=it`,
`target=_blank`) instead of the placeholder one. Hence step 10.

**~~10. Run the suite locally with `STRIPE_MODE=live`~~ DONE 2026-08-07 — all
green.** The live contract (https, `buy.stripe.com`, `locale=it`,
`target=_blank`) has now been exercised once, locally, against the real URLs.
Run it from the **repo root**, not `stripe-worker/` (that is a separate npm
project with no `build` or `test:e2e:static`), and put `STRIPE_MODE` on **both**
commands — `e2e.yml` sets it on the build step and the test step, and a
disagreement fails the suite by design:

```
STRIPE_MODE=live npm run build && STRIPE_MODE=live npm run test:e2e:static
```

Why it mattered: `netlify-deploy.yml` passes `stripe-mode: test`, so staging
asserts `hrefTest` and stays green no matter what is in `href`. The live contract
is otherwise first exercised by `deploy.yml` — *on master* — and a malformed live
URL would fail that deploy, taking the newsletter chained off it with it.

**11. Merge to `master`.** Re-check `data/` parity immediately before —
`newsletter.yml` diffs against the `newsletter-sent` tag and would mail a backlog
as one campaign. This merge is the launch: it publishes `/abbonamento/`,
`/grazie/`, the three ad slots and the footer link.

**Parity re-checked 2026-08-07 (later): clean.** `master` briefly ran ahead on
`data/data.json` after taking `366c8bf` and `789a2ec` directly, which created a
risk that merging `dev` would *delete* already-published bandi. That has since
been resolved — `git log dev..master` is empty (`master` is fully contained in
`dev`) and `git diff master dev -- data/data.json` is empty. Nothing would be
rolled back.

**Newsletter exposure at merge: one bando.** `newsletter-sent` points at
`28cc85c` with **90** bandi; `dev` has **91**. So the first successful `master`
deploy mails a single-bando campaign, which is normal traffic, not a backlog.
Re-check both numbers immediately before merging if the crawler has landed
anything since.

**12. One real €5.90 charge on your own card, then refund.** With plan A accepted
(2026-08-07) this no longer *blocks* on step 1 — but the merge in step 11 opens
the page to real EU buyers, and **the first of those starts the notification
clock**, so know which month you are opening in before you get here. Now
`/grazie/` exists, so the full path is real: checkout → redirect → webhook →
MailerLite.
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

**Why `?locale=it` is not optional** (runbook step 9): without it Stripe renders
checkout in the *browser's* language, and a fair share of this audience runs an
English-configured browser. The suite enforces it once the URLs are real.

**OSS registration** — the blocker described above. Must exist before live
payments. **Being handled by the owner directly, who will say when it is done.**
It is **runbook step 1** and belongs in every status answer until then. (It spent
2026-08-05 → 2026-08-06 suppressed from those answers on the owner's instruction;
that instruction was revoked on 2026-08-06.)

---

## Stripe Tax vs. doing it by hand (decided 2026-08-06)

**Use Stripe Tax.** The question asked was whether the VAT could be computed
in-house to avoid the fee. It can, but not for the reason of cost, and the manual
route is worse here:

- **The fee is tiny at this price point.** Stripe Tax Basic is **0.5% per
  transaction**, no monthly fee, charged on the initial invoice *and every
  renewal*, and charged even when the calculated tax is zero (so reverse-charge
  B2B costs it too). On €5.90 that is ~€0.03 — about €3/month per 100 monthly
  subscribers. Fees only apply in jurisdictions with an active registration.
  Basic does **not** file: the OSS return stays ours. (The plan that files is Tax
  Complete, from CHF 80/month — far past what this revenue justifies.)
- **Payment Links cannot use manual tax rates.** Their only tax options are
  `automatic_tax` (Stripe Tax) or Managed Payments, which is the
  Merchant-of-Record model already rejected. Tax Rate objects attach only to
  API-created Checkout Sessions — and even there they don't fit, because the rate
  depends on a country the buyer types *during* checkout.
- **So the manual route is "no tax line at all"** — which works, because prices
  are inclusive: charge €5.90, then back the VAT out per country each quarter
  (Italy 22% → €4.84 net + €1.06 VAT; margin varies by member state). Nothing in
  checkout changes. What it costs is ours to build and maintain: a rate table, a
  per-country quarterly report over Stripe data, a documented rule for when the
  billing country and the card issuer country disagree, and manual VAT invoices
  with reverse-charge wording for what may be a majority-B2B book.
- `tax_id_collection` and VIES validation are **not** gated on Stripe Tax — they
  are Checkout/Billing features (`customer.tax_id.updated` fires with the VIES
  result), so a manual route could still collect and validate VAT numbers for
  free. What it would lose is automatic zero-rating and, more importantly, the
  invoice that states it.

Revisit at scale: at ~10,000 subscribers the fee is ~€350/month and writing the
reporting script starts to pay for itself.

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

**The work is the twelve-step runbook in "→ Resume here" above — that is the list,
don't restate it here.** OSS registration is no longer outside that list — it is
step 1, done by the owner personally, and it gets named in every status answer
until the owner says it is finished. One standing item:

- ~~Verify unsubscribe → cancel~~ — done 2026-08-05 on staging. ~~Redeploy both
  Workers~~ — both shipped 2026-08-05 with the `resource_missing` fix.

And the reasoning behind runbook step 11, which is worth not re-litigating:

- **Merge to `master` — this is the launch, and it happens LAST** (decided
  2026-08-05). It was listed as independent of the rest because the placeholder
  guard makes the pages safe to ship unsold; that is true but beside the point.
  The subscription pages, the newsletter ads in all three slots and the footer
  link would announce a product to real visitors weeks before it can take a
  payment, so `master` stays where it is until live mode works end to end.
  Staging is green, so when the time comes it is the same tested export going to
  GitHub Pages — no extra risk from the wait.

  ~~Re-checked 2026-08-06: `data/` is still **identical** on `master` and `dev`
  (90 bandi each)~~ — **stale as of 2026-08-07.** `master` has since taken
  `366c8bf` and `789a2ec`, both "Update data.json", directly. Holding `master`
  back is not accumulating a newsletter batch (the crawler's commits deploy and
  mail from `master` as they land), but `dev` is now the *older* copy of
  `data/data.json`. See step 11 — the merge must not resolve that file in `dev`'s
  favour.

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
  new prices and re-issued Payment Links. Open only against runbook step 3: with
  inclusive pricing a reverse-charge business customer pays the same €5.90 as a
  consumer, and we keep the VAT difference rather than passing it on.
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

- **The Stripe CLI's live key on this machine is read-only.** `stripe login`
  stored a restricted key (`rk_live_…`, key `mk_1U06EgGZN5xaIveHwCWo4fR1`,
  expires **2026-10-31**) that can read products, prices, payment links and tax
  settings but **cannot write any of them** — writes fail with
  `more_permissions_required` naming `product_write` / `feature_write` /
  `plan_write`. So live-mode changes go through the Dashboard unless those scopes
  are granted deliberately. Reads are fine and are the right way to *verify* what
  the Dashboard actually saved.
- **`stripe <resource> list 2>&1 | python3 -` breaks**: the CLI writes a notice to
  stderr, and merging it corrupts the JSON. Use `2>/dev/null` when piping, and
  `2>&1` only when you want to read an error body.
- **Three different `whsec_…` values** exist: `stripe listen` (local), the test
  dashboard endpoint, the live dashboard endpoint. Mixing them up fails every
  signature check with a confusing error. A fourth, unrelated secret belongs to
  the MailerLite webhook.
- **`wrangler secret put` is separate from `wrangler deploy`** — but it
  republishes the Worker itself, so setting a secret needs no redeploy after it.
  A deployed but unconfigured Worker is still a normal state to end up in.
- **`printf '%s' "$VAR" | wrangler secret put NAME` uploads an *empty secret* if
  `$VAR` is unset** — no warning, exit 0, and `secret list` still shows the name.
  Hit for real on 2026-08-07: both live Stripe secrets went up empty because the
  runbook's `$LIVE_SECRET_KEY` / `$LIVE_WHSEC` were placeholder names, not set
  variables. It is *worse* than not running the command, because it replaced
  working test keys with nothing and every route began 500ing. Always guard:
  `[ -n "$VAR" ] && printf '%s' "$VAR" | npx wrangler secret put NAME || echo EMPTY`.
- **`wrangler secret put` is not atomic across colos.** For a minute or two after
  upload, some requests hit the old Worker version and some the new — observed
  2026-08-07, where consecutive probes returned "missing both", "missing one" and
  "fully configured" within seconds, converging to 15/15 correct after ~90s. Two
  consequences: a single probe straight after a `secret put` proves nothing, and
  **if a real webhook fails right after a secret change, re-deliver it from the
  Stripe Dashboard before debugging anything** — it may have landed on a stale
  version. Let the Worker settle before step 12.
- **Probe the deployed Worker instead of trusting `secret list`:**
  `curl -sS -X POST https://bandincc-stripe.bandincc.workers.dev -d '{}'`.
  The `REQUIRED` check in `src/index.ts` runs before anything else and answers
  `500 Worker misconfigured: missing <NAMES>` when a binding is absent *or
  empty*; a configured Worker gets past it and fails signature verification with
  a 400 instead. No Stripe call, no MailerLite call, no side effects — safe to run
  against live.
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
