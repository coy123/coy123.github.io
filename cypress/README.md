# Cypress end-to-end suite

Full-site coverage for bandincc.it: every route, every table, every button,
every link.

## Prerequisites

**Node 22** (see `.nvmrc`). Cypress 15 refuses to start on Node 18 — it fails
during binary verification with `SyntaxError: Invalid regular expression flags`.

```bash
nvm use                # picks up .nvmrc
```

On a bare Ubuntu/Debian (including WSL) the bundled Electron also needs a few
system libraries, once:

```bash
sudo apt-get install -y \
  libgtk2.0-0t64 libgbm1 libnotify4 libnss3 libxss1 libasound2t64 xvfb
```

Without them Cypress fails with `error while loading shared libraries:
libnspr4.so` (`libnspr4` arrives as a dependency of `libnss3`). This is the
runtime-only set — Cypress's own docs list `libgbm-dev` and `libnotify-dev`
instead, which pull in ~39 extra packages of headers that Electron never uses.
Package names carry the `t64` suffix on Ubuntu 24.04; on older releases drop it
(`libgtk2.0-0`, `libasound2`).

Verify the setup with `npx cypress verify`.

## Running it

The suite needs the site served on `http://localhost:3000`; the `test:e2e`
scripts start and stop that server for you via `start-server-and-test`.

```bash
npm install            # first time only — pulls cypress, serve, start-server-and-test

npm run test:unit      # browser-less tests first: ~2s, no server, no build
npm run test:e2e       # FULL suite against `next dev` (fastest feedback loop)
npm run test:e2e:open  # same, but with the Cypress UI
```

To test exactly what gets deployed — the static export in `out/` — build first
and then run against a plain file server. **Worth doing before a release**: it
is the only mode that exercises the export-only assertions (see Known gaps).

```bash
npm run build
npm run test:e2e:static
```

A single spec, against an already-running server (`npm run dev` in another
terminal):

```bash
npx cypress run --spec cypress/e2e/bids-table.cy.ts
npx cypress run --spec 'cypress/e2e/{home,routes}.cy.ts'
```

Against a deployed preview:

```bash
CYPRESS_BASE_URL=https://spiffy-semifreddo-87751b.netlify.app npm run cy:run
```

### Expected result

A clean run against `next dev` is **589 passing, 20 pending, 0 failing** out of
609, in about 6 minutes on an idle machine (longer when other agents' dev
servers are sharing it). Pending is not a failure — see Known gaps for what
those 20 are and why they are skipped.

The browser-less tests are not in that total; `npm run test:unit` adds 87 more
in about two seconds. See "What does not live here" below.

Measured 2026-09-06, after `regions.cy.ts` was added. The 516 and 519 quoted
here previously were extrapolations that had drifted a long way from the real
number; re-measure rather than adjusting the figure by hand.

## What is covered

