/**
 * Single source of truth for the tests: everything is derived from the same
 * JSON the app itself renders, so adding a bid/law/FAQ never requires touching
 * a spec.
 */
import bidsJson from '../../data/data.json' with { type: 'json' }
import lawsJson from '../../data/laws.json' with { type: 'json' }
import faqJson from '../../data/faq.json' with { type: 'json' }
import translations from '../../locales/it.json' with { type: 'json' }
import { toSlug } from '../../lib/slug.ts'
import { trimStrings } from '../../lib/trim.ts'
import {
  RELEASE_DELAY_DAYS,
  currentDay,
  detectionDay,
  hasExpired,
  isPublished,
  releaseCutoff,
} from '../../lib/embargo.ts'
import {
  REGIONS,
  bidsInRegion,
  countByRegion,
  regionById,
  regionOf,
} from '../../lib/regions.ts'
import {
  CREST_EAGER_ROWS,
  CREST_SIZE_DETAIL,
  CREST_SIZE_TABLE,
  CREST_WIDTHS,
  crestUrl,
} from '../../lib/crest.ts'

export interface RawBid {
  location: string
  deadline: string
  url: string
  amount: number
  image: string
  /**
   * As the file spells it: lowercase. A bare `YYYY-MM-DD` in every row today;
   * older rows carried an ISO instant, and `detectionDay` still reads both.
   */
  detectedat?: string
  /** The Italian calendar day that instant belongs to, as `lib/data.ts` derives it. */
  detectedAt?: string
  latitude?: string
  longitude?: string
}

export interface RawLaw {
  location: string
  image: string
  url: string
}

export interface FaqEntry {
  question: string
  answer: string
}

/**
 * The rows exactly as data/data.json stores them, untrimmed. Only the source
 * hygiene checks in test/data-integrity.test.ts should use this — assert against
 * `bids` everywhere else, since that is what the app actually renders.
 */
export const rawBids: RawBid[] = bidsJson as RawBid[]

/**
 * Every row, trimmed (lib/trim.ts) — embargoed ones included, and with the
 * same `detectedat` → `detectedAt` normalisation `lib/data.ts` applies on
 * read. Without it every row would look undated here and the suite would
 * happily assert that nothing is ever held back.
 */
export const allBids: RawBid[] = rawBids.map((bid) => {
  const trimmed = trimStrings(bid)
  return { ...trimmed, detectedAt: detectionDay(trimmed.detectedat) }
})

/* ------------------------------------------------------------------ */
/* The release delay                                                   */
/* ------------------------------------------------------------------ */

/**
 * A bando detected less than `RELEASE_DELAY_DAYS` ago is subscriber-only: the
 * newsletter has it, the site does not. `lib/data.ts` applies the split on the
 * server at build time, so the embargoed rows are not in the exported HTML at
 * all — see cypress/e2e/embargo.cy.ts, which is the spec that proves it.
 *
 * The helpers are imported from the app rather than reimplemented, so the
 * suite cannot drift from the rule it is checking.
 *
 * The one exception is a bando whose scadenza has already passed: it is
 * published whatever its detection date says, because the archive is
 * backfilled with old bandi and there is no head start left to sell on one.
 *
 * One nuance worth stating: the site resolves the cutoff when `next build`
 * runs, this file when the spec runs. Both are Italian calendar days, so they
 * agree unless a run straddles midnight in Rome — which would take a build and
 * a test on either side of it. `nearCutoff` names the rows in that band so a
 * count assertion can allow for them instead of flaking.
 */
export { RELEASE_DELAY_DAYS, currentDay, detectionDay, hasExpired, isPublished, releaseCutoff }

/** What the public site renders: everything past its seven-day window, or scaduto. */
export const bids: RawBid[] = allBids.filter((bid) => isPublished(bid))

