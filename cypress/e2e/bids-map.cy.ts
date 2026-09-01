import { sel } from '../support/selectors'
import { bids, bidsWithCoordinates, formatAmount, formatShortDate, isActive, t } from '../support/site'

const openMapTab = () =>
  cy.get(sel.desktopTabBar).contains('button', t.dashboard.tabs.map).click()

describe('Bids map', () => {
  beforeEach(() => {
    cy.useDesktop()
    cy.visitPage('/')
    openMapTab()
    cy.get(sel.map).should('be.visible')
    // The container is visible before Leaflet has drawn the marker layer.
    // Waiting for the full set means a test never grabs a marker mid-paint —
    // a click on a node the next commit is about to detach never reaches
    // Leaflet, and the popup silently never opens.
    cy.get(sel.mapMarker).should('have.length', bidsWithCoordinates.length)
  })

  it('mounts a Leaflet map with OpenStreetMap tiles', () => {
    cy.get(sel.map).should('have.length', 1)
    cy.get('.leaflet-tile-pane img').should('have.length.greaterThan', 0)
    cy.get('.leaflet-tile-pane img')
      .first()
      .should('have.attr', 'src')
      .and('match', /tile\.openstreetmap\.org/)
  })

  it('draws one marker per bid that has coordinates', () => {
    cy.get(sel.mapMarker).should('have.length', bidsWithCoordinates.length)
  })

  it('colours markers green for open bids and red for expired ones', () => {
    const expectedGreen = bidsWithCoordinates.filter((bid) => isActive(bid)).length
    const expectedRed = bidsWithCoordinates.length - expectedGreen

    // Marker colour depends on MapView's `now` state, which is only set after
    // hydration; the layer is not drawn at all until then.
    cy.get(sel.mapMarker).should(($markers) => {
      const strokes = $markers.toArray().map((marker) => marker.getAttribute('stroke'))
      expect(strokes.filter((stroke) => stroke === '#22c55e')).to.have.length(expectedGreen)
      expect(strokes.filter((stroke) => stroke === '#f87171')).to.have.length(expectedRed)
    })
  })

  it('opens a popup with the bid summary and a link to its detail page', () => {
    cy.get(sel.mapMarker).first().click({ force: true })
    cy.get(sel.mapPopup).should('be.visible')

    cy.get(sel.mapPopup).then(($popup) => {
      const text = $popup.text()
      const bid = bids.find((candidate) => text.includes(candidate.location))
      expect(bid, `popup names a bid from data.json (got: ${text.slice(0, 120)})`).to.exist
      expect(text).to.include(`${t.table.headers.amount}:`)
      expect(text).to.include(formatAmount(bid!.amount))
      expect(text).to.include(`${t.table.headers.deadline}:`)
      expect(text).to.include(formatShortDate(bid!.deadline))

      const link = $popup.find('a[href^="/bandi/"]')
      expect(link, 'detail link inside the popup').to.have.length(1)
    })
  })

  it('states the bando status in the popup, agreeing with the marker colour', () => {
    // The badge and the marker colour are both rendered from the single
    // `hasExpired()` answer MapView computes per marker (CLAUDE.md, "One rule
    // for scaduto"). This asserts they cannot drift apart, and that the words
    // are the ones the detail page uses rather than a second copy.
    const check = (stroke: string, label: string, textClass: string, shouldBeActive: boolean) => {
      const pool = bidsWithCoordinates.filter((bid) => isActive(bid) === shouldBeActive)
      // The dataset carries both today, but it is curated — do not fail a run
      // because every bando happens to be open.
      if (!pool.length) return

      cy.get(sel.mapMarker).filter(`[stroke="${stroke}"]`).first().click({ force: true })
      cy.get(sel.mapPopup).should('be.visible')
      cy.get(sel.mapPopupStatus).should('contain.text', label).and('have.class', textClass)

      // ...and the bando it actually named really does have that status.
      cy.get(sel.mapPopup).then(($popup) => {
        const text = $popup.text()
        const bid = bids.find((candidate) => text.includes(candidate.location))
        expect(bid, `popup names a bid from data.json (got: ${text.slice(0, 120)})`).to.exist
        expect(isActive(bid!), `${bid!.location} is labelled "${label}"`).to.equal(shouldBeActive)
      })
    }

    check('#22c55e', t.pages.bidDetail.labels.active, 'text-green-300', true)
    check('#f87171', t.pages.bidDetail.labels.expired, 'text-red-300', false)
  })

  it('navigates to the detail page from a popup link', () => {
    cy.get(sel.mapMarker).first().click({ force: true })
    cy.get(sel.mapPopup).find('a[href^="/bandi/"]').click()
    cy.location('pathname').should('include', '/bandi/')
    cy.get(sel.contentArea).find('h1').should('contain.text', 'Bando NCC')
  })

  it('closes the popup again', () => {
    cy.get(sel.mapMarker).first().click({ force: true })
    cy.get(sel.mapPopup).should('be.visible')
    cy.get(sel.mapPopupClose).click({ force: true })
    cy.get(sel.mapPopup).should('not.exist')
  })

  it('exposes working zoom controls', () => {
    cy.get(sel.mapZoomIn).should('be.visible')
    cy.get(sel.mapZoomOut).should('be.visible')

    // The zoom level is not reflected in the DOM, but it is the first of the
    // last three path segments of every tile URL:
    // .../tile.openstreetmap.org/{z}/{x}/{y}.png
    const zoomsOf = ($tiles: JQuery<HTMLElement>) =>
      $tiles
        .toArray()
        .map((tile) => Number(tile.getAttribute('src')!.split('/').slice(-3)[0]))

    // Leaflet keeps the previous level's tiles around during the animation, so
    // assert on membership rather than min/max. Each `cy.get(...).should(...)`
    // re-queries the DOM on retry.
    cy.get('.leaflet-tile-pane img').then(($tiles) => {
      const initial = Math.max(...zoomsOf($tiles))

      cy.get(sel.mapZoomIn).click()
      cy.get('.leaflet-tile-pane img').should(($after) => {
        const zooms = zoomsOf($after)
        expect(zooms, `tiles above zoom ${initial}, got ${zooms.join()}`).to.satisfy(
          (levels: number[]) => levels.some((level) => level > initial)
        )
      })

      cy.get(sel.mapZoomOut).click()
      cy.get('.leaflet-tile-pane img').should(($after) => {
        const zooms = zoomsOf($after)
        expect(zooms, `tiles back at zoom ${initial}, got ${zooms.join()}`).to.include(initial)
      })
    })
  })

  it('keeps the map mounted when switching tabs back and forth', () => {
    cy.get(sel.desktopTabBar).contains('button', t.dashboard.tabs.table).click()
    cy.get(sel.map).should('not.exist')
    openMapTab()
    cy.get(sel.map).should('be.visible')
    cy.get(sel.mapMarker).should('have.length', bidsWithCoordinates.length)
  })

  describe('mobile', () => {
    it('renders the map from the mobile tab bar', () => {
      cy.useMobile()
      cy.visitPage('/')
      cy.get(sel.mobileTabBar).contains('button', t.dashboard.tabs.map).click()
      cy.get(sel.map).should('be.visible')
      cy.get(sel.mapMarker).should('have.length', bidsWithCoordinates.length)
    })
  })
})
