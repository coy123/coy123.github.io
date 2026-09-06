# Roadmap

Decisions of the Can + Davide meeting of **2026-09-05**, merged with the
surviving items of `todo.md` on **2026-09-06**. `todo.md` is gone: everything
from it that was still open is below, everything that had shipped was dropped.
The stale `bandincc-crawler/coy123.github.io/todo.md` is history only — do not
edit it (see `CLAUDE.md` → Autonomy).

**State at the meeting** (live Stripe): 30 active subscriptions (18 monthly,
12 annual), MRR €165.20, €820 collected since 8 Aug, 0 churn yet — first
monthly renewals 9–10 Sept. Growth came from the locked rows, shipped ~23 Aug.

---

## ⚠️ Urgent — Stripe VAT

The OSS registration came through on 2026-08-18, but **Stripe has not been
told**: 0 tax registrations, and `automatic_tax` is `false` on both live
Payment Links *and* on all 31 live subscriptions. We are registered for VAT and
collecting none, silently. **The 9–10 September renewals are the deadline.**
Four ordered actions in `stripe-worker/STATUS.md` → step 1, "→ On the OSS grant".

---

## Decided

### Doing now

- **EU OSS VAT.** As above. Can. → `stripe-worker/STATUS.md` step 1
- **Germany.** Go. German municipalities switch licence availability on and off,
  so the product is a **traffic-light** one: table green / yellow (waiting list)
  / red, plus a map with traffic lights, plus an alert when a city turns
  licences on. Order: Can automates discovery → Can builds the site → Davide +
  wife take marketing at launch. Davide does law/market research first — the
  premise currently rests on one person's suggestion.
- **banditaxi.it.** Separate site, white background (taxi are white, NCC black).
  *Note: the standing recommendation was to merge taxi into BandiNCC — same law
  (L. 21/1992), same buyer, and it would fix the thin-supply churn risk. A
  separate site was chosen instead; revisit if the two lists overlap in practice.*
- **Regional/provincial filter tab.** Per-province table + zoomed map. Can.
- **Paid tooling, €10–20/month.** Three problems, one budget: MailerLite's "sent
  by" banner (looks cheap to paying customers), the public GitHub repo (public
  `data.json` makes the 7-day embargo bypassable in theory), and free GitHub
  Pages (cannot host Germany as a separate site in the same deployment
  environment). Davide approved, Can executes.
  - On the repo specifically: `coy123.github.io` is public because free GitHub
    Pages *user* sites must be, so `data/data.json` and its full history are
    readable by anyone who finds it. Options: move the source to a private repo
    that pushes only `out/` to the public Pages repo, or move hosting. Note that
    closing this also breaks the welcome email's `raw.githubusercontent` fetch —
    see `CLAUDE.md` → "The welcome email".
- **Subscriber questionnaire.** A mayor contacted us directly — ask him and all
  subscribers, plus everyone who has emailed us, what they need. Davide writes,
  Can sends.
- **Lead generation — affiliate links only.** Order of effort: move the Keliweb
  PEC link out of the homepage SEO section and into "come partecipare", bid
  detail pages and the alert email → an "assicurazione NCC" page → CAP/CQC
  course providers → leasing. Links need only disclosure; **lead forms**
  transfer personal data (consent + privacy policy + art. 28 processor) — build
  those only if link revenue proves demand. Davide researches monetisation and
  configures the Keliweb login.
- **Bandi predictor.** A year of data is enough to try predicting which comune
  announces when; sell monthly/yearly. Can researches the AI side.
- **Book.** Wait for Amazon until 21 Sept; if it stays delisted, publish as our
  own ebook — see "Sell the book as a PDF" below. No content improvements for now.
- **Research assignments (Davide):** company location for tax (Estonia /
  Romania / Georgia / Bulgaria vs Italy), company shape (Stiftung?) and the
  founder contract Can↔Davide, other bandi verticals, Germany market.

### Not doing

- **Paid ads.** Conversion is 0.5–1%, so ads pay if a paying customer costs
  under €5.90 — but a marketing push needs real capital. Improve other things
  first, revisit later.
- **Google AdSense.** Repeatedly rejected as "low value content", and the CPM on
  a small Italian niche site was never going to be worth it. The subscription is
  the monetisation path; the old AdSense checklist is closed.

### Deferred, with a trigger

