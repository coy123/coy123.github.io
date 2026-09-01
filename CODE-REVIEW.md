# Code review — 2026-09-01

A full read of the repository (everything except `bandincc-crawler/`), done in one
pass by a review agent and then spot-verified by hand. **Nothing here is fixed
except finding 1**, which was repaired the same day; the rest is a backlog.

Each finding says whether it was **verified** (reproduced independently, command
included where it is short) or **reported** (the agent's reading, not separately
reproduced). Do not act on a *reported* finding without checking it first.

Findings are ordered by consequence, not by effort.

---

## 1. `releaseCutoff()` leaked an embargoed bando across DST — FIXED 2026-09-01

**Verified.** `lib/embargo.ts:105`

The cutoff was computed by subtracting `RELEASE_DELAY_DAYS * DAY_MS` from the
current instant and reading the Rome calendar day off the result. The week
containing an Italian DST change is 169 hours long (October) or 167 (March), so
168 hours is not seven calendar days across one.

A build at 23:30 Rome on 2026-10-30 produced a cutoff of `2026-10-24` where the
calendar says `2026-10-23`. A bando detected on the 24th then satisfied
`detectedAt <= cutoff` on **day six**, putting its comune, URL, crest and
deadline into the public export a day before subscribers stopped having it to
themselves. A scan of every half hour of 2026 found 28 disagreements, 14 of them
in that fail-open direction, all in the 23:00 hour during the week after the
October change — roughly seven hours a year. The 05:00 UTC cron never lands in
it; a hand push at night can, and `data/data.json` is pushed by hand.

The March transition failed the safe way but drove `daysUntilRelease()` to 0,
against the ">= 1" promise in its own comment — masked only because
`LockedRows.tsx` branches on `<= 1`.

**Fixed** by counting in calendar days like the rest of the file:
`dayString(dayNumber(currentDay(at)) - RELEASE_DELAY_DAYS)`. Re-scanning 2026
gives 0 mismatches and no `daysUntilRelease` below 1. `cypress/e2e/embargo-rule.cy.ts`
was added at the same time and covers both transitions.

The same call is in `stripe-worker/src/welcome.ts:111`, where the mirror-image
case dropped a bando out of the welcome email a subscriber had just paid for.
**That file imports the fixed `lib/embargo.ts`, so it is fixed too — but the
Worker must be redeployed for the fix to take effect.**

---

## 2. The release delay has no effective test coverage

**Verified.** `cypress/e2e/embargo.cy.ts`, `cypress/support/site.ts:100`

Every meaningful assertion in `embargo.cy.ts` is written `if (!embargoedBids.length) return`,
because it checks the live `data/data.json`. All 99 rows currently have
`detectedat <= 2026-08-22`, so **`embargoedBids` is empty and the HTML-leak
check, the sitemap check and all seven locked-row tests self-skip.** On a normal
CI run today the paywall is guarded by three assertions that reduce to "nothing
is expired-and-hidden". Finding 1 shipped green through all of it.

`cypress/README.md` documents the skipping as deliberate, and it is — the
consequence is what nobody had noticed.

`embargo.cy.ts:51` also uses a raw-millisecond age with a `+ 1` fudge
(`age > RELEASE_DELAY_DAYS + 1`), which by construction cannot detect a one-day
cutoff error.

**Partly addressed:** `cypress/e2e/embargo-rule.cy.ts` now exercises the rule
against fixed dates with no dataset. The dataset-driven half is still vacuous
whenever nothing is embargoed. Worth considering a fixture-backed run of
`embargo.cy.ts` so the leak checks always execute.

---

## 3. `public/sitemap.xml` — two hard 404s, 60 missing pages, 49 redirects

**Verified.**

```
loc entries:                 50
/bandi/ entries:             39      (data.json has 99, all published)
entries without a trailing slash: 49  (next.config.mjs sets trailingSlash: true)
```

- `sitemap.xml:74` → `/bandi/Comune-di-Forl%C3%AC-(FC)`. `toSlug()` folds the
  diacritic; the built directory is `Comune-di-Forli-(FC)`. Confirmed against
  `out/bandi/`. **Hard 404.**
- `sitemap.xml:119` → `/bandi/Comune-di-Calto-(RO,-Veneto)`. `toSlug()` maps the
  comma to a separator; the built directory is `Comune-di-Calto-(RO-Veneto)`.
  **Hard 404.**