| Spec | Covers |
| --- | --- |
| `routes.cy.ts` | All 11 static routes: status, hero, title, meta description, robots, Open Graph, JSON-LD, nav + footer |
| `navigation.cy.ts` | Desktop bar and mobile drawer: every link, active highlighting, hamburger open/close, backdrop, € shortcut |
| `home.cy.ts` | Hero, responsive description, last-updated date, anchor pills, SEO sections and their internal links, tab switching, Dataset schema |
| `bids-table.cy.ts` | One row per bid, every cell against `data.json`, deadline sorting, active/expired colouring, row links, search (case, trimming, clearing, empty state) |
| `bids-map.cy.ts` | Leaflet mount, tiles, one marker per geocoded bid, marker colours, popup content, popup link, zoom controls, tab round-trip, mobile |
| `bid-detail.cy.ts` | Every generated slug resolves (all 89 requested for real), hero, metadata, crest, licence count, deadline, status badge, official source link, regional-law block, map, internal links, GovernmentService schema, diacritic slugs, unknown slug → 404 (export only) |
| `faq.cy.ts` | 17 FAQ items + 15 glossary terms, numbering, accordion open/close/one-at-a-time, answer bodies, section anchors, FAQPage schema |
| `income-calculator.cy.ts` | Field defaults, labels, constraints, options, all 18 enum combinations checked against `lib/calculator.ts`, min/max workload, modal open/close, resource links, WebApplication schema |
| `regional-laws.cy.ts` | One row per law, alphabetical order, crest/name/outbound link, search, WebPage schema |
| `articles.cy.ts` | Markdown pipeline for both `.md` pages: headings, GFM tables, lists, links, no leaked syntax, author box, Article schema |
| `static-pages.cy.ts` | Chi Siamo, Contatti, Disclaimer, Privacy Policy, Cookie Policy — every section and paragraph against `locales/it.json` |
| `cookie-banner.cy.ts` | First visit, accept/decline persistence, info modal (X, backdrop, both buttons), returning visitor, cookie-policy link |
| `footer.cy.ts` | Legal links on every route, copyright year, navigation, sticks to the bottom |
| `links.cy.ts` | Crawls every `<a>` on every page: well-formed hrefs, internal targets requested for real, anchors resolve to existing ids, `target="_blank"` implies `rel=noopener` |
| `accessibility.cy.ts` | Image alt text, button and form-control accessible names, heading sanity, `lang`, keyboard reachability, and the FAQ accordion's `aria-expanded`/`aria-controls` plus its collapsed answers leaving the tab order |
| `responsive.cy.ts` | Mobile / tablet / desktop: correct nav, no horizontal overflow, emoji headers, mobile search expansion |
| `regions.cy.ts` | The Regioni tab: all 20 regions offered with crest and separate open/closed counts (green and grey), the accessible label carrying both, the "pick one first" state, the pressed/unpressed toggle, the choice surviving a tab switch, the smooth scroll to the results, the table and map filtered to one region, no locked rows over a regional table, the map framed tighter than the country map, the crest-only phone grid, and the expiring "NUOVO" flag. The region *rule* is in `test/regions.test.ts` |
| `embargo.cy.ts` | The seven-day release delay *in the export*: no embargoed location, URL, slug or crest anywhere in the exported HTML or the sitemap; the locked rows (count, countdown, empty skeleton, CTA, hidden during search); the map note; a detail page for every bando, `noindex` while embargoed. The dataset invariants behind it are in `test/data-integrity.test.ts` |
| `sitemap.cy.ts` | `/sitemap.xml` (generated by `app/sitemap.ts`): well-formed XML, an exact set comparison against `ROUTES` + every published bando so a missing *or* stray entry fails, no duplicates, absolute URLs that all end in a slash, no `noindex` page, no embargoed slug, and — export only — every `<loc>` returning 200 with `followRedirect: false` |
| `not-found.cy.ts` | 404 page content, status code, return-home link, nav and footer (unknown bid slug is export only) |
| `external-resources.cy.ts` | Opt-in: really fetches every Wikimedia crest and every municipal source URL |

## Environment flags

| Flag | Default | Effect |
| --- | --- | --- |
| `CYPRESS_BASE_URL` | `http://localhost:3000` | Where to point the suite. Also the way to run on a non-default port without touching `package.json` — necessary when several git worktrees run suites at once, since `serve:static` uses `--no-port-switching` and will hard-fail rather than move off 3000. See "You are working exclusively in this worktree" in `CLAUDE.md` for the exact commands. |
| `CYPRESS_stubExternalAssets` | `true` | Stubs Wikimedia crests, OSM tiles and the Umami script so CI never touches the internet. Set `false` to load them for real |
| `CYPRESS_checkExternalLinks` | `false` | Also issues real requests to every outbound link and to `external-resources.cy.ts` |
| `staticExport` | `false` | Set by `cy:run:static`. Enables the handful of assertions that only hold for the built `out/` export — chiefly that an unknown `/bandi/<slug>` renders the 404 page. `next dev` throws `missing param in generateStaticParams()` there instead, because `output: 'export'` is set, so those tests are skipped (reported as pending) in dev. `sitemap.cy.ts`'s "resolve without a redirect" test is gated the same way, and for the same reason: in dev a bad `/bandi/` slug throws rather than 404s, so the result would not mean anything. |

`external-resources.cy.ts` is the right thing to run on a weekly schedule
rather than on every deploy — municipal websites move and delete pages
constantly, and that should not block a release.

## Known gaps and caveats

### The 20 pending tests

Nothing is silently skipped; every skip is deliberate and reported as pending.

- **13** in `links.cy.ts` — the "reaches every external target" test per page,
  gated behind `CYPRESS_checkExternalLinks`.
- **4** in `external-resources.cy.ts` — the whole spec, same flag.
- **3** gated behind `staticExport`: "unknown bid slug renders the 404 page" in
  `not-found.cy.ts` and `bid-detail.cy.ts`, and "points only at URLs that
  resolve without a redirect" in `sitemap.cy.ts`.

Running `npm run test:e2e:static` turns the last three on. Running with
`CYPRESS_checkExternalLinks=true` turns the other 17 on.

