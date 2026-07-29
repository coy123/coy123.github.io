/**
 * Coats of arms in `data/*.json` point at whatever Wikimedia URL was handy when
 * the entry was added: 250px, 500px, 960px and 1920px thumbnails plus plenty of
 * full-size originals. They are all painted into a 32px (or 80px) circle, so
 * the page pulls megabytes to fill a few kilobytes' worth of pixels.
 *
 * Wikimedia serves a thumbnail of any *supported* width from a predictable URL,
 * so the size can be chosen at render time instead of being frozen into the
 * data:
 *
 *   direct  /wikipedia/it/c/c2/Ottana-Stemma.png
 *        -> /wikipedia/it/thumb/c/c2/Ottana-Stemma.png/120px-Ottana-Stemma.png
 *   thumb   /wikipedia/commons/thumb/e/e1/Bari-Stemma.svg/960px-Bari-Stemma.svg.png
 *        -> /wikipedia/commons/thumb/e/e1/Bari-Stemma.svg/120px-Bari-Stemma.svg.png
 *
 * IMPORTANT: the width is not free. Wikimedia refuses to render arbitrary sizes
 * on demand and answers `400 Bad Request` for anything outside a fixed set of
 * buckets — 64px and 160px both fail, which is why the sizes below look odd for
 * a 32px and an 80px box. The buckets in `CREST_WIDTHS` were verified against
 * the live service for every crest in `data/*.json`;
 * `cypress/e2e/data-integrity.cy.ts` pins the list so a future edit cannot
 * silently reintroduce a width that 400s.
 *
 * Anything that is not an `upload.wikimedia.org` path in one of the two shapes
 * above is returned untouched — a few crests are hosted by the comune itself,
 * and a wrong guess would render a broken image.
 */

const UPLOAD_HOST = 'upload.wikimedia.org'

/** Widths Wikimedia will actually serve. Anything else answers 400. */
export const CREST_WIDTHS = [40, 60, 120, 250, 500] as const

/**
 * For the `w-8 h-8` (32px) crest in the bid and law tables. 60px is the bucket
 * closest to the 64px a 2x display wants, and it costs ~7 KB against ~25 KB at
 * the next bucket up — worth it across 89 rows.
 */
export const CREST_SIZE_TABLE = 60
/**
 * For the `w-20 h-20` (80px) crest on bid detail pages. 160px would be ideal
 * but 400s; 250 is the next bucket, and a detail page loads exactly one.
 */
export const CREST_SIZE_DETAIL = 250

/**
 * How many table rows are treated as above the fold. Their crests load eagerly
 * so the visible table paints immediately; every row below stays
 * `loading="lazy"` and only fetches once scrolled near.
 *
 * (A `fetchpriority="high"` hint on these would help too, but react-dom 18.3.1
 * does not know the prop and warns in development. Worth adding on React 19.)
 */
export const CREST_EAGER_ROWS = 12

export function crestUrl(src: string, width: number): string {
  let url: URL
  try {
    url = new URL(src)
  } catch {
    return src
  }

  if (url.hostname !== UPLOAD_HOST) return src

  const segments = url.pathname.split('/').filter(Boolean)
  if (segments[0] !== 'wikipedia') return src

  if (segments[2] === 'thumb') {
    // .../thumb/{a}/{ab}/{File}/{N}px-{name} — only the width needs changing.
    const last = segments[segments.length - 1]
    const resized = last.replace(/^\d+px-/, `${width}px-`)
    if (resized === last) return src
    segments[segments.length - 1] = resized
  } else {
    // /wikipedia/{project}/{a}/{ab}/{File} — build the thumb path ourselves.
    if (segments.length !== 5) return src
    const file = segments[4]
    // SVG sources are rasterised, so the thumbnail gains a .png suffix.
    segments.splice(2, 0, 'thumb')
    segments.push(/\.svg$/i.test(file) ? `${width}px-${file}.png` : `${width}px-${file}`)
  }

  url.pathname = `/${segments.join('/')}`
  // Several source URLs carry Wikipedia's own `utm_*` analytics query, which is
  // noise on a request we are making ourselves.
  url.search = ''
  return url.toString()
}
