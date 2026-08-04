/**
 * Currently disabled — flip `ENABLED` to bring it back.
 *
 * The newsletter ad now carries the full logo on every page, so the hero crest
 * was the second copy of the same mark within a screen of the first. The switch
 * lives here rather than as a commented-out `<HeroCrest />` in each of the 13
 * heroes: one line to flip instead of 26, and no unused imports to trip
 * `noUnusedLocals`. The call sites stay in place and render nothing.
 *
 * `cypress/e2e/routes.cy.ts` asserts the *absence* of the crest while this is
 * false; those two tests flip with it.
 */
const ENABLED = false

/**
 * The crest that sits in the right-hand strip of a page hero.
 *
 * Absolutely placed, so the hero keeps exactly the height its heading and
 * subheading give it. Only from xl: there the content column is pinned at its
 * max-w-5xl width and the h1 fits on one line, leaving a clear strip on the
 * right. Below xl the h1 wraps and its background block fills the row, with
 * nowhere for the crest to sit.
 *
 * `pointer-events-none` keeps it out of the way of anything overlapping it, and
 * the drop shadow is what stops it disappearing into the light patches of
 * driver.png.
 */
export default function HeroCrest() {
  if (!ENABLED) return null

  return (
    <img
      src="/images/logo-crest.svg"
      alt="Stemma Bandi NCC"
      className="hidden xl:block absolute right-2 top-1/2 -translate-y-1/2 h-[64%] w-auto pointer-events-none select-none drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]"
    />
  )
}
