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

# Git and Deployment
Do not ever use git commands! Don't commit or push or anything!
Do not ever try to deploy. You can only run on dev mode locally.
Do not ever run or build the application (no `npm run dev`, `npm run build`, `next build`, etc.). The user runs it themselves and reports back.
There are two branches: staging and master. Development is done on staging. Staging is connected to Netlify for deployment and master is connected to GitHub Pages for deployment. The domain is www.bandincc.it

## CI/CD Pipelines (`.github/workflows/`)
- **`deploy.yml`**: Triggers on push/PR to `master`. Builds with `npm ci && npm run build`, deploys `out/` to GitHub Pages (with `.nojekyll` file).
- **`netlify-deploy.yml`**: Triggers on push/PR to `staging`. Builds and deploys `out/` to Netlify via `netlify deploy --dir=out --prod`. Uses `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID` secrets.
- **`netlify.toml`**: Also present for Netlify build config (command: `npm run build`, publish: `.next`, uses `@netlify/plugin-nextjs`). Note: the GitHub Action workflow overrides this by deploying `out/` directly.

# Bash Commands
- `npm run dev`: build and run the project locally (uses Turbopack)
- `npm run build`: production build via Next.js
- `npm run lint`: run Next.js linter
- `npm run test:e2e`: run the Cypress suite against `next dev`
- `npm run test:e2e:static`: run it against the built `out/` export (run `npm run build` first)
- `npm run test:e2e:open`: same as `test:e2e`, with the Cypress UI

# Testing
End-to-end tests live in `cypress/` (TypeScript, Cypress 15) and are documented
in `cypress/README.md`. They are intended to gate deploys — the CI wiring is not
in place yet.

Cypress 15 needs **Node >= 20.1** (the repo pins 22 via `.nvmrc`); on Node 18 it
dies during binary verification with `Invalid regular expression flags`. On
Ubuntu/WSL it also needs a one-off `apt-get install` of the Electron system
libraries — the exact command is in `cypress/README.md`.

A clean run against `next dev` is 516 passing / 19 pending / 0 failing. The
pending ones are deliberate opt-ins (external link checks) or export-only
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
│   ├── about-us/page.tsx       # About us page
│   ├── contact/page.tsx        # Contact page (info@bandincc.it)
│   ├── cookie-policy/page.tsx  # Cookie policy (content from translations)
│   ├── disclaimer/page.tsx     # Legal disclaimer
│   ├── faq/page.tsx            # FAQ + Glossary (accordion UI)
│   ├── how-to-become-driver/   # Guide article
│   │   ├── page.tsx            # Renders markdown via react-markdown
│   │   └── howToBecomeDriver.md # Article content
│   ├── income-calculator/      # NCC income calculator
│   │   ├── page.tsx            # Calculator form + result modal
│   │   └── layout.tsx          # JSON-LD WebApplication schema
│   ├── privacy-policy/page.tsx # Privacy policy (content from translations)
│   ├── regional-laws/page.tsx  # Regional laws table
│   └── utilities/              # Useful tools/resources article
│       ├── page.tsx            # Renders markdown via react-markdown
│       └── utilities.md        # Article content
├── components/                 # Reusable React components
│   ├── AuthorBox.tsx           # Author attribution box
│   ├── CookieBanner.tsx        # GDPR cookie consent banner + modal
│   ├── CurrentDate.tsx         # Client-side date display (avoids SSR mismatch)
│   ├── FAQAccordion.tsx        # Expandable accordion for FAQ/glossary items
│   ├── Footer.tsx              # Site footer (privacy, cookie, disclaimer links)
│   ├── HomeContent.tsx         # Home page client component (tabs, search, table/map)
│   ├── LawsContent.tsx         # Regional laws client component (search + table)
│   ├── LawsTable.tsx           # Table for regional law entries
│   ├── MapView.tsx             # Leaflet map with circle markers for all bids
│   ├── Navigation.tsx          # Desktop + mobile nav with hamburger menu
│   └── Table.tsx               # Main bids table with deadline sorting/coloring
├── data/                       # Static JSON data files
│   ├── data.json               # NCC bid entries (location, deadline, amount, url, image, lat/lng)
│   ├── faq.json                # FAQ question/answer pairs (markdown in answers)
│   └── laws.json               # Regional law entries (location, image, url)
├── lib/                        # Utility modules
│   ├── calculator.ts           # Income calculator logic (enums, cost maps, calculateIncome)
│   ├── data.ts                 # Data loader (reads data.json, converts lat/lng to numbers)
│   └── translations.ts         # Translation helper (reads locales/it.json)
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
- Renders markdown with `react-markdown` + `remark-gfm` (supports tables)
- Empty lines preserved by replacing `\n\n` with `\n\n&nbsp;\n\n`
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
- Reads `utilities.md` at build time, renders with `react-markdown` + `remark-gfm`
- Content covers: startup costs (tables), recurring costs, revenue estimates, useful links, tips
- JSON-LD Article schema + `AuthorBox`

