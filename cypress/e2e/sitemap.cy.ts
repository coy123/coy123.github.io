import { ROUTES } from '../support/routes'
import { bidPath, bids, embargoedBids, toSlug } from '../support/site'

/**
 * `/sitemap.xml`, which `app/sitemap.ts` generates at build time.
 *
 * It was a hand-maintained file until 2026-09, and the drift was the whole
 * argument for generating it: two `<loc>` values pointed at slugs `toSlug()`
 * never produces (hard 404s), 63 of 102 detail pages were missing, and every
 * entry omitted the trailing slash `trailingSlash: true` requires, so each one
 * was a 301 before it resolved. Nothing in the suite noticed, because nothing
 * asserted completeness or resolvability — only that embargoed slugs were
 * absent.
 *
 * So these tests are written as an exact-set comparison rather than a
 * spot-check. A missing page and a stray page both fail.
 */

const ORIGIN = 'https://bandincc.it'

/** `<loc>` values, in document order. */
const locations = (xml: string): string[] =>
  [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((match) => match[1].trim())

/** A `<loc>` reduced to the path Cypress can request against `baseUrl`. */
const toPath = (loc: string): string => loc.slice(ORIGIN.length)

const readSitemap = (): Cypress.Chainable<string[]> =>
  cy.request('/sitemap.xml').then((response) => {
    expect(response.status, 'status').to.eq(200)
    expect(response.headers['content-type'], 'content-type').to.match(/xml/)
    return locations(response.body as string)
  })

describe('sitemap.xml', () => {
  it('is a well-formed urlset', () => {
    cy.request('/sitemap.xml').then((response) => {
      const body = response.body as string
      expect(body, 'declaration').to.contain('<?xml')
      expect(body, 'namespace').to.contain('http://www.sitemaps.org/schemas/sitemap/0.9')
      // A parser, not a regex: an unescaped `&` in a comune name would slip
      // past the string checks above and break the file for a crawler.
      const doc = new DOMParser().parseFromString(body, 'application/xml')
      expect(doc.getElementsByTagName('parsererror').length, 'parse errors').to.eq(0)
      expect(doc.documentElement.nodeName, 'root element').to.eq('urlset')
    })
  })

  it('lists every content page and every published bando, and nothing else', () => {
    const expected = [
      ...ROUTES.map((route) => `${ORIGIN}${route.path === '/' ? '/' : `${route.path}/`}`),
      ...bids.map((bid) => `${ORIGIN}${bidPath(bid)}`),
    ].sort()

    readSitemap().then((locs) => {
      // Sorted set comparison, so the failure message names the exact missing
      // or extra URL rather than just a count mismatch.
      expect([...locs].sort()).to.deep.eq(expected)
    })
  })

  it('has no duplicate entries', () => {
    readSitemap().then((locs) => {
      expect(locs.length, 'unique entries').to.eq(new Set(locs).size)
    })
  })

  it('uses absolute URLs that all end in a slash', () => {
    // `next.config.mjs` sets `trailingSlash: true`. A slashless entry resolves
    // only through a 301, which is what the whole hand-written file did.
    readSitemap().then((locs) => {
      locs.forEach((loc) => {
        expect(loc, 'origin').to.match(new RegExp(`^${ORIGIN}/`))
        expect(loc, `${loc} ends in a slash`).to.match(/\/$/)
      })
    })
  })

  it('omits the noindex pages', () => {
    // /grazie is the post-payment page and /contact a redirect stub; both are
    // deliberately absent from `ROUTES` too.
    readSitemap().then((locs) => {
      expect(locs.some((loc) => loc.includes('/grazie'))).to.eq(false)
      expect(locs.some((loc) => loc.includes('/contact'))).to.eq(false)
    })
  })

  it('never lists an embargoed bando', function () {
    if (!embargoedBids.length) this.skip()

    readSitemap().then((locs) => {
      const xml = locs.join('\n')
      embargoedBids.forEach((bid) => {
        expect(xml, `${bid.location} in sitemap`).to.not.contain(toSlug(bid.location))
      })
    })
  })

  it('points only at URLs that resolve without a redirect', function () {
    // Export-only: `serve out` answers the real exported paths, so this is the
    // check that would have caught both hard 404s. Against `next dev` an
    // unknown /bandi/<slug> throws `missing param in generateStaticParams()`
    // rather than 404ing, so the result would not mean anything.
    if (!Cypress.env('staticExport')) this.skip()

    readSitemap().then((locs) => {
      locs.forEach((loc) => {
        cy.request({ url: toPath(loc), followRedirect: false }).then((response) => {
          expect(response.status, `${loc}`).to.eq(200)
        })
      })
    })
  })
})
