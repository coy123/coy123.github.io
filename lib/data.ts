import data from '@/data/data.json'
import { TableData } from '@/types'
import { trimStrings } from './trim'
import {
  RELEASE_DELAY_DAYS,
  daysUntilRelease,
  detectionDay,
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
 * Every bid, with its strings trimmed (see lib/trim.ts) and the coordinates
 * converted from the strings the JSON stores to numbers.
 *
 * This is the *whole* dataset, embargoed rows included. Only the bid detail
 * pages may use it — everything that renders a list of bandi to the public
 * must use `publishedBids` (see the release delay below).
 */
export const bids: TableData[] = (data as RawBid[]).map((row) => {
  // `detectedat` is pulled out rather than spread through: everything
  // downstream reads the normalised `detectedAt`, and carrying both would put
  // two spellings of one fact in every row — with the raw one riding along
  // into the client payload.
  const { detectedat, ...bid } = trimStrings(row)
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
export { RELEASE_DELAY_DAYS, daysUntilRelease, detectionDay, isPublished, releaseCutoff }

const cutoff = releaseCutoff()

/** The bandi the public site may render: detected more than a week ago. */
export const publishedBids: TableData[] = bids.filter((bid) => isPublished(bid, cutoff))

/** The bandi still inside their subscriber-only window. Never sent to a client. */
export const embargoedBids: TableData[] = bids.filter((bid) => !isPublished(bid, cutoff))

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
