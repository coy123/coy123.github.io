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
sudo apt-get update && sudo apt-get install -y \
  libgtk2.0-0t64 libgbm-dev libnotify-dev libnss3 libxss1 libasound2t64 xvfb
```

Without them Cypress fails with `error while loading shared libraries:
libnspr4.so`. Package names carry the `t64` suffix on Ubuntu 24.04; on older
releases drop it (`libgtk2.0-0`, `libasound2`).

Verify the setup with `npx cypress verify`.

## Running it

The suite needs the site served on `http://localhost:3000`.

```bash
npm install            # first time only — pulls cypress, serve, start-server-and-test

npm run test:e2e       # against `next dev` (fastest feedback loop)
npm run test:e2e:open  # same, but with the Cypress UI
```

To test exactly what gets deployed — the static export in `out/` — build first
and then run against a plain file server:

```bash
npm run build
npm run test:e2e:static
```

Against a deployed preview:

```bash
CYPRESS_BASE_URL=https://staging--bandincc.netlify.app npm run cy:run
```

## What is covered

| Spec | Covers |
| --- | --- |
| `routes.cy.ts` | All 11 static routes: status, hero, title, meta description, robots, Open Graph, JSON-LD, nav + footer |
| `navigation.cy.ts` | Desktop bar and mobile drawer: every link, active highlighting, hamburger open/close, backdrop, € shortcut |
| `home.cy.ts` | Hero, responsive description, last-updated date, anchor pills, SEO sections and their internal links, tab switching, Dataset schema |
| `bids-table.cy.ts` | One row per bid, every cell against `data.json`, deadline sorting, active/expired colouring, row links, search (case, trimming, clearing, empty state) |
| `bids-map.cy.ts` | Leaflet mount, tiles, one marker per geocoded bid, marker colours, popup content, popup link, zoom controls, tab round-trip, mobile |
| `bid-detail.cy.ts` | Every generated slug resolves, hero, metadata, crest, licence count, deadline, status badge, official source link, regional-law block, map, internal links, GovernmentService schema, diacritic slugs, unknown slug → 404 |
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
| `data-integrity.cy.ts` | `data.json` / `laws.json` / `faq.json` shape: required fields, ISO dates, positive integer amounts, absolute URLs, coordinates inside Italy, unique slugs, no duplicates |
| `not-found.cy.ts` | 404 page content, status code, return-home link, nav and footer |
| `external-resources.cy.ts` | Opt-in: really fetches every Wikimedia crest and every municipal source URL |

## Environment flags

| Flag | Default | Effect |
| --- | --- | --- |
| `CYPRESS_BASE_URL` | `http://localhost:3000` | Where to point the suite |
| `CYPRESS_stubExternalAssets` | `true` | Stubs Wikimedia crests, OSM tiles and the Umami script so CI never touches the internet. Set `false` to load them for real |
| `CYPRESS_checkExternalLinks` | `false` | Also issues real requests to every outbound link and to `external-resources.cy.ts` |

`external-resources.cy.ts` is the right thing to run on a weekly schedule
rather than on every deploy — municipal websites move and delete pages
constantly, and that should not block a release.

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
