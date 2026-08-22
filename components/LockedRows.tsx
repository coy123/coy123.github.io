import Link from 'next/link'
import { getTranslations } from '@/lib/translations'

/**
 * The subscriber-only rows at the top of the home table: a blurred skeleton
 * standing in for the bandi that are still inside their seven-day window
 * (lib/data.ts → RELEASE_DELAY_DAYS), with the subscription CTA over it.
 *
 * **There is nothing here to un-blur.** The bars are empty elements — no text
 * node, no href, no crest — so the embargoed locations never reach the
 * exported HTML in the first place. The blur is decoration on a skeleton, not
 * a CSS cover over real data, which a reader could strip with one devtools
 * click. The split that makes that true happens on the server, at build time:
 * `app/page.tsx` passes down `publishedBids` and this component only ever
 * receives a count.
 *
 * The count is the single thing the embargo is allowed to reveal, and it is
 * the part that does the selling.
 */

/**
 * How many rows are drawn, which is deliberately not how many are held back —
 * the true number lives in the heading, where it can be read.
 *
 * The ceiling keeps a dozen withheld bandi from becoming a dead zone between
 * the header and the real data. The floor is structural: the CTA card is
 * absolutely positioned over this block, and on a single held bando a one-row
 * skeleton is 4.5rem of backdrop under a card twice that tall, which would
 * spill over the real rows underneath.
 */
const MIN_SKELETON_ROWS = 3
const MAX_SKELETON_ROWS = 4

/**
 * Deliberately uneven, so the block reads as withheld content rather than as a
 * loading state that never finishes. One entry per rendered row.
 */
const NAME_WIDTHS = ['w-40', 'w-56', 'w-32', 'w-48']

export default function LockedRows({
  count,
  nextInDays = null,
}: {
  count: number
  /** Days until the first of them goes public. Null when nothing is held. */
  nextInDays?: number | null
}) {
  if (count < 1) return null

  const t = getTranslations()
  const locked = t.dashboard.locked
  const heading =
    count === 1 ? locked.headingOne : locked.heading.replace('{count}', String(count))
  // A date, not just a wall: the reader learns the block empties on its own,
  // which is the honest version of the offer and a reason to come back.
  const countdown =
    nextInDays === null
      ? null
      : nextInDays <= 1
        ? locked.countdownOne
        : locked.countdown.replace('{days}', String(nextInDays))

  return (
    <div className="relative">
      {/* The skeleton. `aria-hidden` because a screen reader should get the
          overlay's real sentence, not four rows of empty divs. */}
      <div aria-hidden className="locked-rows select-none">
        {Array.from({
          length: Math.min(Math.max(count, MIN_SKELETON_ROWS), MAX_SKELETON_ROWS),
        }).map((_, index) => (
          <div
            key={index}
            // h-[4.5rem] rather than the rows' min-h-[4.5rem]: same height, but
            // `sel.tableRow` in cypress/support/selectors.ts keeps meaning "a
            // real bid row" and never counts these.
            className="flex items-center border-b border-gray-600 h-[4.5rem] bg-gray-900/30"
          >
            <div className="p-2 w-16 sm:w-24 flex items-center justify-center">
              <div className="locked-bar w-8 h-8 rounded-full" />
            </div>
            <div className="p-2 flex-1 min-w-[15ch] flex justify-center sm:justify-start">
              <div className={`locked-bar h-3.5 max-w-full ${NAME_WIDTHS[index % NAME_WIDTHS.length]}`} />
            </div>
            <div className="p-2 w-14 sm:w-24 flex justify-center sm:justify-end">
              <div className="locked-bar h-3.5 w-6" />
            </div>
            <div className="p-2 w-20 sm:w-28 flex justify-center">
              <div className="locked-bar h-3.5 w-16" />
            </div>
            <div className="p-2 w-14 sm:w-24 flex justify-center">
              <div className="locked-bar h-7 w-full sm:w-16 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* One anchor, real text: cypress/e2e/links.cy.ts requires every link to
          have discernible text, and an overlay of empty divs would fail it. */}
      <div className="absolute inset-0 flex items-center justify-center p-2 sm:p-4">
        <Link
          href="/abbonamento"
          aria-label={locked.ariaLabel}
          className="group w-full max-w-md rounded-lg border border-gray-600 bg-gray-900/95 backdrop-blur-sm hover:border-blue-500 transition-colors px-4 py-3 sm:px-5 sm:py-4 text-center shadow-lg"
        >
          <p className="text-[10px] sm:text-[11px] uppercase tracking-widest text-amber-300">
            🔒 {locked.eyebrow}
          </p>
          <p className="text-base sm:text-lg font-bold text-white mt-1">{heading}</p>
          <p className="hidden sm:block text-xs text-gray-300 mt-1">{locked.text}</p>
          {countdown && <p className="text-xs text-gray-400 mt-1">{countdown}</p>}
          <span className="inline-block mt-3 bg-blue-600 group-hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors">
            {locked.cta}
          </span>
        </Link>
      </div>
    </div>
  )
}
