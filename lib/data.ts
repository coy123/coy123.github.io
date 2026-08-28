import data from '@/data/data.json'
import { TableData } from '@/types'
import { trimStrings } from './trim'
import {
  RELEASE_DELAY_DAYS,
  currentDay,
  daysUntilRelease,
  detectionDay,
  hasExpired,
  isPublished,
  releaseCutoff,
} from './embargo'

/** A row exactly as it is stored in data/data.json. */
export interface RawBid {
  image: string
  location: string
  amount: number
  deadline: string
  url: string
  /**
   * All lowercase, and staying that way: this is the key the curation step
   * writes by hand, and a capital A that has to be remembered on every future
   * row is a bug waiting to happen — one that would fail *open*, publishing a
   * bando that should have been held back. It is folded into `detectedAt` at
   * the same boundary that turns the coordinate strings into numbers, so no
   * other module sees this spelling.
   *
   * Nor is it always a bare date. What the file holds today is an ISO instant
   * — "2026-07-31T22:00:00.000Z", midnight in Rome serialised as UTC — and a
   * plain "2026-08-01" is equally valid. `detectionDay` reads either.
   */
  detectedat?: string
  latitude?: string
  longitude?: string
}

/**
 * Why a bando's `deadline` is unusable, or null when it is fine. The four
 * checks mirror `data-integrity.cy.ts` → "uses ISO deadlines that parse to
 * real dates", one for one, so the build and the suite can never disagree
 * about what a readable deadline is.
 *
 * The last one is the interesting one: "2026-02-31" matches the shape and
 * parses happily, to the 3rd of March. Only the round-trip catches it.
 */
const deadlineProblem = (deadline: unknown): string | null => {
  if (typeof deadline !== 'string' || !deadline) return 'it is missing or empty'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline)) return 'it is not in YYYY-MM-DD form'
  const parsed = new Date(deadline)
  if (Number.isNaN(parsed.getTime())) return 'it is not a real date'
  if (parsed.toISOString().slice(0, 10) !== deadline) {
    return `that day does not exist in that month (it would mean ${parsed
      .toISOString()
      .slice(0, 10)})`
  }
  return null
}

/**
 * Fails the build on a deadline nothing downstream can read.
 *
 * `data/data.json` is edited by hand, and a bad `deadline` is silent in a way
 * the other fields are not: `hasExpired` treats an unreadable one as NOT
 * expired (lib/embargo.ts), which is the right direction for a paywall but
 * means the row simply renders green forever instead of looking broken. The
 * Cypress suite catches it and blocks both deploys, but only after a full
 * build and a five-minute run — and `npm run build` and `next dev` used to
 * accept it in silence, so a curation typo could sit unnoticed for a while.
 *
 * Throwing here moves that to the first second of the build, names the row,
 * and shows up locally. It runs at module scope, so any page that imports this
 * module — the home page, every bid detail page — fails the export with it.
 *
 * The value checked is the TRIMMED one, because that is what the app uses; a
 * stray trailing space is a hygiene matter for the suite, not a reason to stop
 * a deploy. `detectedat` is deliberately not checked here — it is guarded by
 * `data-integrity.cy.ts` alone, and the failure mode of a build has to stay
 * "an old bando keeps showing", never "the site will not build".
 */
const assertReadableDeadline = (bid: { location?: string; deadline?: string }, index: number) => {
  const problem = deadlineProblem(bid.deadline)
  if (!problem) return

  throw new Error(
    `data/data.json: unreadable deadline on row ${index} ` +
      `(${bid.location || 'no location'}): ${JSON.stringify(bid.deadline)} — ${problem}. ` +
      'Deadlines must be a bare Italian calendar day in YYYY-MM-DD form, e.g. "2026-08-28". ' +
      'See "One rule for scaduto" in CLAUDE.md.'
  )
}

/**
 * Every bid, with its strings trimmed (see lib/trim.ts) and the coordinates
 * converted from the strings the JSON stores to numbers.
 *
 * This is the *whole* dataset, embargoed rows included. Only the bid detail
 * pages may use it — everything that renders a list of bandi to the public
 * must use `publishedBids` (see the release delay below).
 */
export const bids: TableData[] = (data as RawBid[]).map((row, index) => {
  // `detectedat` is pulled out rather than spread through: everything
  // downstream reads the normalised `detectedAt`, and carrying both would put
  // two spellings of one fact in every row — with the raw one riding along
  // into the client payload.
  const { detectedat, ...bid } = trimStrings(row)
  assertReadableDeadline(bid, index)
  return {
    ...bid,
    detectedAt: detectionDay(detectedat),
    // A value that was nothing but whitespace is now empty, so it correctly
    // falls through to undefined rather than becoming NaN.
    latitude: bid.latitude ? Number(bid.latitude) : undefined,
    longitude: bid.longitude ? Number(bid.longitude) : undefined,
  }
})

/* ------------------------------------------------------------------ */
/* Release delay                                                       */
/* ------------------------------------------------------------------ */

/*
 * The rule itself lives in lib/embargo.ts, which imports nothing so the
 * Cypress specs can pull it in directly. Re-exported here because this module
 * is where the rest of the app already comes for bid data.
 */
export {
  RELEASE_DELAY_DAYS,
  currentDay,
  daysUntilRelease,
  detectionDay,
  hasExpired,
  isPublished,
  releaseCutoff,
}

// Both halves of every comparison, resolved once while `next build` runs. Two
// calls to `releaseCutoff()` either side of midnight in Rome would put a row
// in neither list or in both.
const cutoff = releaseCutoff()
const today = currentDay()

/**
 * The bandi the public site may render: detected more than a week ago, plus
 * every bando whose scadenza has already passed whatever its detection date
 * says (see `hasExpired` — the archive is backfilled with old bandi, and those
 * have no head start left to sell).
 */
export const publishedBids: TableData[] = bids.filter((bid) => isPublished(bid, cutoff, today))

/** The bandi still inside their subscriber-only window. Never sent to a client. */
export const embargoedBids: TableData[] = bids.filter((bid) => !isPublished(bid, cutoff, today))

/**
 * How many bandi are being held back. This number — and nothing else about
 * them — is what the locked rows on the home page are allowed to reveal.
 */
export const embargoedCount = embargoedBids.length

/**
 * Days until the next bando comes out from behind the delay, or null when
 * nothing is held back. The locked rows turn it into "il prossimo si sblocca
 * tra N giorni" — a reason to come back, and the one thing besides the count
 * that can be said without naming a comune.
 */
export const nextReleaseInDays: number | null = embargoedBids.length
  ? Math.min(...embargoedBids.map((bid) => daysUntilRelease(bid.detectedAt!)))
  : null

/** The home page table and map: published rows only. */
export async function getTableData(): Promise<TableData[]> {
  return publishedBids
}