## About Us (`app/about-us/page.tsx`)
- Content sections from `t.pages.aboutUs.sections` (mission, data collection methodology, etc.)
- Legal disclaimer note + internal navigation links
- JSON-LD AboutPage schema

## Contact (`app/contact/page.tsx`)
- Description paragraphs (supports array of strings in translations)
- Email contact card: info@bandincc.it
- JSON-LD ContactPage schema

## Legal Pages
- **Privacy Policy** (`app/privacy-policy/page.tsx`): sections from `t.pages.privacyPolicy.sections`, last updated date
- **Cookie Policy** (`app/cookie-policy/page.tsx`): sections from `t.pages.cookiePolicy.sections`, last updated date
- **Disclaimer** (`app/disclaimer/page.tsx`): array of paragraphs from `t.pages.disclaimer.description`

## 404 Page (`app/not-found.tsx`)
- Centered "404 Pagina non trovata" with link back to home

# Key Components — Implementation Details

## Navigation (`components/Navigation.tsx`)
- **Client component** (uses `useState`, `usePathname`)
- Desktop: horizontal nav bar, sticky top, centered links, active link highlighted with `bg-blue-600`
- Mobile: hamburger menu button, slides in a 264px-wide sidebar from the left, full-height overlay with backdrop click-to-close
- Nav items: Home, Come diventare autista?, Leggi Regionali, Strumenti Utili, Calcolatore Guadagni, FAQ e Glossario, Chi Siamo, Contatti

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
- Answers rendered as markdown via `react-markdown`
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
Every page uses the same hero section structure: background image (`/images/driver.png`), h1 title and h2 subtitle with semi-transparent black background overlays. Text content comes from translations.

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
- **Long-form articles**: `howToBecomeDriver.md` and `utilities.md` — read at build time via `fs.readFileSync`, rendered with react-markdown
- **FAQ/Glossary**: `data/faq.json` (FAQ) + `locales/it.json` `pages.glossario.terms` (glossary)

## Affiliate Link
The home page section about participating in bids contains a Keliweb affiliate link for PEC (certified email): `https://www.keliweb.it/billing/aff.php?aff=6108`. This is in `locales/it.json` within the `pages.home.sections[3].content` markdown string.

## Image Strategy
- No local images except `/public/images/driver.png` (hero background)
- All coat-of-arms images are external URLs (mostly Wikimedia Commons)
- `next.config.mjs` allows `upload.wikimedia.org` domain for `next/image`, but pages currently use raw `<img>` tags

## Duplicate PostCSS Configs
Both `postcss.config.mjs` (ESM) and `postcss.config.cjs` (CommonJS) exist. The `.mjs` uses `tailwindcss` plugin, the `.cjs` uses `@tailwindcss/postcss`. This can cause confusion — Next.js picks one based on its module resolution.

# Current Data Stats (as of last update)
- 89 NCC bid entries in `data/data.json`
- 13 regional law entries in `data/laws.json`
- 17 FAQ entries in `data/faq.json`