- **60 published detail pages are not in the sitemap at all** — the entire
  long-tail SEO surface.
- 49 of 50 `<loc>` values are 301s before they resolve.

The file is hand-maintained, which is the root cause. Generating it at build
time from `publishedBids` + `ROUTES` removes the whole class — and note the
constraint that makes that non-trivial: **an embargoed slug must never enter the
sitemap** (`embargo.cy.ts:102`), so the generator has to read the published set,
not `bids`.

Nothing in the suite asserts that every published slug is present or that every
`<loc>` resolves. Worth adding alongside the generator.

---

## 4. The site-wide description still promises what the paywall removed

**Verified.** `app/layout.tsx:15`, `app/layout.tsx:79`, `public/site.webmanifest:4`

All three still read *"Tutti i bandi NCC in Italia aggiornati ogni giorno."*
`app/page.tsx:17` carries a comment explaining precisely why that wording must
not be used any more, and the home page's own description was rewritten — the
layout was missed.

Line 79 is the `WebSite` JSON-LD, emitted on **every one of the ~110 exported
pages**. So the claim that `/abbonamento` charges €5.90/month to correct is what
search engines read site-wide, and what the manifest shows on an installed PWA.

`routes.cy.ts` asserts per-page `<meta name="description">` values and never
looks at the layout default or the JSON-LD, so nothing catches it.