/** Held back for subscribers. Must appear nowhere in the exported HTML. */
export const embargoedBids: RawBid[] = allBids.filter((bid) => !isPublished(bid))

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Rows a build and a test either side of midnight in Rome could disagree
 * about: their release lands on today's or yesterday's cutoff, or — since an
 * expired bando is published regardless — their scadenza is today or
 * yesterday. Both boundaries move at the same instant, and a count assertion
 * allows for the rows sitting on either.
 */
export const nearCutoff: RawBid[] = allBids.filter(
  (bid) =>
    bid.detectedAt === releaseCutoff() ||
    bid.detectedAt === releaseCutoff(Date.now() - DAY_MS) ||
    detectionDay(bid.deadline) === currentDay() ||
    detectionDay(bid.deadline) === currentDay(Date.now() - DAY_MS)
)
/* ------------------------------------------------------------------ */
/* Regions                                                             */
/* ------------------------------------------------------------------ */

/**
 * The regions tab derives everything from `lib/regions.ts`, so the specs do
 * too — adding a bando, or fixing a province code in `data/data.json`, never
 * means editing a spec.
 *
 * Note the type: `regionOf` reads `latitude`/`longitude` as numbers, while a
 * `RawBid` still holds the strings `data/data.json` stores. `asLocatable`
 * applies the same conversion `lib/data.ts` does on read.
 */
export { REGIONS, bidsInRegion, countByRegion, regionById, regionOf }

export const asLocatable = (bid: RawBid) => ({
  location: bid.location,
  latitude: bid.latitude ? Number(bid.latitude) : undefined,
  longitude: bid.longitude ? Number(bid.longitude) : undefined,
})

/** The published bandi of one region, in the shape the region rule reads. */
export const bidsOfRegion = (id: string) =>
  bids.filter((bid) => regionOf(asLocatable(bid))?.id === id)

/** Published bandi per region id. */
export const regionCounts = (): Record<string, number> =>
  countByRegion(bids.map(asLocatable))

/**
 * What the picker actually reports: open and closed bandi per region id.
 * Built from the app's own two rules — `regionOf` and `isActive`, which is
 * `hasExpired` — so the specs carry no second opinion about either.
 */
export const regionTallies = (at: number = Date.now()) => {
  const byRegion: Record<string, { open: number; closed: number; total: number }> =
    Object.fromEntries(REGIONS.map((region) => [region.id, { open: 0, closed: 0, total: 0 }]))
  for (const bid of bids) {
    const region = regionOf(asLocatable(bid))
    if (!region) continue
    const tally = byRegion[region.id]
    tally.total += 1
    if (isActive(bid, at)) tally.open += 1
    else tally.closed += 1
  }
  return byRegion
}

/** A region that currently has bandi — specs pick one at runtime, as elsewhere. */
export const anyPopulatedRegion = () =>
  REGIONS.find((region) => bidsOfRegion(region.id).length > 0)

/** A region with none, or undefined on the (unlikely) day every region has one. */
export const anyEmptyRegion = () =>
  REGIONS.find((region) => bidsOfRegion(region.id).length === 0)

export const laws: RawLaw[] = lawsJson as RawLaw[]
export const faqs: FaqEntry[] = faqJson as FaqEntry[]
export const t = translations
export { toSlug, crestUrl, CREST_WIDTHS, CREST_EAGER_ROWS }

/** The crest `src` a table row is expected to render, at the size it uses. */
export const tableCrest = (image: string) => crestUrl(image, CREST_SIZE_TABLE)
/** The crest `src` a bid detail hero is expected to render. */
export const detailCrest = (image: string) => crestUrl(image, CREST_SIZE_DETAIL)

export const glossaryTerms = t.pages.glossario.terms as {
  term: string
  definition: string
}[]

/* ------------------------------------------------------------------ */
/* Formatting helpers — mirror the exact formatters used by the app.    */
/* ------------------------------------------------------------------ */

/** Matches `formatAmount` in components/Table.tsx (de-DE thousand separators). */
export const formatAmount = (amount: number) =>
  new Intl.NumberFormat('de-DE').format(amount)

