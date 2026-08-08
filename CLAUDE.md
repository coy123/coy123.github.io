# Project Description
This is a project for showing the latest Italian NCC (Noleggio Con Conducente / Hire With Driver) licenses on a table and a map. The website aggregates publicly available NCC bid/license data from Italian municipalities and presents it in a searchable, filterable interface. The website language is Italian but talk to me in English.

Domain: www.bandincc.it

# Tech Stack
- **Framework**: Next.js 15 (App Router) with Turbopack for dev
- **Language**: TypeScript (strict mode, ES2020 target)
- **Styling**: Tailwind CSS 3 with dark theme (gray-800/gray-900 backgrounds)
- **Maps**: Leaflet + react-leaflet (dynamically imported, SSR disabled)
- **Markdown**: react-markdown + remark-gfm for rendering .md content pages
- **Analytics**: Umami (self-hosted cloud, script loaded in layout head)
- **Package manager**: npm
- **Node version**: 22 (pinned in `.nvmrc`, used in CI, minimum enforced by `engines` in package.json). Cypress 15 requires Node >= 20.1.

# Build & Output Mode
- `next.config.mjs` sets `output: 'export'` — the site is **fully static** (no Node.js server at runtime)
- All pages are pre-rendered at build time; the `out/` directory is deployed
- `trailingSlash: true` — all routes end with `/`
- `reactStrictMode: true`
- `images.domains`: `['upload.wikimedia.org']` — for coat of arms images
- Note: `revalidate = 3600` on the home page has no effect in export mode; the page is only updated on rebuild

# Autonomy
Edit files and run commands (`curl`, `grep`, `node`, `python3`, file reads, etc.) directly — do not stop to propose them and wait for approval. Just do the work and report what you found or changed.
The exceptions below still hold: no git writes, no deploys, no running or building the app.

# Git and Deployment
Read-only git commands are fine (`git status`, `git log`, `git diff`, `git show`, `git branch`, `git blame`) — use them freely.
Never run a git command that writes: no `commit`, `push`, `add`, `checkout`/`switch`, `merge`, `rebase`, `reset`, `stash`, `tag`, `cherry-pick`, `restore`, `rm`, or `config`. The user handles all of that.
Do not ever try to deploy. You can only run on dev mode locally.
Do not ever run or build the application (no `npm run dev`, `npm run build`, `next build`, etc.). The user runs it themselves and reports back.
There are two branches: staging and master. Development is done on staging. Staging is connected to Netlify for deployment and master is connected to GitHub Pages for deployment. The domain is www.bandincc.it

