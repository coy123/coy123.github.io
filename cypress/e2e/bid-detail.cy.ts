import { sel } from '../support/selectors'
import {
  RawBid,
  anyAccentedBid,
  anyActiveBid,
  anyBidWithLaw,
  anyBidWithoutLaw,
  anyExpiredBid,
  bidPath,
  bids,
  findLaw,
  formatAmount,
  formatLongDate,
  hrefSelector,
  samePath,
  t,
  toSlug,
} from '../support/site'

const labels = t.pages.bidDetail.labels

/** Reads the value paragraph that sits next to a label span in the detail card. */
const valueFor = (label: string) => cy.contains('span', label).parent().find('p')

const INTERNAL_LINKS = ['/', '/regional-laws', '/income-calculator', '/how-to-become-driver']

describe('Bid detail pages', () => {
  describe('every generated slug resolves', () => {
    it('serves a page for all bids in data.json', () => {
      // generateStaticParams() emits one route per entry; a slug regression
      // (diacritics, punctuation) would silently 404 in production.
      bids.forEach((bid) => {
        cy.assertReachable(encodeURI(`${bidPath(bid)}/`))
      })
    })

    it('returns the 404 page for an unknown slug', function () {
      // Export-only: see the note in not-found.cy.ts.
      if (!Cypress.env('staticExport')) this.skip()
      cy.visitPage('/bandi/questo-bando-non-esiste', { failOnStatusCode: false })
      cy.contains('404').should('be.visible')
      cy.contains('Pagina non trovata').should('be.visible')
      cy.contains('a', 'Torna alla Home').click()
      cy.assertPath('/')
    })
  })

  describe('content', () => {
    const bid = bids[0]

    beforeEach(() => {
      cy.useDesktop()
      cy.visitPage(bidPath(bid))
    })

    it('renders the hero with the municipality name', () => {
      cy.get(sel.hero).first().within(() => {
        cy.get('h1').should('have.text', `Bando NCC – ${bid.location}`)
        cy.get('h2').should('have.text', t.pages.bidDetail.subtitle)
      })
    })

    it('sets the page title and description from the bid', () => {
      cy.title().should('eq', `Bando NCC ${bid.location} | Bandi NCC Italia`)
      cy.get('meta[name="description"]')
        .should('have.attr', 'content')
        .and('include', bid.location)
        .and('include', String(bid.amount))
        .and('include', bid.deadline)
    })

    it('renders the coat of arms', () => {
      cy.get(`img[alt="Stemma ${bid.location}"]`)
        .should('be.visible')
        .and('have.attr', 'src', bid.image)
    })

    it('renders the licence count and deadline', () => {
      valueFor(labels.licensesAvailable).should('have.text', formatAmount(bid.amount))
      valueFor(labels.deadline).should('have.text', formatLongDate(bid.deadline))
    })

    it('links to the official source in a new tab with a safe rel', () => {
      cy.contains('a', labels.viewBid)
        .should('have.attr', 'href', bid.url)
        .and('have.attr', 'target', '_blank')
      cy.contains('a', labels.viewBid)
        .should('have.attr', 'rel')
        .and('include', 'noopener')
    })

    it('renders the two informational sections', () => {
      cy.contains('h3', t.pages.bidDetail.whatIsNcc.heading)
        .should('be.visible')
        .next('p')
        .should('have.text', t.pages.bidDetail.whatIsNcc.content)
      cy.contains('h3', t.pages.bidDetail.howToParticipate.heading)
        .should('be.visible')
        .next('p')
        .should('have.text', t.pages.bidDetail.howToParticipate.content)
    })

    it('renders the author box', () => {
      cy.contains('Scritto da').should('be.visible')
      cy.contains('a', 'Scopri di più').should(($link) => {
        expect(samePath($link.attr('href') ?? '', '/about-us')).to.be.true
      })
    })

    INTERNAL_LINKS.forEach((href) => {
      it(`links back to ${href}`, () => {
        cy.get(hrefSelector(href)).should('exist')
      })
    })

    it('returns to the bid list', () => {
      cy.contains('a', 'Torna alla lista dei bandi').click()
      cy.assertPath('/')
      cy.get(sel.tableRow).should('have.length', bids.length)
    })

    it('publishes a GovernmentService schema', () => {
      cy.jsonLd().then((blocks) => {
        const schema = blocks.find((block) => block['@type'] === 'GovernmentService')
        expect(schema, 'GovernmentService schema').to.exist
        expect(schema!.name).to.eq(`Bando NCC – ${bid.location}`)
        expect(schema!.url).to.eq(bid.url)
        expect(schema!.areaServed.name).to.eq(bid.location)
        expect(schema!.areaServed.geo.latitude).to.eq(Number(bid.latitude))
        expect(schema!.areaServed.geo.longitude).to.eq(Number(bid.longitude))
      })
    })
  })

  describe('status badge', () => {
    const withActive = anyActiveBid()
    const withExpired = anyExpiredBid()

    it('marks a bid whose deadline is in the future as open', function () {
      if (!withActive) this.skip()
      cy.visitPage(bidPath(withActive as RawBid))
      valueFor(labels.status)
        .should('have.text', labels.active)
        .and('have.class', 'text-green-400')
    })

    it('marks a bid whose deadline has passed as expired', function () {
      if (!withExpired) this.skip()
      cy.visitPage(bidPath(withExpired as RawBid))
      valueFor(labels.status)
        .should('have.text', labels.expired)
        .and('have.class', 'text-red-400')
    })
  })

  describe('map', () => {
    const bid = bids[0]

    it('renders a single-marker map when the bid has coordinates', () => {
      cy.visitPage(bidPath(bid))
      cy.get(sel.map).should('be.visible')
      cy.get(sel.mapMarker).should('have.length', 1)
      cy.get('.leaflet-tile-pane img').should('have.length.greaterThan', 0)
    })

    it('shows the location name in the marker popup', () => {
      cy.visitPage(bidPath(bid))
      cy.get(sel.mapMarker).click({ force: true })
      cy.get(sel.mapPopup).should('be.visible').and('contain.text', bid.location)
    })

    it('renders the zoom controls', () => {
      cy.visitPage(bidPath(bid))
      cy.get(sel.mapZoomIn).should('be.visible')
      cy.get(sel.mapZoomOut).should('be.visible')
    })
  })

  describe('regional law block', () => {
    const withLaw = anyBidWithLaw()
    const withoutLaw = anyBidWithoutLaw()

    it('links to the matching regional regulation', function () {
      if (!withLaw) this.skip()
      const bid = withLaw as RawBid
      const law = findLaw(bid.location)!

      cy.visitPage(bidPath(bid))
      cy.contains('h3', labels.localRegulation).should('be.visible')
      cy.contains('a', `Regolamento NCC – ${law.location}`)
        .should('have.attr', 'href', law.url)
        .and('have.attr', 'target', '_blank')
      cy.get(`img[alt="Stemma ${law.location}"]`).should('have.attr', 'src', law.image)
    })

    it('omits the block when no regulation matches', function () {
      if (!withoutLaw) this.skip()
      cy.visitPage(bidPath(withoutLaw as RawBid))
      cy.contains('h3', labels.localRegulation).should('not.exist')
    })
  })

  describe('slug edge cases', () => {
    const accented = anyAccentedBid()

    it('strips diacritics from the URL but keeps them in the heading', function () {
      if (!accented) this.skip()
      const bid = accented as RawBid
      const slug = toSlug(bid.location)

      expect(slug, 'slug is ASCII-safe').to.match(/^[\x20-\x7E]+$/)
      cy.visitPage(`/bandi/${slug}`)
      cy.get(sel.contentArea).find('h1').should('have.text', `Bando NCC – ${bid.location}`)
    })
  })
})