/** Matches `formatDate` in components/Table.tsx (short month). */
export const formatShortDate = (isoDate: string) =>
  new Date(isoDate).toLocaleDateString('it-IT', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

/** Matches `formatDate` in app/bandi/[bid]/page.tsx (long month). */
export const formatLongDate = (isoDate: string) =>
  new Date(isoDate).toLocaleDateString('it-IT', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

/**
 * Rough markdown → text conversion, good enough to assert that a rendered
 * answer really came from the matching source string.
 */
export const plainText = (markdown: string) =>
  markdown
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`#>]/g, '')
    .replace(/^\s*[-+]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim()

/* ------------------------------------------------------------------ */
/* Href helpers                                                        */
/* ------------------------------------------------------------------ */

/**
 * `trailingSlash: true` makes `next/link` emit the canonical `/faq/` form,
 * while the raw `<a>` tags in `Table.tsx` and the Leaflet popups in
 * `MapView.tsx` keep the `/faq` form they were authored with. Both resolve to
 * the same page, so href assertions accept either.
 */
export const hrefSelector = (path: string) =>
  path === '/' ? 'a[href="/"]' : `a[href="${path}"], a[href="${path}/"]`

/** Compares two paths ignoring a trailing slash. */
export const samePath = (actual: string, expected: string) =>
  actual.replace(/\/+$/, '') === expected.replace(/\/+$/, '')

/** Collapses every run of whitespace (incl. &nbsp;) so text can be compared. */
export const normalize = (value: string) =>
  value.replace(/ /g, ' ').replace(/\s+/g, ' ').trim()

/* ------------------------------------------------------------------ */
/* Derived fixtures                                                    */
/* ------------------------------------------------------------------ */

// Trailing slash included: `next.config.mjs` sets `trailingSlash: true`, so the
// slashless form is a 301 on both hosts. This is the canonical path, and it is
// what Table.tsx and MapView.tsx emit — assertions compare against it directly.
export const bidPath = (bid: RawBid) => `/bandi/${toSlug(bid.location)}/`

/**
 * Open or closed, as the app decides it: Italian calendar days, so a bando is
 * active for the whole of its scadenza. `Table.tsx`, `MapView.tsx`,
 * `BidStatus.tsx` and the newsletter all go through `hasExpired`, and so does
 * this — the specs must not carry a second opinion about the boundary.
 */
export const isActive = (bid: RawBid, at: number = Date.now()) =>
  !hasExpired(bid.deadline, currentDay(at))

export const bidsWithCoordinates = bids.filter(
  (bid) => Boolean(bid.latitude) && Boolean(bid.longitude)
)

/** Same matching rule as `findLaw` in app/bandi/[bid]/page.tsx. */
export const findLaw = (location: string) =>
  laws.find((law) => location.toLowerCase().includes(law.location.toLowerCase()))

/**
 * Deadlines move as the calendar moves, so pick the sample bids at runtime
 * rather than hardcoding them. Returns `undefined` when the dataset happens to
 * contain none of that kind — callers skip the test in that case.
 */
export const anyActiveBid = () => bids.find((bid) => isActive(bid))
export const anyExpiredBid = () => bids.find((bid) => !isActive(bid))
export const anyBidWithLaw = () => bids.find((bid) => Boolean(findLaw(bid.location)))
export const anyBidWithoutLaw = () => bids.find((bid) => !findLaw(bid.location))
/** A location whose slug needs diacritic stripping (e.g. "Forlì" → "Forli"). */
export const anyAccentedBid = () =>
  bids.find((bid) => toSlug(bid.location) !== bid.location.replace(/\s+/g, '-'))

/** Bids sorted the way components/Table.tsx sorts them: newest deadline first. */
export const bidsSortedByDeadlineDesc = () =>
  [...bids].sort(
    (a, b) => new Date(b.deadline).getTime() - new Date(a.deadline).getTime()
  )

/** Laws sorted the way components/LawsTable.tsx sorts them. */
export const lawsSortedByLocation = () =>
  [...laws].sort((a, b) => a.location.localeCompare(b.location))
