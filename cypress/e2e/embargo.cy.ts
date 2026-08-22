import { sel } from '../support/selectors'
import {
  RELEASE_DELAY_DAYS,
  allBids,
  bidPath,
  bids,
  embargoedBids,
  nearCutoff,
  t,
  toSlug,
} from '../support/site'

/**
 * The seven-day release delay (lib/embargo.ts).
 *
 * A bando detected less than a week ago belongs to the subscribers: the
 * newsletter mails it on day 0, the site shows it on day 7. The promise the
 * subscription makes is only worth anything if the site keeps it, and "keeps
 * it" here means something stricter than "does not render it" — the row must
 * not be in the exported HTML at all. A blurred `<div>` with the comune's name
 * inside is one devtools click away from being free.
 *
 * That is what the first block asserts, against the raw response body rather
 * than the rendered DOM.
 *
 * These specs stay green on a dataset where nothing is embargoed — every row
 * older than the window, or (before the field existed) undated, counts as
 * published. The ones that need a held-back bando skip themselves rather than
 * pass vacuously.
 */

const locked = t.dashboard.locked

/**
 * The site resolves the cutoff when `next build` runs, the spec when it runs.
 * Both are UTC day strings, so they can only disagree if the two straddled
 * midnight — and then only about rows sitting exactly on the boundary.
 */
const tolerance = nearCutoff.length

describe('release delay', () => {
  it('holds back nothing that is older than the window', () => {
    // The complement of the leak check: everything past its seven days must be
    // in the published set, or the delay is quietly hiding the whole archive.
    const stale = embargoedBids.filter((bid) => {
      const age = (Date.now() - new Date(bid.detectedAt!).getTime()) / 86_400_000
      return age > RELEASE_DELAY_DAYS + 1
    })
    expect(
      stale.map((bid) => `${bid.location} (${bid.detectedAt})`),
      'bandi held back past their release date'
    ).to.be.empty
  })

  describe('the exported HTML', () => {
    it('carries no trace of an embargoed bando', function () {
      if (!embargoedBids.length) this.skip()

      cy.request('/').then((response) => {
        const body = response.body as string
        embargoedBids.forEach((bid) => {
          expect(body, `${bid.location} location`).to.not.contain(bid.location)
          expect(body, `${bid.location} source url`).to.not.contain(bid.url)
          expect(body, `${bid.location} slug`).to.not.contain(toSlug(bid.location))
          // The crest would name the comune just as loudly as the label does.
          expect(body, `${bid.location} crest`).to.not.contain(
            new URL(bid.image).pathname.split('/').pop()!
          )
        })
      })
    })

    it('keeps embargoed slugs out of the sitemap', function () {
      if (!embargoedBids.length) this.skip()

      // public/sitemap.xml is maintained by hand, so this is the one guard
      // against a slug being pasted in before the bando is public.
      cy.request('/sitemap.xml').then((response) => {
        embargoedBids.forEach((bid) => {
          expect(response.body as string, `${bid.location} in sitemap`).to.not.contain(
            toSlug(bid.location)
          )
        })
      })
    })
  })

  describe('the locked rows', () => {
    beforeEach(() => {
      cy.useDesktop()
      cy.visitPage('/')
    })

    it('appears only when something is actually held back', function () {
      if (embargoedBids.length) {
        cy.get(sel.lockedRows).should('exist')
      } else {
        cy.get(sel.lockedRows).should('not.exist')
      }
    })

    it('renders no text inside the blurred rows', function () {
      if (!embargoedBids.length) this.skip()
      // Empty bars: there is nothing under the blur to recover.
      cy.get(sel.lockedRows).invoke('text').should('match', /^\s*$/)
      cy.get(sel.lockedRows).find('a, img').should('not.exist')
    })

    it('is not counted as a bid row', function () {
      if (!embargoedBids.length) this.skip()
      cy.get(sel.tableRow).should('have.length', bids.length)
    })

    it('announces how many bandi are waiting', function () {
      if (!embargoedBids.length) this.skip()

      cy.get(sel.lockedOverlay)
        .invoke('text')
        .then((text) => {
          const shown = Number(text.match(/\d+/)?.[0])
          expect(shown, 'count in the heading').to.be.within(
            embargoedBids.length - tolerance,
            embargoedBids.length + tolerance
          )
        })
    })

    it('says when the next one opens up', function () {
      if (!embargoedBids.length) this.skip()
      // The block empties on its own, and saying so is what separates a
      // paywall from a promise with a date on it.
      cy.get(sel.lockedOverlay)
        .invoke('text')
        .should('match', /si sblocca (domani|tra \d+ giorni)/)
    })

    it('leads to the subscription page', function () {
      if (!embargoedBids.length) this.skip()
      cy.get(sel.lockedOverlay)
        .should('have.attr', 'aria-label', locked.ariaLabel)
        .click()
      cy.assertPath('/abbonamento')
    })

    it('steps aside while a search is running', function () {
      if (!embargoedBids.length) this.skip()
      // It says "N bandi are covered", not "N of your matches are covered",
      // and over a filtered list only the second reading is available.
      cy.get(sel.searchInput).type(bids[0].location.slice(0, 5))
      cy.get(sel.lockedRows).should('not.exist')
      cy.get(sel.searchInput).clear()
      cy.get(sel.lockedRows).should('exist')
    })
  })

  describe('the map', () => {
    it('says in words what it cannot show in pins', function () {
      if (!embargoedBids.length) this.skip()
      cy.useDesktop()
      cy.visitPage('/')
      // Scoped to the desktop bar: the mobile tab bar carries the same label
      // and is only `sm:hidden`, so a bare `cy.contains` grabs that one and
      // fails on an invisible element.
      cy.get(sel.desktopTabBar).contains('button', t.dashboard.tabs.map).click()
      cy.contains(locked.mapCta).should('have.attr', 'href').and('match', /^\/abbonamento/)
    })
  })

  describe('detail pages', () => {
    it('serves one for every bando, embargoed included', () => {
      // The newsletter links straight to /bandi/<slug>/ on day 0. A missing
      // page would 404 exactly the readers who are paying for the head start.
      allBids.forEach((bid) => {
        cy.assertReachable(encodeURI(`${bidPath(bid)}/`))
      })
    })

    it('marks an embargoed page noindex', function () {
      if (!embargoedBids.length) this.skip()
      cy.visitPage(bidPath(embargoedBids[0]))
      cy.get('head meta[name="robots"]')
        .should('have.attr', 'content')
        .and('match', /noindex/)
    })

    it('leaves a published page indexable', function () {
      if (!bids.length) this.skip()
      cy.visitPage(bidPath(bids[0]))
      cy.get('head meta[name="robots"][content*="noindex"]').should('not.exist')
    })
  })
})