**Planned (not in place yet): the colleague gets push access to `staging` only,
and changes reach `master` through pull requests** so the checks always run
before anything hits production. Until that lands, direct pushes to `master`
still happen — `data/data.json` updates in particular (see "Adding a new NCC
bid"). Don't assume a PR-gated `master` when reasoning about how a commit got
there.

## CI/CD Pipelines (`.github/workflows/`)
- **`e2e.yml`**: Reusable (`workflow_call`) build-and-test gate shared by both deploy workflows. Installs the Electron system libs from `cypress/README.md`, caches `~/.cache/Cypress`, builds, runs `npm run test:e2e:static` against the built `out/`, then uploads `out/` as an artifact (name via the `artifact-name` input) plus Cypress screenshots on failure. It never sets `CYPRESS_checkExternalLinks`, so the opt-in specs that hit the real internet stay skipped and third-party outages cannot fail a deploy.
- **`deploy.yml`**: Triggers on push/PR to `master` + `workflow_dispatch`. Jobs: `test` (calls `e2e.yml`) → `package` → `deploy`. `package` downloads the tested `out/` artifact instead of rebuilding, adds `.nojekyll`, and hands it to GitHub Pages.
- **`netlify-deploy.yml`**: Triggers on push/PR to `staging` + `workflow_dispatch`. Jobs: `test` (calls `e2e.yml`) → `deploy`, which downloads the tested `out/` and runs `npx netlify-cli@27 deploy --dir=out --prod --no-build` in a plain `run:` step. **`--no-build` is load-bearing**: since netlify-cli v20 `deploy` builds by default, so without it the CLI reads the site's build settings from the Netlify UI and runs `npm run build` in a job that has no checkout. Uses `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID` secrets, and fails fast with a named error if either is empty. **Do not go back to `netlify/actions/cli@master`** — its `entrypoint.sh` captures the CLI in a command substitution and ends on an `::set-output` echo (removed by GitHub in 2023), so the step exits 0 no matter what the CLI did and prints none of its output. That is why staging deploys looked green for months while the site never updated.
- **`newsletter.yml`**: Subscriber newsletter. Chains off `deploy.yml` via `workflow_run` (gated on `conclusion == 'success'` + `head_branch == 'master'`), never on the push — the campaign links to `/bandi/<slug>/` pages that exist only once the export is live, and a push trigger both outran the build and sent even when the suite failed. `scripts/send-newsletter.mjs` diffs `data/data.json` against the **last commit actually mailed**, tracked by a moving lightweight tag **`newsletter-sent`**. The workflow force-updates that tag to `HEAD` only when the script writes `up_to_date=true` to `$GITHUB_OUTPUT`, which it does solely after a real send or a successful "nothing new" diff — never on a dry run or when the base was unknown/unreadable. So a batch missed by a failed deploy or a failed send is retried automatically by the next successful run. If the tag is ever deleted, the workflow bootstraps from the last successful `deploy.yml` run. **Don't repoint or delete `newsletter-sent` casually** — moving it forward silently skips every unmailed bando behind it.
- **Deploy gating**: every deploy job carries `if: github.event_name != 'pull_request'`, so a PR runs the suite only. Merging produces a `push`, which runs the suite again and then deploys. A failing suite fails `test`, and the dependent jobs never run.
- **Concurrency**: both workflows key their group on the event (`pages-…` / `netlify-staging-…`), so PR test runs get a lane per branch and can never cancel or evict a production deploy.
- **`netlify.toml`**: Only read if the Netlify site is linked to the repo and builds it itself — the CI deploy ignores it and uploads the tested `out/` via `--dir=out`. Publishes `out` (not `.next`) with no `@netlify/plugin-nextjs`: `next.config.mjs` sets `output: 'export'`, and the plugin fails on a publish dir with no SSR build output.

# Bash Commands
- `npm run dev`: build and run the project locally (uses Turbopack)
- `npm run build`: production build via Next.js
- `npm run lint`: run Next.js linter
- `npm run test:e2e`: run the Cypress suite against `next dev`
- `npm run test:e2e:static`: run it against the built `out/` export (run `npm run build` first)
- `npm run test:e2e:open`: same as `test:e2e`, with the Cypress UI

# Testing
End-to-end tests live in `cypress/` (TypeScript, Cypress 15) and are documented
in `cypress/README.md`. They gate both deploys: `e2e.yml` is a reusable
build-and-test job that `deploy.yml` and `netlify-deploy.yml` both call before
they publish anything (see CI/CD above).

Cypress 15 needs **Node >= 20.1** (the repo pins 22 via `.nvmrc`); on Node 18 it
dies during binary verification with `Invalid regular expression flags`. On
Ubuntu/WSL it also needs a one-off `apt-get install` of the Electron system
libraries — the exact command is in `cypress/README.md`.

A clean run against `next dev` was 516 passing / 19 pending / 0 failing before
`cypress/e2e/subscription.cy.ts` was added (2026-08-04); that spec adds ~15 more
and the count has not been re-measured since. The pending ones are deliberate
opt-ins (external link checks) or export-only
assertions; `cypress/README.md` → "Known gaps and caveats" explains each, plus
the two behaviours that differ between `next dev` and the built export and the
data inconsistencies in `data.json` that were deliberately left alone.

Key conventions:
- The app carries **no `data-testid` attributes**. Selectors live in
  `cypress/support/selectors.ts`, anchored on structural Tailwind classes.
- `cypress/support/site.ts` imports the real `data/*.json`, `locales/it.json`,
  `lib/slug.ts` and `lib/calculator.ts`, so adding a bid, law, FAQ or glossary
  term never requires editing a spec.
- Third-party assets (Wikimedia crests, OSM tiles, Umami) are stubbed by
  default; `CYPRESS_checkExternalLinks=true` opts into real network checks.
- `cy.visitPage()` pre-dismisses the cookie banner; `cy.visitRaw()` does not.

# Code Style
- Use ES modules (import/export) syntax, not CommonJS (require)
- Destructure imports when possible (e.g., `import { foo } from 'bar'`)
- Follow React conventions
- Path alias: `@/*` maps to project root (configured in tsconfig.json)

# Folder Structure

```
├── app/                        # Next.js App Router pages
│   ├── layout.tsx              # Root layout (Navigation, Footer, CookieBanner, Umami, JSON-LD)
│   ├── page.tsx                # Home page (bid table + map)
│   ├── globals.css             # Tailwind imports + custom animations (fadeIn, scaleIn)
│   ├── not-found.tsx           # Custom 404 page
│   ├── bandi/[bid]/            # Dynamic bid detail pages
│   │   ├── page.tsx            # Bid detail (SSG with generateStaticParams)
│   │   ├── BidDetailMap.tsx    # Single-marker Leaflet map for a bid
│   │   ├── BidDetailMapWrapper.tsx # Dynamic import wrapper (SSR disabled)
│   │   └── BidStatus.tsx       # Client component showing active/expired status
│   ├── abbonamento/page.tsx    # Paid newsletter: plans + Stripe Payment Links
│   ├── about-us/page.tsx       # About us page (incl. the #contatti section)
│   ├── contact/page.tsx        # Retired: noindex stub redirecting to /about-us/#contatti
│   ├── grazie/page.tsx         # Post-payment redirect target (noindex)
│   ├── cookie-policy/page.tsx  # Cookie policy (content from translations)
│   ├── disclaimer/page.tsx     # Legal disclaimer
│   ├── faq/page.tsx            # FAQ + Glossary (accordion UI)
│   ├── how-to-become-driver/   # Guide article
│   │   ├── page.tsx            # Renders markdown via MarkdownArticle
│   │   └── howToBecomeDriver.md # Article content
│   ├── income-calculator/      # NCC income calculator
│   │   ├── page.tsx            # Calculator form + result modal
│   │   └── layout.tsx          # JSON-LD WebApplication schema
│   ├── privacy-policy/page.tsx # Privacy policy (content from translations)
│   ├── regional-laws/page.tsx  # Regional laws table
│   └── utilities/              # Useful tools/resources article
│       ├── page.tsx            # Renders markdown via MarkdownArticle
│       └── utilities.md        # Article content
├── components/                 # Reusable React components
│   ├── AuthorBox.tsx           # Author attribution box
│   ├── Celebration.tsx         # One-shot confetti + balloons overlay (used on /grazie)
│   ├── CookieBanner.tsx        # GDPR cookie consent banner + modal
│   ├── CurrentDate.tsx         # Client-side date display (avoids SSR mismatch)
│   ├── FAQAccordion.tsx        # Expandable accordion for FAQ/glossary items
│   ├── Footer.tsx              # Site footer (abbonamento, privacy, cookie, disclaimer, contatti)
│   ├── HeroCrest.tsx           # Crest in the right-hand strip of every page hero (xl+)
│   ├── HomeContent.tsx         # Home page client component (tabs, search, table/map)
│   ├── LawsContent.tsx         # Regional laws client component (search + table)
│   ├── LawsTable.tsx           # Table for regional law entries
│   ├── MapView.tsx             # Leaflet map with circle markers for all bids
│   ├── MarkdownArticle.tsx     # Renderer for the two .md long-form pages (see "Article typography")
│   ├── Navigation.tsx          # Desktop + mobile nav with hamburger menu
│   ├── NewsletterAd.tsx        # House ad for the paid newsletter (banner + side variants)
│   ├── SideAdBanner.tsx        # UNUSED — leftover "EGAF" placeholder from the old ad slots
│   ├── SideAdSlot.tsx          # One desktop ad rail; client-side so it can hide itself by route
│   └── Table.tsx               # Main bids table with deadline sorting/coloring
├── data/                       # Static JSON data files
│   ├── data.json               # NCC bid entries (location, deadline, amount, url, image, lat/lng)
│   ├── faq.json                # FAQ question/answer pairs (markdown in answers)
│   └── laws.json               # Regional law entries (location, image, url)
├── lib/                        # Utility modules
│   ├── calculator.ts           # Income calculator logic (enums, cost maps, calculateIncome)
│   ├── crest.ts                # Coat-of-arms URL builder (Wikimedia thumb sizes)
│   ├── data.ts                 # Data loader (reads data.json, converts lat/lng to numbers)
│   ├── slug.ts                 # toSlug(): ASCII-safe bid detail slugs
│   ├── subscription.ts         # Stripe link guards (placeholder + locale=it)
│   ├── translations.ts         # Translation helper (reads locales/it.json)
│   └── trim.ts                 # trimStrings(): every reader of data.json trims through this
├── locales/
│   └── it.json                 # All Italian translations/content for the site
├── public/
│   ├── images/driver.png       # Hero background image used across all pages
│   └── service-worker.js       # Cache-first SW for static assets (CSS, JS, images)
├── scripts/
│   └── prerender.js            # Legacy prerender script (generates static HTML from dist/)
├── types.ts                    # TypeScript interfaces (TableData, LawData)
├── tsconfig.json               # TS config (strict, bundler module resolution)
└── package.json                # Dependencies and scripts
```

# Data Model

## TableData (types.ts) — NCC Bid entries
```typescript
interface TableData {
  image: string       // URL to municipality coat of arms
  location: string    // Municipality name with province code, e.g. "Comune di Milano (MI)"
  amount: number      // Number of NCC licenses available
  deadline: string    // ISO date string (YYYY-MM-DD)
  url: string         // Link to official bid page
  latitude?: number   // Optional geo coordinates for map display
  longitude?: number
}
```
Data source: `data/data.json` — manually curated, loaded via `lib/data.ts`.

## LawData (types.ts) — Regional law entries
```typescript
interface LawData {
  image: string    // URL to region/city coat of arms
  location: string // Region or city name
  url: string      // Link to official regulation PDF/page
}
```
Data source: `data/laws.json`.

## FAQ Data (data/faq.json)
Array of `{ question: string, answer: string }` where answers contain markdown formatting with bold, links, and lists.

# Pages — Detailed Descriptions

## Home Page (`app/page.tsx`)
- **Server component** with ISR revalidation every 3600 seconds
- Hero section with background image (`/images/driver.png`) and title/subtitle from translations
- Description text + anchor links (pill-shaped buttons) to content sections below
- `CurrentDate` component showing last-updated date (client-side to avoid SSR hydration mismatch)
- `HomeContent` client component containing:
  - **Tab switcher** (Table / Map) — styled toggle buttons
  - **Search bar** — filters bids by location name (case-insensitive substring match)
  - **Table view** (`Table` component): rows sorted by deadline descending, green background for future deadlines, gray for past. Columns: crest image, location (links to `/bandi/{slug}`), license count, deadline date, view button
  - **Map view** (`MapView` component): Leaflet map centered on Italy (41.87°N, 12.57°E), circle markers (green = active, red = expired), popups with bid info and link to detail page
- `NewsletterAd` banner between the description and the table, in the slot the disabled Amazon affiliate banner used to occupy (that banner is still there, commented out, because its tracking URL is not reproducible from anywhere else)
- SEO content sections rendered from `t.pages.home.sections` with internal links to related pages
- JSON-LD Dataset schema

## Bid Detail Page (`app/bandi/[bid]/page.tsx`)
- **Statically generated** via `generateStaticParams()` — one page per bid entry
- Slug derived from location: spaces replaced with hyphens
- Hero section + bid details card showing: crest image, location name, license count, deadline date, active/expired status (`BidStatus` client component), link to official source
- **BidDetailMap**: single-marker Leaflet map (zoom 12, scroll disabled) if coordinates exist, wrapped in `BidDetailMapWrapper` for dynamic import
- **Regional law link**: if the bid location matches a law entry (case-insensitive includes), shows link to the relevant regulation
- Informational sections: "What is NCC?" and "How to participate" from translations
- `AuthorBox` component + internal navigation links
- JSON-LD GovernmentService schema with GeoCoordinates

## FAQ & Glossary Page (`app/faq/page.tsx`)
- Two sections with anchor links at the top: "Domande Frequenti" and "Glossario NCC"
- FAQ section: loads `data/faq.json`, renders via `FAQAccordion` component (expandable, one-at-a-time, answers rendered as markdown)
- Glossary section: loads terms from `locales/it.json` at `pages.glossario.terms`, rendered with same `FAQAccordion`
- JSON-LD FAQPage schema covering both FAQ and glossary items
- `AuthorBox` at bottom

## How to Become a Driver (`app/how-to-become-driver/page.tsx`)
- Reads `howToBecomeDriver.md` at build time using `fs.readFileSync`
- Renders it with `MarkdownArticle` inside a gray-900 card (see "Article typography")
- Split in two at `'#### 2.'` so an ad can sit after step 1. The slot is
  currently a commented-out placeholder, and both halves render inside the same
  card, so the seam is invisible — **the marker has to track the heading text**
- Content covers: requirements, CAP/KB certification, municipal enrollment, SCIA, vehicle requirements, insurance
- JSON-LD Article schema
- `AuthorBox` + internal resource links

## Income Calculator (`app/income-calculator/page.tsx`)
- **Client component** with form inputs:
  - Hours per day (1-24, default 8)
  - Days per month (1-31, default 20)
  - Time of day (Day/Night/Day+Night) — enum `TimeOfDay`
  - City type (Business/Tourist/Small) — enum `CityType`
  - Fuel type (Petrol/Electric) — enum `Fuel`
- Calculation logic in `lib/calculator.ts`:
  - Billable hours = total hours × occupancy rate (70%/60%/40% by city type)
  - Hourly rate = base rate (€45/€50/€38 by city type) × time multiplier (1.0/1.2/1.1)
  - Monthly revenue = billable hours × hourly rate
  - Variable costs = total km × fuel cost per km (€0.10 petrol, €0.06 electric)
  - Fixed costs = €1000/month (leasing)
  - Result = revenue - variable costs - fixed costs
- Result displayed in a modal with fade-in/scale-in animations
- JSON-LD WebApplication schema (in `layout.tsx`)
- Disclaimer text about estimates

## Regional Laws Page (`app/regional-laws/page.tsx`)
- Loads `data/laws.json` and renders via `LawsContent` client component
- Search bar filters by location name
- `LawsTable`: rows sorted alphabetically by location, columns: crest, location name, view button (opens external URL)
- JSON-LD WebPage schema

## Utilities Page (`app/utilities/page.tsx`)
- Reads `utilities.md` at build time, renders it with `MarkdownArticle` inside
  the same gray-900 card as the driver guide (see "Article typography")
- Content covers: startup costs (tables), recurring costs, revenue estimates, useful links, tips
- JSON-LD Article schema + `AuthorBox`

## About Us (`app/about-us/page.tsx`)
- Content sections from `t.pages.aboutUs.sections` (mission, data collection methodology, etc.)
- Legal disclaimer note + internal navigation links
- JSON-LD AboutPage schema

## Contact (`app/contact/page.tsx`)
- **Retired.** The content was merged into the `#contatti` section of Chi Siamo;
  the route survives as a `noindex` stub with a zero-delay meta refresh, because
  `output: 'export'` rules out a real 301
- Deliberately absent from `cypress/support/routes.ts` → `ROUTES` (it fails the
  indexing and metadata invariants those entries are held to); covered instead by
  `cypress/e2e/contact-redirect.cy.ts`

## Abbonamento (`app/abbonamento/page.tsx`)
- The paid-newsletter pitch: benefits, two plans (€5.90/month, €59/year, annual
  highlighted), Stripe customer-portal link, `Product` JSON-LD with both offers
- All copy — **including the Stripe URLs** — lives in `locales/it.json` under
  `pages.abbonamento`
- **Not in the main nav**: the desktop bar's seven labels already run wider than
  its container at `lg`. Entry points are the CTA under the home-page table and a
  footer link
- See "Stripe links and the placeholder guard" below

## Grazie (`app/grazie/page.tsx`)
- The Stripe Payment Link redirect target after a successful payment
- `robots: noindex` and deliberately absent from `public/sitemap.xml`: a
  post-payment confirmation, not content, and indexed it would compete with
  `/abbonamento/` for the same intent
- Carries no order details — a static export cannot read the Stripe session, and
  the entitlement comes from the webhook, not from this page loading. Anyone can
  open the URL directly, so the copy is written to survive that
- Tells anyone whose address was previously unsubscribed to email
  info@bandincc.it: MailerLite refuses API reactivation of such addresses, and
  this copy is the whole mitigation until the re-subscribe form exists
- `Celebration` renders a one-shot confetti burst plus balloons up the sides
  (`lg+`). Keyframes live in `globals.css`; everything is CSS, prerendered, and
  dropped entirely under `prefers-reduced-motion: reduce`. The hero itself stays
  plain — no emoji in or above the h1

## Legal Pages
- **Privacy Policy** (`app/privacy-policy/page.tsx`): sections from `t.pages.privacyPolicy.sections`, last updated date. Section 6 names Stripe and MailerLite as art. 28 processors, section 9 covers deletion-on-request, section 10 covers the transfers those two imply — **the headings are numbered in the JSON**, so inserting a section means renumbering the ones after it
- **Cookie Policy** (`app/cookie-policy/page.tsx`): sections from `t.pages.cookiePolicy.sections`, last updated date
- **Disclaimer** (`app/disclaimer/page.tsx`): array of paragraphs from `t.pages.disclaimer.description`

## 404 Page (`app/not-found.tsx`)
- Centered "404 Pagina non trovata" with link back to home

# Key Components — Implementation Details

## Navigation (`components/Navigation.tsx`)
- **Client component** (uses `useState`, `usePathname`)
- Desktop: horizontal nav bar, sticky top, centered links, active link highlighted with `bg-blue-600`
- Mobile: hamburger menu button, slides in a 264px-wide sidebar from the left, full-height overlay with backdrop click-to-close
- Nav items: Come diventare autista?, Leggi Regionali, Strumenti Utili, Calcolatore Guadagni, FAQ e Glossario, Chi Siamo. Home is the crest, not a label; Contatti is a section of Chi Siamo
- **The bar is full.** Those six labels plus the crest already run wider than the container at `lg` — that is why the wordmark is hidden below `xl`. A seventh label needs a layout rethink, which is why `/abbonamento` is reached from the home-page CTA and the footer instead

## Table (`components/Table.tsx`)
- **Client component** — uses `useEffect` + `useState` for `now` (avoids SSR date mismatch)
- Sorts data by deadline descending (newest first)
- Row coloring: green background (`bg-green-900/40`) if deadline >= now, gray if expired
- Mobile: uses emoji icons for column headers, full text on desktop
- Location links go to `/bandi/{location-slug}`
- Amount formatted with German locale (`de-DE`) for thousand separators (e.g., 1.000)

## MapView (`components/MapView.tsx`)
- **Client component**, dynamically imported with `ssr: false`
- Uses raw Leaflet API (not react-leaflet JSX) via `useRef` for map instance
- OpenStreetMap tiles
- Circle markers: green (#22c55e) for active deadlines, red (#f87171) for expired
- Popups show location, amount, deadline, and link to detail page
- Auto-fits bounds to show all markers (max zoom 8)

## CookieBanner (`components/CookieBanner.tsx`)
- Checks `localStorage` for `cookie-consent` key
- Fixed bottom bar with Accept/Decline buttons
- "More info" opens a modal overlay explaining cookies
- Saves `'accepted'` or `'declined'` to localStorage

## FAQAccordion (`components/FAQAccordion.tsx`)
- Single-open accordion: clicking one item closes the previously open one
- Animated expand/collapse using CSS grid-rows transition
- Answers rendered as markdown via `react-markdown`, styled by `.rich-text`
  (see "Article typography") — most of them run to several paragraphs
- Chevron icon rotates 180° when open

## AuthorBox (`components/AuthorBox.tsx`)
- Static attribution: "Scritto da: La Redazione di BandiNCC" with link to about-us page

## CurrentDate (`components/CurrentDate.tsx`)
- Client component that renders current date in Italian locale format
- Uses `useEffect` to set date only on client (prevents SSR/client mismatch)
- Returns null until date is set (no flash of wrong content)

# Translations / i18n

All site content is centralized in `locales/it.json`. The `lib/translations.ts` module provides:
- `getTranslations()`: returns the full Italian translations object
- `getTranslation(key)`: dot-notation key lookup (e.g., `'nav.home'`)

The JSON structure includes:
- `nav`: navigation labels
- `dashboard`: tab labels, search placeholder, no-results message
- `table`: column header labels
- `footer`: copyright template with `{year}` placeholder
- `pages.*`: per-page content (title, subtitle, description, sections, meta title/description)
- `pages.glossario`: NCC glossary terms and definitions

# SEO

- Every page has a `Metadata` export with title and description
- Root layout sets `metadataBase` to `https://bandincc.it`
- Title template: `%s | Bandi NCC Italia`
- JSON-LD structured data on every page (WebSite, Dataset, GovernmentService, FAQPage, Article, WebApplication, AboutPage, ContactPage, WebPage)
- FAQ page schema includes both FAQ items and glossary terms as Question/Answer pairs
- `robots: { index: true, follow: true }`
- Bid detail pages use `generateStaticParams()` for full SSG
- Home page uses ISR with 1-hour revalidation

# Service Worker (`public/service-worker.js`)
- Cache-first strategy for same-origin static assets (CSS, JS, images under `/assets/` or matching common extensions)
- Cache name: `licenzia-static-v1`
- Skips waiting on install, claims clients on activate
- Cleans up old caches on activation

# Prerender Script (`scripts/prerender.js`)
- Legacy script (likely from pre-Next.js migration)
- Generates static HTML for specific routes by modifying `dist/index.html` with route-specific metadata
- Routes: `/`, `/how-to-become-driver`, `/regional-laws`, `/utilities`, `/disclaimer`, `/faq`
- Not actively used with Next.js (Next.js handles SSG/ISR natively)

# How to Add/Edit Data

## Adding a new NCC bid

**`data/data.json` is pushed by hand, by the colleague.** The crawler
(`bandincc-crawler`) never writes to it and never pushes — it produces candidate
results, the colleague reviews them, and then commits `data/data.json` himself.
So a `Update data.json` commit appearing on a branch is a deliberate human push,
not an automated job, and "wait for the crawler to land something" is not a
thing that happens on its own.

Add an entry to `data/data.json`. Required fields:
```json
{
  "location": "Comune di NomeCittà (XX)",
  "deadline": "YYYY-MM-DD",
  "url": "https://official-bid-url.it/...",
  "amount": 5,
  "image": "https://upload.wikimedia.org/.../Stemma.png",
  "latitude": "41.1234",
  "longitude": "12.5678"
}
```
- `location`: Municipality name with province code in parentheses. This is used to generate the slug for `/bandi/[bid]` via `toSlug()` in `lib/slug.ts`. Keep it trimmed — a trailing space would leak into the URL.
- `latitude`/`longitude`: Stored as **strings** in JSON, converted to numbers by `lib/data.ts`. Optional but needed for map display.
- `image`: URL to the municipality's coat of arms (usually from Wikimedia).
- A new bid detail page at `/bandi/{slug}` is automatically generated at build time via `generateStaticParams()`.

## Adding a new regional law
Add to `data/laws.json`:
```json
{
  "location": "RegionOrCityName",
  "image": "https://upload.wikimedia.org/.../Stemma.png",
  "url": "https://link-to-regulation.pdf"
}
```
- The `location` field is also used for matching laws to bids on detail pages (case-insensitive includes).

## Adding a new FAQ
Add to `data/faq.json`:
```json
{
  "question": "Question text?",
  "answer": "Answer with **markdown** and [links](/)."
}
```

## Adding a glossary term
Add to `locales/it.json` at `pages.glossario.terms`:
```json
{ "term": "Term Name", "definition": "Definition text with **markdown**." }
```

# Important Patterns & Gotchas

## SSR Hydration Mismatch Avoidance
Several components use `useEffect` + `useState` to defer date/time calculations to the client. This prevents mismatches between server-rendered HTML and client-rendered HTML (since `Date.now()` differs). Used in:
- `Table.tsx` — `now` state for deadline coloring
- `MapView.tsx` — `now` state for marker colors
- `BidStatus.tsx` — `isActive` state
- `CurrentDate.tsx` — formatted date string

## Leaflet Dynamic Import Pattern
Leaflet requires `window` (DOM APIs). All Leaflet components must be dynamically imported with `ssr: false`:
```tsx
const MapView = dynamic(() => import('./MapView'), { ssr: false, loading: () => <Spinner /> })
```
`BidDetailMapWrapper.tsx` exists solely to wrap `BidDetailMap.tsx` with this pattern.

## Hero Section Pattern
Every page uses the same hero section structure: background image
(`/images/driver.png`), `<HeroCrest />`, h1 title and h2 subtitle with
semi-transparent black background overlays. Text content comes from
translations.

**`HeroCrest` is currently disabled** — `ENABLED = false` in
`components/HeroCrest.tsx` makes it render `null`. The newsletter ad carries the
full logo on every page, so the hero crest was a second copy of the same mark
within a screen of the first. The switch is one constant rather than a
commented-out `<HeroCrest />` in each of the 13 heroes: one line to flip instead
of 26, and no unused imports to trip `noUnusedLocals`. The call sites stay in
place and render nothing. Two tests in `routes.cy.ts` assert its absence and
carry instructions for flipping back.

When enabled it is absolutely placed inside the hero, so the hero keeps exactly
the height its headings give it, and is `hidden xl:block`: only at xl is the
content column pinned at `max-w-5xl` with the h1 on one line, leaving a clear
strip on the right. Below xl the h1 wraps and its background block fills the
row. It goes immediately after the hero's opening tag, before the `<h1>`.

## Ad Slots
Three slots exist in the markup, all live, all carrying `NewsletterAd` — the
house ad for the paid newsletter:

- **Home banner** (`app/page.tsx`) — `variant="banner"`, above the table.
- **Desktop side rails** (`app/layout.tsx`) — `<SideAdSlot/>` either side of the
  content column, `hidden xl:flex`, sticky at `calc(50vh - 300px)` for a
  600px-tall creative. `SideAdSlot` is a **client** component only so it can
  read `usePathname()` and render nothing on `/abbonamento` and `/grazie` —
  advertising the subscription next to the checkout reads as broken, and the
  layout is a server component that cannot branch on the route.
- **Bid detail strip** (`app/bandi/[bid]/page.tsx`) — `variant="strip"`, between
  the hero and the bid card, in the 90px slot that used to hold an empty "EGAF"
  placeholder. Fixed height from sm up only; at 390px the row would clip.

The rails shrink the content column at xl: they cannot go below
`min-w-[160px]` + `px-4`, so the centre column absorbs the difference (it has
`min-w-0` and a `max-w-5xl` basis). `responsive.cy.ts` guards against that
tipping into horizontal scroll.

**`NewsletterAd`'s design is a placeholder** pending a real creative. It is
styled as a finished block rather than a dashed outline because it ships to
production; copy lives at the top level of `locales/it.json` under
`newsletterAd`, next to `nav`/`footer`, since it is not tied to one page.

## Article typography (`.article-body`)
**`@tailwindcss/typography` is not a dependency.** `prose prose-invert` appears
in several places in this codebase and generates **no CSS at all** — those
classes are inert. Combined with preflight, which flattens headings, lists and
tables to body copy, that is why the two markdown pages used to render as one
undifferentiated wall of text, and why they carried a `\n\n` → `\n\n&nbsp;\n\n`
substitution to fake paragraph spacing. Both are gone.

The replacement is plain CSS in `app/globals.css`, in two layers:

- **`.rich-text`** — block rhythm, lists, links, emphasis, callouts. Enough for
  short markdown on its own; that is what `FAQAccordion` uses. **14 of the 17
  FAQ answers are multi-paragraph**, and with only the inert `prose` classes
  they rendered as one solid block.
- **`.article-body`** — layered on top for long-form: a heading scale, prose
  capped at 70ch, tables. `MarkdownArticle` emits both classes.

`--rich-gap` is the one knob: it sets a surface's vertical rhythm.

`/how-to-become-driver` and `/utilities` render through
`components/MarkdownArticle.tsx`, which exists for the two things that need
extra DOM rather than extra rules:

- **`table`** is wrapped in `.article-table`, which scrolls horizontally. The
  cost tables have no readable layout below ~32rem, so on a phone the table
  scrolls inside its own box rather than widening the page.
- **`li`** lifts a leading ✅ / ❌ out of the text and into the marker slot,
  tagging the item `.article-glyph` so the CSS drops the bullet it would
  otherwise draw right beside the glyph. The glyphs stay in the `.md` so the
  source still reads as a checklist.

**These rules sit after `@tailwind utilities`**, so on a specificity tie they
beat a utility class. Do not try to recolour a `.rich-text` block with a
`text-…` utility on the same element — change the rule, or scope one to the
call site. (The home page's SEO sections are single paragraphs and stay on
plain utilities for that reason; they only lost their inert `prose` classes.)

**No `prose` class survives anywhere in `app/` or `components/`.** If you see
one reappear, it is doing nothing. Tests anchor on `sel.richText`,
`sel.articleBody` and `.article-table`; `home.cy.ts` finds an SEO section's
body with `h3 + div`.

Installing `@tailwindcss/typography` was considered and rejected: the palette
would need overriding anyway, the whole `prose` ruleset ships whether or not
the content uses those elements, and neither of the two DOM-level fixes above
is something a stylesheet plugin can do.

## Slug Generation
Bid detail page slugs come from `toSlug()` in `lib/slug.ts`, used by `Table`, `MapView`, `generateStaticParams()` and `findBid()` alike. It strips diacritics, folds typographic quotes and dashes to their ASCII equivalents, drops anything still outside printable ASCII, then hyphenates whitespace:

- `"Comune di Milano (MI)"` → `"Comune-di-Milano-(MI)"`
- `"Comune di Forlì (FC)"` → `"Comune-di-Forli-(FC)"`
- `"Comune di Colle di Val d’Elsa (Toscana)"` → `"Comune-di-Colle-di-Val-d'Elsa-(Toscana)"`

Static export writes one directory per slug, so slugs must stay ASCII to be portable across GitHub Pages and Netlify. `cypress/e2e/data-integrity.cy.ts` enforces this.

## Law ↔ Bid Matching
On bid detail pages, `findLaw()` matches a bid's location against law entries using `location.toLowerCase().includes(law.location.toLowerCase())`. So a law with `location: "Milano"` matches a bid with `location: "Comune di Milano (MI)"`.

## Content Sources
- **Most page text**: Lives in `locales/it.json` under `pages.*` keys (titles, subtitles, descriptions, section content)
- **Long-form articles**: `howToBecomeDriver.md` and `utilities.md` — read at build time via `fs.readFileSync`, rendered by `MarkdownArticle`
- **FAQ/Glossary**: `data/faq.json` (FAQ) + `locales/it.json` `pages.glossario.terms` (glossary)

## Stripe links and the placeholder guard
The three Stripe URLs (two Payment Links + the customer-portal login link) live
in `locales/it.json` → `pages.abbonamento`, not in a component, so the mandatory
`?locale=it` cannot get dropped — without it Stripe renders checkout in the
*browser's* language.

Test-mode Payment Links, portal links and signing secrets **do not copy to live
mode**, so the JSON ships `TODO_…` placeholders until the live account exists.
`lib/subscription.ts` → `isPlaceholderLink()` is what `/abbonamento/` and
`/grazie/` branch on: with a placeholder in place the page renders a greyed-out
"Attivazione a breve" instead of a button, and `/grazie/` drops its portal link.
A live page whose "Abbonati" button 404s is worse than one that says
subscriptions are not open yet.

`cypress/e2e/subscription.cy.ts` reads the same helper and asserts whichever
contract applies — the placeholder state now, the live contract (https,
`buy.stripe.com`, `locale=it`, `target=_blank`) the moment a real URL lands. It
is written that way on purpose: a test that went red until someone pasted the
URLs would block every unrelated deploy, and with it the newsletter that chains
off `deploy.yml`.

Full state of the payments work: `stripe-worker/STATUS.md`. Its
**"→ Resume here — the go-live runbook"** is the canonical answer to "what is
left to do?" — twelve ordered steps, starting with the OSS registration. Read it
before answering that question, and verify anything it claims is done rather than
restating it blind.

## Stripe test mode vs live mode (`STRIPE_MODE`)
Staging runs Stripe's **test** account so the whole funnel — page → Payment Link
→ checkout → `/grazie/` → Worker → MailerLite — can be exercised without moving
money or touching a real subscriber. Production runs live. `output: 'export'`
means there is no server to branch on a hostname, so the choice is made **at
build time** from `STRIPE_MODE` (server components only — no `NEXT_PUBLIC_`
prefix, never in the browser bundle).

Each link in `locales/it.json` carries both URLs: `href` (live) and `hrefTest`
(test). `lib/subscription.ts` → `stripeHref(link, mode)` picks one;
`currentStripeMode()` defaults to **`live`**, deliberately — a build that loses
the variable shows staging the placeholder state, whereas defaulting to `test`
would let a test checkout reach the real domain, taking a card, charging nobody
and granting nothing. An empty slot resolves to a `TODO_` URL rather than
falling through to the other mode.

`isTestModeLink()` keys on Stripe's `test_` path segment
(`buy.stripe.com/test_…`, `billing.stripe.com/p/login/test_…`): both modes share
a host, so that segment is the only discriminator a static build has.

**The gate is the Cypress suite, not the build.** `e2e.yml` takes a
`stripe-mode` input and puts `STRIPE_MODE` on *both* the build step and the test
step; `deploy.yml` passes `live`, `netlify-deploy.yml` passes `test`.
`subscription.cy.ts` resolves the links for that mode and then asserts those
exact hrefs in the DOM, so a mode/link mismatch — or the two steps disagreeing —
fails the suite before either deploy job runs. That is why `stripeHref` is a
pure resolver that never throws.

`/abbonamento` renders an amber "ambiente di prova" banner in test mode only;
test checkout is otherwise indistinguishable from the real thing.

Worker side: two deployments, since a Stripe signing secret is per mode and one
Worker holds one `STRIPE_WEBHOOK_SECRET` — `bandincc-stripe` (live keys, real
MailerLite group) and `bandincc-stripe-test` (`wrangler --env test`, test keys,
throwaway group). Named environments inherit **no** vars or secrets; all four
secrets must be uploaded again with `--env test`.

## Affiliate Link
The home page section about participating in bids contains a Keliweb affiliate link for PEC (certified email): `https://www.keliweb.it/billing/aff.php?aff=6108`. This is in `locales/it.json` within the `pages.home.sections[3].content` markdown string.

## Image Strategy
- No local images except `/public/images/driver.png` (hero background)
- All coat-of-arms images are external URLs (mostly Wikimedia Commons)
- `next.config.mjs` allows `upload.wikimedia.org` domain for `next/image`, but pages currently use raw `<img>` tags

## Duplicate PostCSS Configs
Both `postcss.config.mjs` (ESM) and `postcss.config.cjs` (CommonJS) exist. The `.mjs` uses `tailwindcss` plugin, the `.cjs` uses `@tailwindcss/postcss`. This can cause confusion — Next.js picks one based on its module resolution.

# Current Data Stats (as of last update)
- 90 NCC bid entries in `data/data.json`
- 13 regional law entries in `data/laws.json`
- 17 FAQ entries in `data/faq.json`
