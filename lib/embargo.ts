/**
 * The seven-day release delay, on its own so both sides of it can share one
 * implementation.
 *
 * A newly detected bando is subscriber-only for its first week: the newsletter
 * mails it the day it lands in `data/data.json`, the site shows it seven days
 * later. That head start is what the subscription sells.
 *
 * A bando whose scadenza has already passed is outside all of that — see
 * `hasExpired`. It is published immediately and the newsletter never mails it,
 * because backfilling the archive with an old bando is not news to anybody.
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
 * The Italian calendar day a stored date belongs to, or `undefined` when the
 * value is absent or holds something no `Date` can read.
 *
 * Named for `detectedat`, which is what it was written for, but it is the one
 * parser for every date `data/data.json` stores — `hasExpired` folds
 * `deadline` through it too, so the two fields can be compared as day strings
 * without one of them quietly being a UTC day and the other a Roman one.
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

/** Today, as an Italian calendar day. The other half of every comparison here. */
export const currentDay = (at: number = Date.now()): string => romeDay(at)

/** The most recent detection day that is already public, as "YYYY-MM-DD". */
export const releaseCutoff = (at: number = Date.now()): string =>
  romeDay(at - RELEASE_DELAY_DAYS * DAY_MS)

/**
 * Whether a bando's scadenza is already behind us, in Italian calendar days.
 *
 * Strictly before today: a bando expiring *today* has not expired yet, so it
 * is still mailed, still embargoed, and still painted as open.
 *
 * This is the *only* deadline comparison in the codebase. The table, the map,
 * the detail page's status line and the newsletter's row colours all come
 * through here, so "scaduto" means one thing everywhere. They each used to
 * compare instants against `new Date(deadline)`, which is midnight UTC of that
 * day — so a bando went grey at 02:00 Rome on its own scadenza, hours before
 * it actually closed, and the newsletter could mail a row that already looked
 * dead.
 *
 * An unreadable deadline is NOT expired. Every branch that consumes this
 * treats expiry as a reason to publish or to stay quiet, so the unreadable
 * case has to fall through to the ordinary seven-day rule rather than release
 * a row early. It should never get this far in any case: `lib/data.ts` throws
 * on such a row while `next build` reads the file, and `data-integrity.cy.ts`
 * fails the suite on one too.
 */
export const hasExpired = (deadline?: string, today: string = currentDay()): boolean => {
  const day = detectionDay(deadline)
  return day !== undefined && day < today
}

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
 *
 * An expired bando is published whatever its detection date says. The archive
 * is filled in backwards — old bandi are added long after their scadenza so
 * the history is complete — and holding one of those back for a week would be
 * absurd twice over: it is public record already, and there is nothing left to
 * get a head start on. The convention is to date those rows with their own
 * deadline, which lands them outside the window anyway; this clause is what
 * makes the outcome right even when that is forgotten, and it costs nothing,
 * because a row this releases early is one no subscriber could have used.
 */
export const isPublished = (
  bid: { detectedAt?: string; deadline?: string },
  cutoff: string = releaseCutoff(),
  today: string = currentDay()
): boolean =>
  !bid.detectedAt || bid.detectedAt <= cutoff || hasExpired(bid.deadline, today)

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