| Item | Revisit when |
|---|---|
| **Lead the annual plan on `/abbonamento`** — ~11 bandi/month nationally is thin as a monthly habit but a strong annual purchase framed as insurance (median window 18 days, 10% land with ≤7 days left): "€59 so you don't miss the one that matters". Reframe the annual note from discount to coverage, put the runway numbers in the copy, and consider de-emphasising monthly — against the deliberate comment at `app/abbonamento/page.tsx:126`, which keeps monthly first on purpose. The risk is real: someone clicking a locked row wants *this* bando now, and leading with €59 could cut conversions even while raising LTV | **end of September 2026** — the first monthly renewals fall on 9–10 Sept, so the cancellation numbers are the deciding evidence |
| **Marketplace** — realistic now given a loyal paying base; still a must-do | after Germany |
| **Free mailing list** — 7-day-old bandi to harvest emails from 16k visitors. Captures everyone who clicks a lock but will not pay yet; infrastructure is mostly there (MailerLite + the Worker), and `/grazie/` already owes a re-subscribe form | when paid newsletter growth stalls |
| **Pratica assistita** (€49–99 per-bando document pack) | after we have applied ourselves and gained real experience |
| **Other bandi verticals** | after 3 months of renewal data |
| **Managing websites/deployment for comuni** — technical know-how yes, experience no; fake it till we make it | opportunistic: keep watching comuni with bad or missing sites |

---

## Sell the book as a PDF, direct from the site

Amazon delisted the book as AI-generated after it had already sold copies.
Decision: **stop renting a shopfront and sell the PDF ourselves.** No commission,
no marketplace AI policy to be judged by, and it becomes a second product next
to the newsletter for an audience that is already exactly the buyer. Worth one
email to KDP first — their policy separates *AI-assisted* (allowed, disclosable)
from *AI-generated* (not) — but the appeal is not the plan, this is. Re-listing
on Kobo / Google Play / Apple would face the same policy, so those are out for
the same reason.

Most of the infrastructure exists: the Stripe account, the `bandincc-stripe`
Worker with a `checkout.session.completed` handler, and the OSS registration.
What is missing is file hosting and the delivery branch.

- [ ] **Settle VAT before taking a single euro.** We are already registered and
      collecting nothing (see the urgent section) — a second product makes that
      worse, not neutral. E-books get Italy's reduced rate, generally
      conditional on an ISBN; the PDF has none today. Question for the
      commercialista: reduced rate or standard 22%, and does selling direct
      change the answer.
- [ ] **One-time Stripe Payment Link** for the book, live + test, both URLs in
      `locales/it.json` alongside the subscription links so `stripeHref()` and
      the placeholder guard cover it the same way.
- [ ] **R2 bucket, private**, holding the PDF. Bind it to the Worker. No public
      URL — the Worker is the only thing that can hand out access.
- [ ] **Delivery branch in the Worker.** Branch on the price ID: subscription →
      existing MailerLite group; book → email a signed, time-limited download
      link (24h). Both modes, so `bandincc-stripe-test` needs the binding and
      the secrets too — named environments inherit nothing.
- [ ] **Stamp the buyer's email into the PDF footer** on generation. Stops
      casual resharing; nothing stronger is worth the effort.
- [ ] **A page to sell it from.** Own route (`/libro/`?) plus a CTA on
      `/how-to-become-driver/` — that page is the closest match to the book's
      subject and already takes 373 visitors a month.
- [ ] **`/grazie/` handles two purchase types.** It is the redirect target for
      both Payment Links and currently only talks about the newsletter. Static
      export cannot read the Stripe session, so either a second thank-you route
      or copy that covers both cases.
- [ ] **Cypress cover** for the new links, mirroring `subscription.cy.ts`:
      placeholder state now, live contract the moment real URLs land.

**Notes.** Payhip or Lemon Squeezy as a second shopfront costs nothing and
handles VAT as merchant of record — worth adding once the direct route works,
not instead of it. StreetLib / Youcanprint (both Italian) would put it on
laFeltrinelli, IBS and Mondadori Store: reach, not margin, so revisit if direct
sales are thin. The three `NewsletterAd` slots are the obvious cross-sell
surface; a book variant is a small change to a component that already exists.

---

## Reference — other bandi verticals

