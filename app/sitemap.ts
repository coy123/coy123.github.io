import type { MetadataRoute } from 'next'
import { publishedBids } from '@/lib/data'
import { toSlug } from '@/lib/slug'

/**
 * The sitemap, generated at build time.
 *
 * It used to be a hand-maintained `public/sitemap.xml`, and by 2026-09 it had
 * drifted badly: two entries pointed at slugs `toSlug()` does not produce
 * (`Comune-di-Forl%C3%AC-(FC)` and `Comune-di-Calto-(RO,-Veneto)`, both hard
 * 404s), 63 of the 102 detail pages were missing altogether, and every single
 * `<loc>` omitted the trailing slash `next.config.mjs` requires, so all 50 were
 * a 301 before they resolved. Deriving it from the same `publishedBids` the
 * home page renders removes that whole class of drift.
 *
 * **The published set, never `bids`.** A bando inside its seven-day
 * subscriber-only window must not appear here — the sitemap is the one place a
 * withheld comune could leak without any page linking to it. `publishedBids`
 * is already filtered (lib/data.ts), which is why this file imports it rather
 * than filtering again; `cypress/e2e/embargo.cy.ts` holds the guarantee.
 *
 * Every URL ends in a slash, because `trailingSlash: true` means the slashless
 * form is a redirect rather than a page.
 */

/**
 * Required by `output: 'export'`: a metadata route is a Route Handler
 * underneath, and Next refuses to collect one for a static export unless it is
 * told the output never varies per request. Without this the build fails with
 * `export const dynamic = "force-static" ... not configured on route
 * "/sitemap.xml"`.
 */
export const dynamic = 'force-static'

const ORIGIN = 'https://bandincc.it'

type Entry = MetadataRoute.Sitemap[number]

/**
 * The content pages, with the priorities the hand-written file carried.
 *
 * This list must stay equal to `ROUTES` in `cypress/support/routes.ts` — the
 * two are deliberately not shared (the app does not import from `cypress/`,
 * which `tsconfig.json` excludes), so `sitemap.cy.ts` asserts the equality
 * instead. `/grazie` and `/contact` are absent from both for the same reason:
 * one is a `noindex` post-payment page, the other a `noindex` redirect stub.
 */
const STATIC_PAGES: { path: string; changeFrequency: Entry['changeFrequency']; priority: number }[] =
  [
    { path: '/', changeFrequency: 'weekly', priority: 1.0 },
    { path: '/abbonamento', changeFrequency: 'monthly', priority: 0.9 },
    { path: '/how-to-become-driver', changeFrequency: 'monthly', priority: 0.8 },
    { path: '/regional-laws', changeFrequency: 'monthly', priority: 0.8 },
    { path: '/faq', changeFrequency: 'monthly', priority: 0.8 },
    { path: '/utilities', changeFrequency: 'monthly', priority: 0.7 },
    { path: '/income-calculator', changeFrequency: 'monthly', priority: 0.7 },
    { path: '/about-us', changeFrequency: 'monthly', priority: 0.6 },
    { path: '/privacy-policy', changeFrequency: 'yearly', priority: 0.3 },
    { path: '/cookie-policy', changeFrequency: 'yearly', priority: 0.3 },
    { path: '/disclaimer', changeFrequency: 'yearly', priority: 0.3 },
  ]

/** `/` stays `/`; everything else gains the trailing slash. */
const absolute = (path: string): string => `${ORIGIN}${path === '/' ? '/' : `${path}/`}`

export default function sitemap(): MetadataRoute.Sitemap {
  const pages: MetadataRoute.Sitemap = STATIC_PAGES.map(({ path, changeFrequency, priority }) => ({
    url: absolute(path),
    changeFrequency,
    priority,
  }))

  const bandi: MetadataRoute.Sitemap = publishedBids.map((bid) => ({
    url: absolute(`/bandi/${toSlug(bid.location)}`),
    // The day the bando entered `data/data.json`. A detail page is otherwise
    // immutable, so this is genuinely its last modification — and it cannot
    // leak anything, because an embargoed row is not in this list at all.
    lastModified: bid.detectedAt,
    changeFrequency: 'monthly',
    priority: 0.6,
  }))

  return [...pages, ...bandi]
}
