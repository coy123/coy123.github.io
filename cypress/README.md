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
CYPRESS_BASE_URL=https://staging--bandincc.netlify.app npm run cy:run
```

### Expected result

A clean run against `next dev` is **519 passing, 19 pending, 0 failing**, in
roughly 5–6 minutes. Pending is not a failure — see Known gaps for what those
19 are and why they are skipped.

(516 before the three `crest thumbnails` checks in `data-integrity.cy.ts`; that
count has not been re-measured against a full local run.)

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
| `accessibility.cy.ts` | Image alt text, button and form-control accessible names, heading sanity, `lang`, keyboard reachability |
| `responsive.cy.ts` | Mobile / tablet / desktop: correct nav, no horizontal overflow, emoji headers, mobile search expansion |
| `data-integrity.cy.ts` | `data.json` / `laws.json` / `faq.json` shape: required fields, ISO dates, a readable non-future `detectedat` on every row, positive integer amounts, absolute URLs, coordinates inside Italy, unique slugs, slugs ASCII-only and comma-free, locations trimmed, no duplicates |
| `embargo.cy.ts` | The seven-day release delay: no embargoed location, URL, slug or crest anywhere in the exported HTML or the sitemap; nothing held back past its release date or past its own scadenza; the locked rows (count, countdown, empty skeleton, CTA, hidden during search); the map note; a detail page for every bando, `noindex` while embargoed |
| `not-found.cy.ts` | 404 page content, status code, return-home link, nav and footer (unknown bid slug is export only) |
| `external-resources.cy.ts` | Opt-in: really fetches every Wikimedia crest and every municipal source URL |

## Environment flags

| Flag | Default | Effect |
| --- | --- | --- |
| `CYPRESS_BASE_URL` | `http://localhost:3000` | Where to point the suite |
| `CYPRESS_stubExternalAssets` | `true` | Stubs Wikimedia crests, OSM tiles and the Umami script so CI never touches the internet. Set `false` to load them for real |
| `CYPRESS_checkExternalLinks` | `false` | Also issues real requests to every outbound link and to `external-resources.cy.ts` |
| `staticExport` | `false` | Set by `cy:run:static`. Enables the handful of assertions that only hold for the built `out/` export — chiefly that an unknown `/bandi/<slug>` renders the 404 page. `next dev` throws `missing param in generateStaticParams()` there instead, because `output: 'export'` is set, so those tests are skipped (reported as pending) in dev. |

`external-resources.cy.ts` is the right thing to run on a weekly schedule
rather than on every deploy — municipal websites move and delete pages
constantly, and that should not block a release.

## Known gaps and caveats

### The 19 pending tests

Nothing is silently skipped; every skip is deliberate and reported as pending.

- **13** in `links.cy.ts` — the "reaches every external target" test per page,
  gated behind `CYPRESS_checkExternalLinks`.
- **4** in `external-resources.cy.ts` — the whole spec, same flag.
- **2** gated behind `staticExport`: "unknown bid slug renders the 404 page",
  in `not-found.cy.ts` and `bid-detail.cy.ts`.

Running `npm run test:e2e:static` turns the last two on. Running with
`CYPRESS_checkExternalLinks=true` turns the other 17 on.

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

The suite has been verified end-to-end against `next dev`. **It has not yet
been run against the built export** — do that once with
`npm run test:e2e:static` before wiring it into CI.

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
  whole dataset, not about a held-back slice.

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