Pattern: a small operator needs a scarce, municipally-granted authorisation;
the comune publishes a bando with a short deadline on its own site; missing it
costs a year. Ranked by: does the comune publish it (does our crawler already
see it), how often, will the audience pay.

| Vertical | What it is | Publisher | Volume | Verdict |
|---|---|---|---|---|
| Taxi | Municipal taxi licences, same law as NCC | Comune ✅ | High | Doing it (as a separate site) |
| Posteggi ambulanti / mercati | Market and fair pitches, reassigned on multi-year cycles | Comune ✅ | High | Best standalone candidate |
| Concessioni balneari | Beach concessions, Bolkestein tendering | Comune ✅ | Low, unpredictable | High value, bad timing |
| Farmacie | Pharmacy licences (`sedi farmaceutiche`) | **Region** ❌ | Very low | Wrong publisher, wrong cadence |
| Edicole | Newsstand authorisations | Comune ✅ | Moderate | Dying trade, won't pay |
| Concorsi pubblici comunali | Municipal jobs | Comune + INPA ✅ | Enormous | Crowded, no differentiation |
| Alloggi ERP | Public housing | Comune ✅ | High | Audience cannot pay |

The crawler is not an NCC tool — it is an Italian municipal-notice monitor over
~7,900 homepages. NCC is one keyword file on top of it, so a second vertical is
a keyword set plus a copy of the site.

**Farmacie**: pharmacies are *numerus clausus* (capped by population quota), so a
sede is worth hundreds of thousands and a pharmacist would pay far more than
€5.90. But the concorsi are run by **regions**, not comuni — a new crawler, not a
new keyword — and happen every few years, so there is nothing to subscribe to in
between. High value, wrong shape.

---

## Shipped — locked rows (~23 Aug)

The whole plan is built and live; the checklist is deleted. What is worth
keeping is why it worked and what is still tunable.

Before it shipped, 91% of 16,600 monthly visitors hit the homepage and only 124
(0.75%) ever reached `/abbonamento` — but 1.6% of those who did subscribed. The
offer converted; almost nobody saw it. A locked row is a CTA at the exact moment
of demand, on the homepage, and it removes the substitute behaviour: checking
the site every 2-3 days used to be strictly better than paying, and now it
proves there is something you are missing. 2 subscribers → 30.

Data behind the numbers (measured 2026-08, from `data/data.json` + git history):
new bandi ~11/month; **median runway 18 days** to deadline when a bando lands;
35% arrive with ≤14 days left, 10% with ≤7. The large expired archive stays
free — 10 months of history is what makes the site credible.

Still open, both one-line changes:

- **7 days is a starting number, not a fixed one.** On an 18-day median it
  removes ~39% of the free window, and for the 10% arriving with ≤7 days the
  free user sees them after the deadline. Watch for complaints; **5 days is the
  fallback**.
- **Embargoed detail pages carry `robots: noindex, nofollow`** and stay out of
  the sitemap, reversing the original decision — indexing them would let Google
  surface exactly what the embargo holds back. Flip it by deleting one line in
  `app/bandi/[bid]/page.tsx` if the SEO argument ever wins.

Mechanics of the rule itself are documented in `CLAUDE.md` → "The seven-day
release delay"; do not re-derive them here.

---

## TODO

| Description | Deadline | Who |
|---|---|---|
| EU OSS VAT | 08.09.2026 | Can |
| Update finance Google Sheet | 08.09.2026 | Can |
| Germany: automation start | 20.09.2026 | Can |
| Research + implement paid service improvements (MailerLite, GitHub, hosting) | 20.09.2026 | Can |
| Questionnaire | 30.09.2026 | Davide |
| Germany law/market research | 30.09.2026 | Davide |
| Research company location country for tax | 30.09.2026 | Davide |
| Research company shape + founder contract | 30.09.2026 | Davide |
| Research other bandi | 30.09.2026 | Davide |
| Market research on affiliate business and monetisation | 30.09.2026 | Davide |
| Configure Keliweb login | 30.09.2026 | Davide |
| Implement regional filter tab | 30.09.2026 | Can |
| Research bandi predictor | 30.10.2026 | Can |
| Implement banditaxi.it | 30.10.2026 | Can |
| Review and correct banditaxi.it | when Can's first version is ready | Davide |
| Book: Amazon decision → self-publish if delisted | 21.09.2026 | Can + Davide |

Davide starts BandiNCC work on **21.09.2026** (after the wedding).
