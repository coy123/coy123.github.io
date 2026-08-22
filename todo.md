# BandiNCC — TODO

Last updated: 2026-08-19

Supersedes `bandincc-crawler/coy123.github.io/todo.md` (stale AdSense-era notes;
left in place as history, do not edit — see `CLAUDE.md` → Autonomy).

---

## ⚠️ Unrelated but urgent — Stripe VAT

The OSS registration came through on 2026-08-18, but **Stripe has not been told**:
0 tax registrations, and `automatic_tax` is `false` on both live Payment Links
*and* on both live subscriptions. We are registered for VAT and collecting none,
silently. **The 9/10 September renewals are the deadline.** Four ordered actions
in `stripe-worker/STATUS.md` → step 1, "→ On the OSS grant".

---

## Where we are

The paid newsletter launched and got **2 subscribers**. The diagnosis from the
Umami numbers is that this is a funnel problem, not a pricing or product problem.

**Traffic (last 30 days):**

| | |
|---|---|
| Visitors | 16,600 |
| → homepage | 15,100 (91%) |
| → `/abbonamento` | **124 (0.75%)** |
| → subscribed | 2 (1.6% of those who saw the offer) |
| how-to-become-driver / income-calculator / utilities / regional-laws | 373 / 297 / 238 / 195 |
| top single bando page | 951 |

**Data (measured from `data/data.json` + git history):**

| | |
|---|---|
| Bandi total / active / expired | 95 / 9 / 86 |
| New bandi since 2026-05-01 | 40 (~11/month, ~2.7/week) |
| Median runway when a bando lands on the site | **18 days** to deadline |
| Arrive with ≤14 days left | 35% |
| Arrive with ≤7 days left | 10% |

**What this means.** The audience is a *returning homepage audience* — they have
learned we publish bandi as soon as we find them, and they check the table.
That habit is a direct substitute for the newsletter: checking the site every
2-3 days is currently strictly better than paying. The offer converts fine
(1.6%) once someone sees it; almost nobody sees it. Both problems have the same
fix.

The large expired archive is normal and stays free — 10 months of history is a
good database to have and it is what makes the site credible.

---

## The plan: locked rows on the homepage

Fresh bandi stay at the top of the table, **visible but locked**, until they are
7 days old:

> 🔒 **Nuovo bando — Lombardia, 3 licenze** · si sblocca tra 6 giorni · *[Sbloccalo ora →]*

Not hidden. Locked, with a countdown. This does two things at once:

- **Puts the offer in front of 15,100 people instead of 124.** A locked row is a
  CTA at the exact moment of demand, on 91% of our traffic. Moving 0.75% → 5% is
  roughly a 6× on subscribers with no other change.
- **Removes the substitute behaviour.** Checking the site now *proves* there is
  something you are missing, and we find a new bando every 2-3 days, so the
  reminder fires constantly.

It stays honest: the data still arrives, just later, and the whole archive is
free.

### Tasks

- [x] **Add `detectedat` (ISO instant) to `data/data.json`.** Done — lowercase
      key, Rome midnight serialised as UTC (`2026-07-31T22:00:00.000Z`).
- [x] **Backfill `detectedat` for the existing rows.** Done: 95 rows on
      2026-08-01, the two newest on 2026-08-22.
- [x] **`lib/embargo.ts`** — the shared rule: `RELEASE_DELAY_DAYS`,
      `releaseCutoff()`, `isPublished()`, `detectionDay()`,
      `daysUntilRelease()`. Imports nothing, so the Cypress specs use the real
      thing rather than a copy. Days are **Italian calendar days**, not UTC —
      slicing the stored instant would release everything a day early.
- [x] **Filter at build time in `lib/data.ts`** — `publishedBids`,
      `embargoedBids`, `embargoedCount`, `nextReleaseInDays`. Locked rows ship
      **nothing at all** about the bando: not the comune, not the region, not
      the licence count. Only the count of held rows and the days until the
      next release cross over.
- [x] **Locked row UI** — `components/LockedRows.tsx`, blurred empty skeleton
      at the top of the table, one CTA card over it (count + countdown +
      `/abbonamento`). Hidden while a search is running. The map gets a
      one-line note instead: a pin with no location is just a pin in the sea.
- [x] **Nightly rebuild** — `schedule: '0 5 * * *'` on `deploy.yml` (07:00
      Italian summer time).
- [x] **Checked the `newsletter.yml` interaction.** Harmless: a nightly build
      with no data change makes `send-newsletter.mjs` exit on "No new bandi",
      which is exactly the path that is allowed to advance `newsletter-sent`.
      It only ever moves to a commit whose rows are all accounted for.
- [x] **Mirror the embargo in `cypress/support/site.ts`** — `bids` is now the
      published set, `allBids` everything, `embargoedBids` what is held. Rather
      than a strict inequality on the boundary, `nearCutoff` names the rows a
      build/test pair either side of Rome midnight could disagree about, and
      the count assertion widens by exactly that many.