Replace all three with the `/` wording ("I bandi appena verificati arrivano
prima agli abbonati").

---

## 5. `npm run lint` does not work, and nothing lints in CI

**Verified.** `package.json:11`

No `.eslintrc*` and no `eslint.config.*` exists anywhere in the repo, so
`next lint` (deprecated in Next 15) drops into an interactive "How would you
like to configure ESLint?" prompt and never returns. CLAUDE.md lists it under
"Bash Commands" as a working command; no workflow calls it.

Either migrate to a flat `eslint.config.mjs` with `eslint-config-next` and wire
it into `e2e.yml`, or delete the script and the CLAUDE.md line so nobody trusts
it. Do not leave it as-is — it is a command that appears to exist and hangs.

---

## 6. `scripts/send-newsletter.mjs` re-mails a bando when a typo is fixed

**Verified.** `scripts/send-newsletter.mjs:59`

```js
const key = (b) => `${b.location}|${b.deadline}`
```

The header comment justifies deadline changes counting as new bandi. It does not
consider location edits. `cypress/README.md` names four rows a maintainer is
likely to tidy — `Comunne di Reggio Emilia (RE)` (double n), `Comune di Spolet (PG)`
(missing o), and two region-instead-of-province labels. **Correcting any such
typo on a bando whose scadenza is still ahead makes the diff see a brand-new row
and mails it to the paid list a second time.**

The four rows named today are all expired, so the `hasExpired` guard at line 98
happens to drop them. That is coincidence, not design.

Key on `url` (the stable identity of a bando) or `url|deadline`, and put the
rename hazard in the README next to the "editing changes the URL" warning.

---

## 7. `postcss.config.cjs` requires a package that is not installed

**Verified.** It declares `@tailwindcss/postcss`; `node_modules/@tailwindcss`
does not exist and the package is not in `package.json` — the project is on
Tailwind 3 via `postcss.config.mjs`. Inert today because the `.mjs` wins
resolution. A build failure waiting on a resolution-order change. Delete the
`.cjs`.

---

## 8. `stripe-worker/`, `newsletter/` and `scripts/` are typechecked by nothing

**Reported.** `tsconfig.json:40-48` excludes `scripts`, `cypress` and
`stripe-worker`; no workflow runs the Worker's own `typecheck`; `render.mjs` is
`checkJs: false`.

Rename `{{SUMMARY}}` in `newsletter/email_template.html` and nothing fails until
`newsletter.yml` fires on a real batch, at which point `fill()` throws, the send
step exits non-zero, the marker correctly stays put, and the bandi are not
mailed that day. The same break in `welcome_template.html` is **worse**:
`sendWelcomeEmail` swallows every error by design, so a paying subscriber
silently gets nothing and the only trace is a Worker log line.

Add a job running `npm --prefix stripe-worker run typecheck` and
`DRY_RUN=true BEFORE_SHA=HEAD~1 node scripts/send-newsletter.mjs` — the dry-run
path exercises `renderEmail`, `renderTable` and `fill` end to end and cannot
send.

---

## 9. The cookie banner's "Rifiuta" does nothing

**Reported.** `components/CookieBanner.tsx:12,19,25`, `app/layout.tsx:65`

`cookie-consent` is written on both buttons and read only to decide whether to
show the banner. Nothing else reads it, and Umami loads unconditionally before
and regardless of any choice.

Worse, the modal copy at line 88 says *"Usiamo cookie tecnici e, con il tuo
consenso, cookie di analisi e profilazione"* while
`locales/it.json → pages.cookiePolicy.sections[2]` says the opposite, correctly
and defensibly: Umami sets no cookies and needs no prior consent, and there are
no profiling cookies at all. The banner's own first line and the modal's
disagree with each other inside one component.

Either align the modal copy with the policy, or actually gate the Umami
`<Script>` on the stored consent. Shipping copy that promises a gate that does
not exist is the one option to avoid.

---

## 10. `newsletter.yml` marker step lost its implicit `success()` guard

**Reported.** `.github/workflows/newsletter.yml:120`

An explicit `if:` replaces GitHub's default `success()` condition. Not
exploitable today — `markAccountedFor()` is the last statement in the script, so
`up_to_date=true` and a failing `send` step cannot coexist. But the entire design
of that marker is that it must never advance past unmailed rows, and this is the
one place a future inserted step breaks it silently.

`if: success() && steps.send.outputs.up_to_date == 'true'`.

---

## 11. Collapsed FAQ answers stay in the tab order

**Reported.** `components/FAQAccordion.tsx:23,53-66`

The closed state is `grid-rows-[0fr] opacity-0` with `overflow-hidden`. Content
stays in the DOM, focusable, and the toggle button has no `aria-expanded` or
`aria-controls`. A keyboard user on `/faq` is dragged through dozens of
invisible zero-height focus targets across 18 FAQ entries plus the glossary, most
answers containing links. `accessibility.cy.ts` does not cover it.

---

## 12. JSON-LD is serialised without `</script>` escaping

**Reported.** `app/layout.tsx:73`, `app/page.tsx:36`, `app/bandi/[bid]/page.tsx:100`,
`app/faq/page.tsx:42`, `app/abbonamento/page.tsx:70`, `app/about-us/page.tsx:40`,
`app/regional-laws/page.tsx`, `app/income-calculator/layout.tsx`

`JSON.stringify` does not escape `<`, so a `</script>` anywhere in
`data/data.json`, `data/faq.json` or `locales/it.json` closes the tag and
everything after becomes live markup. No such string exists today (verified: zero
`</` across all four data files) and the inputs are curator-controlled — but
`data/data.json` is fed by a crawler, which is the one path an untrusted string
could arrive by.

One-line fix through a shared helper: `.replace(/</g, '\\u003c')`.

`components/MapView.tsx` builds its popup HTML by interpolating `item.location`
into a string handed to `bindPopup()`, which is the same trust boundary. Lower
impact (popups render only on click), same class of fix.

---

## 13. Dead code and inert config

**Reported, individually cheap to confirm.**

- `components/SideAdBanner.tsx` — no importers (already documented in CLAUDE.md).
- `scripts/prerender.js` — 173 lines operating on a `dist/` directory this
  project never produces; referenced by no script and no workflow.
- `next.config.mjs:4-7` — the whole `images` block is inert; nothing imports
  `next/image`, everything uses raw `<img>`. `domains` is also deprecated in
  Next 15 in favour of `remotePatterns`.
- `app/page.tsx:10` — `export const revalidate = 3600` has no effect under
  `output: 'export'` (CLAUDE.md acknowledges this).
- `public/ads.txt` — declares a Google AdSense publisher id; no ad network script
  is loaded anywhere since the slots became house ads.

---

## 14. Internal bid links omit the trailing slash

**Reported.** `components/Table.tsx:60,77`, `components/MapView.tsx`

They emit `/bandi/<slug>` while `next.config.mjs` sets `trailingSlash: true`.
Both hosts 301 to the slashed form, so it works — but every click on a bid costs
a redirect, and it is inconsistent with `Footer.tsx` / `Navigation.tsx`.

---

## 15. Embargoed detail pages are enumerable

**Reported, and largely moot today.** `app/bandi/[bid]/page.tsx:28`

A directory is built for every bando including embargoed ones — necessary,
documented, and required by `embargo.cy.ts:199`. But the slug is a pure function
of the comune name, so the head start is brute-forceable by walking a list of
Italian comuni.

Moot right now because the repo is public and `data/data.json` gives the whole
embargoed set away directly, which CLAUDE.md and `stripe-worker/src/welcome.ts:64-76`
both accept explicitly. Recorded because **the documented mitigation for the repo
going private — a read-only PAT, or KV written by `deploy.yml` — does nothing
about this second path.** If privacy ever becomes real, both need answering.

---

## 16. Doc drift

**Verified where counted.**

- CLAUDE.md → "Current Data Stats" says 90 bids / 13 laws / 17 FAQs. Actual:
  **99 / 13 / 18**.
- All 99 rows now store a bare `YYYY-MM-DD` in `detectedat` (commit `6ca1ec5`).
  CLAUDE.md → "Data Model", `lib/data.ts:30-31` and `cypress/support/site.ts:34`
  all still describe the ISO instant as the current shape. `detectionDay()`
  handles both, so nothing breaks — three comments now mislead.
- `cypress/README.md:66` claims a clean run is "519 passing, 19 pending";
  CLAUDE.md says 516 and that it has not been re-measured. They disagree.
- `cypress/README.md` (~line 141) still says the static run "has not yet been run
  against the built export — do that once before wiring it into CI." It is wired
  into CI.
- `.gitignore` tells you to `git rm --cached tsconfig.tsbuildinfo`; already
  untracked.
- `package.json:2,4` — `"name": "licenzia"`, `"homepage": "https://coy123.github.io/licenzia"`.

---

## What was checked and found healthy

Worth recording so a future pass does not redo it.

- **No mirror drift.** `newsletter/render.mjs`'s `slug` is character-for-character
  identical to `lib/slug.ts` including the comma rule; `trimStrings` is
  functionally identical to `lib/trim.ts`; the `hasExpired` mirror reaches the
  same result for both stored date shapes. The Worker imports the real module
  rather than a mirror.
- **No embargo leak in the render path.** `app/page.tsx` uses `getTableData()` →
  `publishedBids`; `HomeContent` receives only `data` plus two integers;
  `LockedRows` renders genuinely empty elements. `bids` (the full set) is
  imported only by the detail page, which applies `noindex` per row. No
  `next/image` loader, no RSC payload carrying the full set.
- **No secrets** in the repo or the client bundle; no `NEXT_PUBLIC_` misuse; no
  `sk_`/`whsec_` matches anywhere. `STRIPE_MODE` is read only from server
  components.
- **Stripe webhook handling is solid** — raw-body `constructEventAsync`, 400 on
  verification failure, 500 on handler failure so Stripe retries, the
  `welcome_sent_at` idempotency guard, mark-after-send ordering, and the
  deliberate swallow so a mail failure cannot 500 the webhook. The `/mailerlite`
  route's constant-time HMAC compare and 200-on-no-op are right for MailerLite's
  3-day disable rule.
- **Live/test separation works as documented.** `e2e.yml` genuinely sets
  `STRIPE_MODE` on both the build step and the test step; `deploy.yml` passes
  `live`, `netlify-deploy.yml` passes `test`, `netlify.toml` covers the
  UI-triggered build.
- **Workflows match their documentation** on every load-bearing detail:
  `--no-build`, the `workflow_run` gating, the daily 05:00 UTC cron, both
  concurrency groups, and `if: github.event_name != 'pull_request'` on every
  deploy job. The `newsletter-sent` marker logic is careful and
  `markAccountedFor` is placed correctly, before the early exit.
- **`lib/data.ts`** — `assertReadableDeadline` mirrors the four
  `data-integrity.cy.ts` checks exactly, round-trip included; `detectedat` is
  pulled out of the spread so the raw spelling never reaches a client payload.
- **`data/data.json` is clean** — all 99 rows have valid round-tripping
  deadlines, present and non-future `detectedat`, no duplicate locations, no
  untrimmed strings, numeric `amount`.
- **No `prose` class has crept back** into `app/` or `components/`.
- `npx tsc --noEmit` clean at root and in `stripe-worker/`.
