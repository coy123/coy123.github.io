import Link from 'next/link'
import { getTranslations } from '@/lib/translations'

/**
 * House ad for the paid newsletter, filling the ad slots that were previously
 * commented out: the home-page banner and the two desktop side rails.
 *
 * **The design is a placeholder.** It is deliberately plain — brand colours, no
 * imagery beyond the crest — because the real creative has not been decided
 * yet. It is styled as a finished block rather than a dashed "ad goes here" box
 * only because it ships to production on the next deploy, and a live site
 * should not look broken while a design is being agreed.
 *
 * Both variants are one anchor wrapping real text: `cypress/e2e/links.cy.ts`
 * requires every link to have discernible text, which an image-only ad would
 * fail. The crest carries a real `alt` for the same reason — the accessibility
 * spec rejects an empty one, even on a decorative image inside a labelled link.
 */
export default function NewsletterAd({
  variant,
}: {
  variant: 'banner' | 'side' | 'strip'
}) {
  const t = getTranslations()
  const ad = t.newsletterAd

  if (variant === 'strip') {
    // The bid detail slot, designed at h-[90px]. Fixed height on sm and up
    // only: at 390px the heading and the button cannot share a 90px row without
    // clipping, so the strip is allowed to grow instead.
    return (
      <Link
        href="/abbonamento"
        aria-label={ad.ariaLabel}
        className="group flex flex-col sm:flex-row sm:items-center sm:h-[90px] gap-2 sm:gap-4 mb-3 w-full rounded-lg border border-gray-600 bg-gray-900 hover:border-blue-500 transition-colors px-4 py-3"
      >
        <img
          src="/images/logo-crest.svg"
          alt="Stemma Bandi NCC"
          className="hidden sm:block h-14 w-auto shrink-0"
        />
        <div className="grow min-w-0">
          <p className="text-[11px] uppercase tracking-widest text-amber-300">
            {ad.eyebrow}
          </p>
          <p className="text-sm sm:text-base font-bold text-white">{ad.heading}</p>
          <p className="hidden sm:block text-xs text-gray-300">{ad.textShort}</p>
        </div>
        <span className="shrink-0 text-center bg-blue-600 group-hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors">
          {ad.cta}
        </span>
      </Link>
    )
  }

  if (variant === 'side') {
    return (
      <Link
        href="/abbonamento"
        aria-label={ad.ariaLabel}
        className="group flex flex-col justify-center w-full h-[600px] rounded-lg border border-gray-600 bg-gray-900 hover:border-blue-500 transition-colors p-5 text-center"
      >
        <img
          src="/images/logo-crest.svg"
          alt="Stemma Bandi NCC"
          className="h-20 w-auto mx-auto mb-5"
        />
        <p className="text-[11px] uppercase tracking-widest text-amber-300 mb-2">
          {ad.eyebrow}
        </p>
        <p className="text-lg font-bold text-white mb-3">{ad.heading}</p>
        <p className="text-sm text-gray-300 mb-5">{ad.textShort}</p>
        <p className="text-xs text-gray-400 mb-3">{ad.price}</p>
        <span className="inline-block bg-blue-600 group-hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors">
          {ad.cta}
        </span>
      </Link>
    )
  }

  // Stacks below sm: at 390px the copy and a nowrap button side by side
  // overflow the column, and `responsive.cy.ts` fails the page for scrolling
  // horizontally.
  return (
    <Link
      href="/abbonamento"
      aria-label={ad.ariaLabel}
      className="group block mb-3 w-full sm:w-4/5 sm:mx-auto rounded-lg border border-gray-600 bg-gray-900 hover:border-blue-500 transition-colors p-4 sm:p-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
        <img
          src="/images/logo-crest.svg"
          alt="Stemma Bandi NCC"
          className="hidden sm:block h-24 w-auto shrink-0"
        />
        <div className="grow min-w-0">
          <p className="text-[11px] uppercase tracking-widest text-amber-300 mb-1">
            {ad.eyebrow}
          </p>
          <p className="text-lg sm:text-2xl font-bold text-white mb-1">{ad.heading}</p>
          <p className="text-xs sm:text-sm text-gray-300">
            <span className="sm:hidden">{ad.textShort}</span>
            <span className="hidden sm:inline">{ad.text}</span>
          </p>
        </div>
        <div className="shrink-0 w-full sm:w-auto text-center">
          <span className="block bg-blue-600 group-hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors">
            {ad.cta}
          </span>
          <span className="block mt-2 text-xs text-gray-400">{ad.price}</span>
        </div>
      </div>
    </Link>
  )
}
