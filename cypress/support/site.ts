/**
 * Single source of truth for the tests: everything is derived from the same
 * JSON the app itself renders, so adding a bid/law/FAQ never requires touching
 * a spec.
 */
import bidsJson from '../../data/data.json'
import lawsJson from '../../data/laws.json'
import faqJson from '../../data/faq.json'
import translations from '../../locales/it.json'
import { toSlug } from '../../lib/slug'

export interface RawBid {
  location: string
  deadline: string
  url: string
  amount: number
  image: string
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

export const bids: RawBid[] = bidsJson as RawBid[]
export const laws: RawLaw[] = lawsJson as RawLaw[]
export const faqs: FaqEntry[] = faqJson as FaqEntry[]
export const t = translations
export { toSlug }

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

export const bidPath = (bid: RawBid) => `/bandi/${toSlug(bid.location)}`

export const isActive = (bid: RawBid, at: number = Date.now()) =>
  new Date(bid.deadline).getTime() >= at

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