On a dataset with something embargoed the count moves: `embargo.cy.ts` and
`sitemap.cy.ts` both carry tests that skip when nothing is held back.

### `next dev` vs. the static export

Two behaviours differ, and the suite is written to pass in both modes:

- **Unknown dynamic params.** Requesting a `/bandi/<slug>` that is not in
  `generateStaticParams()` makes `next dev` throw *"missing param … which is
  required with output: export"* rather than render `app/not-found.tsx`. In the
  export the directory simply does not exist and the host serves `404.html`.
  Hence the `staticExport` flag.
- **Where metadata lands.** `next dev` streams `<meta>` tags into `<body>`;
  the production output puts them in `<head>`. Assertions therefore use
  `meta[name=…]` rather than `head meta[name=…]`.

The suite is verified end-to-end against both targets, and both are wired
into CI: `.github/workflows/e2e.yml` builds and then runs
`npm run test:e2e:static` against the resulting `out/`, and that job gates
every deploy on both branches.

### What does not live here

A test that never opens a page does not belong in a browser. Those live in
`test/`, run by Node's own test runner, and are **not** part of the counts
above:

```bash
npm run test:unit      # 87 tests, ~2s, no server, no build, no Electron
```

| File | Covers |
| --- | --- |
| `test/embargo.test.ts` | The release rule itself (`lib/embargo.ts`) against fixed instants, with no dataset: the cutoff every half hour of a year, both DST transitions, day 6 vs day 7, the expiry exemption, `daysUntilRelease` never reaching 0, both stored `detectedat` shapes |
| `test/data-integrity.test.ts` | `data.json` / `laws.json` / `faq.json` / the glossary: required fields, ISO deadlines that round-trip, a readable non-future `detectedat` on every row, positive integer amounts, absolute URLs, crest filenames, no crest shared between two comuni, coordinates inside Italy, unique ASCII slugs, trimmed locations, `crestUrl` thumbnailing — plus the three release-delay invariants over the real dataset |
| `test/subscription.test.ts` | The Stripe links in `locales/it.json`: that they belong to the mode being built, carry `locale=it`, and that every price says "IVA inclusa" |
| `test/regions.test.ts` | `lib/regions.ts`: 20 regions, alphabetical, unique ids, the 107 plate codes each in exactly one region, a resizable Wikimedia crest and a bounding box inside Italy for each — then the rule itself (code, region name, coordinates, and the coordinates overruling an impossible code) and, over the real `data.json`, that every bando lands in exactly one region whose box its coordinates are actually in |

Node 22 strips the TypeScript itself, so these import `../lib/embargo.ts` and
`../cypress/support/site.ts` directly — no build step, no test framework, no
added dependency. `.github/workflows/e2e.yml` runs `npm run test:unit` **before**
the build, so both deploys are still gated on all of it, and a bad deadline or a
test-mode Payment Link on a live build is named in about two seconds instead of
after a Next build and a six-minute Electron run.

`cypress/support/site.ts` is shared by both layers and is deliberately
framework-free — it names neither `cy` nor `Cypress`, only the app's own `lib/`
modules and the real JSON. Two small things keep it loadable by plain Node, and
both must stay: its JSON imports carry `with { type: 'json' }`, and its `lib/`
imports carry explicit `.ts` extensions.

#### Why they left

`test/embargo.test.ts` was `cypress/e2e/embargo-rule.cy.ts` until 2026-09-03,
and only ever because the Cypress suite is what gates the deploys. Running it in
Electron bought nothing and cost something: the global `beforeEach` in
`cypress/support/e2e.ts` fires four `cy.intercept` calls ahead of every test, so
each of those 14 synchronous assertions carried the only piece of machinery in
it that could hang — stubbing network requests a test with no page cannot make.

On 2026-09-02 a staging deploy went red on "does not call an unreadable deadline
expired" — three assertions on `hasExpired(undefined)` and
`hasExpired('not a date')` — at commit 3cbf550, the same commit master had gone
green on minutes earlier. The tests were deterministic; the browser around them
was not. The other two files followed for the same reason.

#### What stayed, and why

Not everything that looks pure is. Several tests read only data but reach the
page through a local helper (`faqAccordion()`, `fillAndSubmit()`, `valueFor()`),
and those are browser tests wearing a plain-assertion costume — grep for `cy.`
inside the `it` block and you will miss them.

Three deliberate keeps:

- **`external-resources.cy.ts`** uses `cy.request` for its retry, timeout and
  redirect handling. It is opt-in and off in CI, so it costs a deploy nothing.
- **`subscription.cy.ts`** keeps every assertion that looks for a resolved
  `href` in the DOM. That is the half of the two-mode gate only a rendered page
  can hold: if `next build` and the test run disagreed about `STRIPE_MODE`, the
  anchor carries the other mode's URL and is simply not found.
- **`embargo.cy.ts`** keeps everything that reads the exported HTML, which is
  the whole point of it — "does not render it" is a weaker claim than "is not in
  the response body".

### The release delay makes some tests conditional

`cypress/support/site.ts` splits `data.json` the way `lib/data.ts` does:
`bids` is what the site renders, `allBids` is every row, `embargoedBids` is
what the seven-day delay is currently holding back. Most specs need no
knowledge of this — they assert against `bids` and keep working.

Three things to know when reading `embargo.cy.ts`:

- **An expired bando is never held back.** `isPublished` publishes any row
  whose scadenza is behind us whatever its `detectedat` says, because the
  archive is backfilled with bandi that closed months ago. Two tests state that
  in both directions, and neither of them skips — they are assertions about the
  whole dataset, not about a held-back slice. They now live in
  `test/data-integrity.test.ts`, since neither needs a page.

- **Its interesting tests skip when nothing is embargoed.** On a dataset where
  every row is older than a week there is no locked block to assert on, and a
  test that passed vacuously would be worse than a pending one. They come back
  the moment a fresh bando lands.
- **The cutoff is resolved twice**, once by `next build` and once by the spec
  run — both as Italian calendar days, so they agree unless the two straddled
  midnight in Rome. `nearCutoff` names the rows that could differ — on the
  release boundary or on the scadenza one, which move at the same instant —
  and the count assertion widens by exactly that many rather than asserting a
  number that is only usually right.

### Data inconsistencies left alone

Surfaced by the tests but not changed, because they are user-visible copy and
that is an editorial call:

- `Comune di Calto (RO, Veneto)` is the only entry naming a region instead of a
  bare province code. Its comma used to 404 the detail page — `toSlug` now
  treats commas as separators, so the route works, but the label is still
  inconsistent with the other 88 entries.
- `Comune di Colle di Val d’Elsa (Toscana)` likewise uses a region name.
- Probable typos: `Comunne di Reggio Emilia (RE)` (double "n") and
  `Comune di Spolet (PG)` (likely Spoleto).

Editing any of these changes the bid's URL, since the slug is derived from the
label.

### Assertions that lean on implementation details

Worth knowing before you refactor:

- **Cypress visibility vs. full-screen backdrops.** Cypress decides whether a
  `position: fixed` element is visible by testing its *centre* point. A
  backdrop that spans the viewport has its centre behind the dialog, so a
  plain `.click()` is rejected even though the corner is perfectly tappable.
  The three backdrop tests assert `document.elementFromPoint()` really returns
  the backdrop at the point they use, then click there with `{ force: true }`.
- **Keyboard activation of buttons.** Enter/Space on a native `<button>` is a
  browser default action that Cypress's synthetic key events do not reproduce.
  `accessibility.cy.ts` therefore asserts the semantics (real `<button>`, in
  the tab order, focusable) rather than typing `{enter}`. Cypress *does*
  implement implicit form submission, so the calculator's Enter-to-submit test
  is genuine.
- **Hydration timing.** `Table.tsx` and `MapView.tsx` colour rows and markers
  from a `now` state set in `useEffect`, so everything starts in the "expired"
  styling. Those assertions use `.should()` (which re-queries on retry), never
  `.then()` (which samples once and would flake).

## Conventions

- **No `data-testid` in the app.** Selectors live in `support/selectors.ts` and
  are anchored on structural Tailwind classes. If a class rename breaks the
  suite, that one file is the place to fix it.
- **Fixtures are the real data.** `support/site.ts` imports `data/data.json`,
  `data/laws.json`, `data/faq.json` and `locales/it.json`, and re-uses
  `lib/slug.ts` and `lib/calculator.ts`. Adding a bid, a law, a FAQ or a
  glossary term never requires editing a spec.
- **Dates are computed, not hardcoded.** Which bids are open changes daily, so
  the specs pick their samples at runtime.
- **The cookie banner is pre-dismissed** by `cy.visitPage()`, because it is
  `position: fixed` at the bottom and swallows clicks. `cy.visitRaw()` gives you
  a pristine `localStorage` when you actually want to test the banner.