- [x] **Copy for the locked state** in `locales/it.json` (`dashboard.locked`),
      plus every claim that contradicted the delay: the home h1 and meta
      descriptions ("Aggiornati Ogni Giorno"), the Dataset JSON-LD ("raccolta
      completa"), the home description and "Come Usare Questa Piattaforma",
      Chi Siamo, `newsletterAd`, `/abbonamento`, `/grazie`, and a new FAQ entry
      ("Perché alcuni bandi nella tabella sono coperti?").
- [x] **`cypress/e2e/embargo.cy.ts`** — proves the leak-proofing: no embargoed
      location, URL, slug or crest in the exported HTML or in `sitemap.xml`.

**One decision below was reversed in the build:** detail pages for embargoed
bandi are built and reachable (the newsletter links to them on day 0) but carry
`robots: noindex, nofollow` until release, and are kept out of `sitemap.xml`.
Indexing them would let Google surface exactly what the embargo is holding
back. Flip it by deleting one line in `app/bandi/[bid]/page.tsx` if the SEO
argument wins.

### Notes / decisions made

- **Build-time filtering, not client-side.** Client-side filtering ships all 95
  rows in the page source and is defeated by View Source. With static export the
  build-time version is free, so there is no reason to take the weak one.
- **Detail pages stay live and indexed.** The newsletter links to
  `/bandi/<slug>/`, and those pages get almost no traffic anyway, so keeping
  them public costs nothing.
- **SEO risk is low.** The homepage ranks for generic "bandi ncc" queries and
  stays indexed regardless; we are not ranking on individual bandi.
- **7 days is the starting number**, not a fixed one. On an 18-day median runway
  it removes ~39% of the free window, and for the 10% that arrive with ≤7 days
  the free user sees them after the deadline. Watch for complaints; 5 days is
  the fallback.

---

## Also worth doing

- [ ] **Lead the annual plan on `/abbonamento`.** ~11 bandi/month nationally is
      thin as a monthly habit but a strong annual purchase framed as insurance:
      median window 18 days, 10% land with ≤7 days left. "€59 so you don't miss
      the one that matters." De-emphasise monthly — it will churn right after
      the first alert.
- [ ] **Region at signup.** A driver in Sicilia does not care about Piemonte.
      Makes every email relevant and the price feel targeted rather than a
      national firehose.

---

## Sell the book as a PDF, direct from the site

Amazon delisted the book as AI-generated after it had already sold copies.
Decision: **stop renting a shopfront and sell the PDF ourselves.** No commission,
no marketplace AI policy to be judged by, and it becomes a second product next
to the newsletter for an audience that is already exactly the buyer.

Worth one email to KDP first — their policy separates *AI-assisted* (allowed,
disclosable) from *AI-generated* (not) — but the appeal is not the plan, this
is. Re-listing on Kobo / Google Play / Apple would face the same policy, so
those are out for the same reason.

The infrastructure is nearly all in place: Stripe account, the
`bandincc-stripe` Worker with a `checkout.session.completed` handler, and the
OSS registration. What is missing is file hosting and the delivery branch.

### Tasks

- [ ] **Settle VAT before taking a single euro.** We are already registered and
      collecting nothing (see the urgent section at the top) — a second product
      makes that worse, not neutral. E-books get Italy's reduced rate, generally
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

### Notes

- **Payhip or Lemon Squeezy as a second shopfront** costs nothing and handles
  VAT as merchant of record. Worth adding once the direct route works, not
  instead of it.
- **StreetLib / Youcanprint** (both Italian) would put it on laFeltrinelli, IBS
  and Mondadori Store. Reach, not margin — revisit if direct sales are thin.
- **The newsletter ad slots are the obvious cross-sell surface.** Three live
  slots all carry `NewsletterAd` today; a book variant is a small change to a
  component that already exists.

---

## Ideas — to discuss later, not decided

- **Free email tier as the middle rung.** "Sblocca subito via email" → free
  weekly digest carrying the same 7-day delay; paid gets it the day we find it.
  Captures the address of everyone who clicks a lock but will not pay yet, and
  gives us a warm list to sell to instead of cold visitors. Infrastructure is
  mostly there already (MailerLite + the Cloudflare Worker); a re-subscribe form
  is already owed by `/grazie/` anyway. **Discuss before building.**
- **The repo is still public.** `coy123.github.io` is public because free
  GitHub Pages user sites must be, so `data/data.json` and its full history are
  readable by anyone who finds the repo. Build-time filtering fixes the View
  Source problem but not this one. Options to weigh later: move the source to a
  private repo that pushes only `out/` to the public Pages repo, or move hosting.
  Not urgent — the repo is not named after the site — but it needs a decision.
- **Other monetisation**, if the newsletter alone proves too thin: PEC is
  mandatory to submit an application and we already hold the Keliweb affiliate
  link, but it is buried in a homepage SEO section instead of sitting in "come
  partecipare". CAP/KB course providers and NCC vehicle leasing/insurance pay
  for leads like ours.
- **Blog / news section** — the biggest gap flagged by the old AdSense review.
  Still unresolved: how realistic is it to write regularly?
- **Expand the regional-laws page** — currently just links to PDFs. A 2-3
  sentence summary per region would make it a real page.

---

## Dropped

- **Google AdSense.** Repeatedly rejected as "low value content", and the CPM on
  a small Italian niche site was never going to be worth it. The subscription is
  the monetisation path. The old todo's AdSense checklist is closed.
