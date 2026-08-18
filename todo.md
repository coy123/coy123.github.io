# BandiNCC — TODO

Last updated: 2026-08-18

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

- [ ] **Add `detectedAt` (ISO date) to `data/data.json`.** Set by the colleague
      at review time, alongside the existing fields.
- [ ] **Backfill `detectedAt` for the existing 95 rows** from git history (each
      row's first-seen commit date — script already written, see conversation).
- [ ] **`lib/embargo.ts`** — one shared helper holding the rule (age in days →
      locked/unlocked). Single source of truth.
- [ ] **Filter at build time in `lib/data.ts`.** Locked rows must ship **only**
      region, licence count and unlock date. Comune name, deadline and URL must
      not be in the HTML at all.
- [ ] **Locked row UI in `components/Table.tsx`** — countdown + CTA to
      `/abbonamento`. Decide map behaviour too (`components/MapView.tsx`).
- [ ] **Nightly rebuild.** `output: 'export'` means the embargo only advances on
      a build. Without a scheduled rebuild a locked row stays locked forever
      until someone pushes. Add `schedule:` to `deploy.yml`.
- [ ] **Check the `newsletter.yml` interaction.** It chains off `deploy.yml` via
      `workflow_run`, so a nightly build will fire it with nothing new and move
      the `newsletter-sent` tag on days nobody touched the data. Harmless in
      principle, but guard it — CLAUDE.md warns against casual tag movement.
- [ ] **Mirror the embargo in `cypress/support/site.ts`.** It imports the real
      `data.json`, so table/map/home specs go red the moment rows change shape.
      Use a strict inequality on the boundary so a row sitting exactly on 7 days
      cannot flip between the build step and the test step.
- [ ] **Copy for the locked state** in `locales/it.json`.

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
