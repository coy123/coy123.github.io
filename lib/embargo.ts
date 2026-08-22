/**
 * The seven-day release delay, on its own so both sides of it can share one
 * implementation.
 *
 * A newly detected bando is subscriber-only for its first week: the newsletter
 * mails it the day it lands in `data/data.json`, the site shows it seven days
 * later. That head start is what the subscription sells.
 *
 * Two things follow from how the site is built:
 *
 * 1. **The split happens on the server, at build time.** `output: 'export'`
 *    leaves no request-time server, so the cutoff is resolved once while
 *    `next build` runs and baked into the HTML. Deciding it in the browser —
 *    the way `Table.tsx` defers `now` for the deadline colours — would ship
 *    every embargoed location, URL and crest inside the page source, which is
 *    the one thing the embargo exists to prevent.
 *
 * 2. **The build is what releases a bando**, so `deploy.yml` carries a daily
 *    `schedule:` trigger. Without it a row detected eight days ago would stay
 *    hidden until somebody happened to push.
 *
 * Dates are compared as "YYYY-MM-DD" strings, so the rule flips at midnight
 * rather than at whatever hour the build ran. The day is the *Italian*
 * calendar day, not the UTC one, and that is not a detail: `data/data.json`
 * stores detections as midnight-in-Rome instants, so
 * "2026-07-31T22:00:00.000Z" is the 1st of August to everyone involved.
 * Slicing the ISO string would date it the 31st of July and release it a day
 * early.
 *
 * This file deliberately imports nothing — like `lib/slug.ts` and
 * `lib/crest.ts`, it is pulled straight into the Cypress specs
 * (`cypress/support/site.ts`), whose bundler resolves no `@/` aliases. The
 * suite therefore checks the rule the app actually applies, not a copy of it.
 */

export const RELEASE_DELAY_DAYS = 7

const DAY_MS = 24 * 60 * 60 * 1000

const ROME = 'Europe/Rome'

/**
 * A timestamp as its Italian calendar day, "YYYY-MM-DD". `en-CA` is the
 * ISO-ordered locale, which is what lets `isPublished` compare two of these
 * as plain strings and still be comparing dates.
 */
const romeDay = (at: number): string =>
  new Date(at).toLocaleDateString('en-CA', { timeZone: ROME })

/**
 * The day a raw `detectedat` value belongs to, or `undefined` when the field
 * is absent or holds something no `Date` can read.
 *
 * Both shapes the file may carry are accepted: the full ISO instant it holds
 * today ("2026-07-31T22:00:00.000Z") and a bare "2026-08-01". A bare date
 * parses as UTC midnight, and Italy is east of UTC, so it lands on the day it
 * names either way.
 */
export const detectionDay = (value?: string): string | undefined => {
  if (!value) return undefined
  const parsed = new Date(value).getTime()
  return Number.isNaN(parsed) ? undefined : romeDay(parsed)
}

/** The most recent detection day that is already public, as "YYYY-MM-DD". */
export const releaseCutoff = (at: number = Date.now()): string =>
  romeDay(at - RELEASE_DELAY_DAYS * DAY_MS)

/**
 * A row with no usable `detectedAt` counts as published — the field is absent,
 * or held a value `detectionDay` could not read. The failure mode of a build
 * has to be "an old bando stays visible", never "the table silently empties".
 *
 * For a paywall that fallback points the wrong way, though: a mistyped key or
 * a mangled date would let a brand-new bando skip its embargo, and nothing
 * about the page would look wrong. So it is not left to run silently —
 * `data-integrity.cy.ts` fails the suite on any row whose date is missing or
 * unreadable, and the suite gates both deploys.
 */
export const isPublished = (
  bid: { detectedAt?: string },
  cutoff: string = releaseCutoff()
): boolean => !bid.detectedAt || bid.detectedAt <= cutoff

/** A "YYYY-MM-DD" day as a whole number of days, for exact date arithmetic. */
const dayNumber = (day: string): number => Math.round(Date.parse(`${day}T00:00:00Z`) / DAY_MS)

/**
 * How many days until a detection day becomes public. Always >= 1 for a row
 * that is actually embargoed, so the locked rows can promise a date without
 * ever saying "in 0 days".
 *
 * Both operands are calendar days, never instants, so the answer does not
 * depend on the hour the build ran.
 */
export const daysUntilRelease = (detectedAt: string, at: number = Date.now()): number =>
  dayNumber(detectedAt) + RELEASE_DELAY_DAYS - dayNumber(romeDay(at))
