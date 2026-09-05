# Roadmap — decisions of 2026-09-05

Meeting: Can + Davide. Supersedes the "Where we are" numbers in `todo.md`.

**State at the meeting** (live Stripe): 30 active subscriptions (18 monthly,
12 annual), MRR €165.20, €820 collected since 8 Aug, 0 churn yet — first
monthly renewals 9–10 Sept. Growth came from the locked rows, shipped ~23 Aug.

---

## Decided

### Doing now

- **EU OSS VAT.** 0 tax registrations, `automatic_tax` false on all 31
  subscriptions. Fix before the 9–10 Sept renewals. Can. → `stripe-worker/STATUS.md` step 1
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
- **Subscriber questionnaire.** A mayor contacted us directly — ask him and all
  subscribers, plus everyone who has emailed us, what they need. Davide writes,
  Can sends.
- **Lead generation — affiliate links only.** Order of effort: move the Keliweb
  PEC link into "come partecipare", bid detail pages and the alert email → an
  "assicurazione NCC" page → CAP/CQC course providers → leasing. Links need only
  disclosure; **lead forms** transfer personal data (consent + privacy policy +
  art. 28 processor) — build those only if link revenue proves demand. Davide
  researches monetisation and configures the Keliweb login.
- **Bandi predictor.** A year of data is enough to try predicting which comune
  announces when; sell monthly/yearly. Can researches the AI side.
- **Book.** Wait for Amazon until 21 Sept; if it stays delisted, publish as our
  own ebook — better cut, no marketplace AI policy. No content improvements for now.
- **Research assignments (Davide):** company location for tax (Estonia /
  Romania / Georgia / Bulgaria vs Italy), company shape (Stiftung?) and the
  founder contract Can↔Davide, other bandi verticals, Germany market.

### Not doing

- **Paid ads.** Conversion is 0.5–1%, so ads pay if a paying customer costs
  under €5.90 — but a marketing push needs real capital. Improve other things
  first, revisit later.

### Deferred, with a trigger

| Item | Revisit when |
|---|---|
| **Marketplace** — realistic now given a loyal paying base; still a must-do | after Germany |
| **Free mailing list** — 7-day-old bandi to harvest emails from 16k visitors | when paid newsletter growth stalls |
| **Pratica assistita** (€49–99 per-bando document pack) | after we have applied ourselves and gained real experience |
| **Other bandi verticals** | after 3 months of renewal data |
| **Managing websites/deployment for comuni** — technical know-how yes, experience no; fake it till we make it | opportunistic: keep watching comuni with bad or missing sites |

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
