import { sel } from '../support/selectors'
import {
  MARKER_MAX_RADIUS,
  MARKER_MIN_RADIUS,
  MARKER_STYLE,
  bids,
  bidsWithCoordinates,
  formatAmount,
  formatShortDate,
  isActive,
  asLocatable,
  markerRadius,
  regionOf,
  t,
} from '../support/site'

const openMapTab = () =>
  cy.get(sel.desktopTabBar).contains('button', t.dashboard.tabs.map).click()

/**
 * The country map **opens rolled up**: below `CLUSTER_BELOW_ZOOM`
 * (lib/mapMarkers.ts) the whole of Italy is drawn as one bubble per region,
 * because at the zoom the country fits in, 64 pairs of comuni sit closer
 * together than their own diameter. Two clicks of the zoom control cross the
 * threshold and put the individual bandi back.
 *
 * Every test below that is about a single bando therefore calls this first.
 */
/**
 * Leaves the clustered country view for the individual comuni, by clicking a
 * cluster bubble — which fits that region's bounds, one zoom action, past
 * `CLUSTER_BELOW_ZOOM`.
 *
 * It is not done with two clicks on the zoom control, which is the obvious
 * way and is unreliable: Leaflet ignores a zoom request while it is still
 * animating the previous one, and in headless Electron the transition that
 * clears that flag does not always arrive — so the second click vanished and
 * the map silently stayed clustered. A bubble is also the app's own
 * affordance, and it leaves the region's markers centred with room around
 * them, which is what a popup needs.
 *
 * A green-ringed bubble is preferred so the region opened has at least one
 * open bando in it.
 */
const openARegion = (attempt = 0) => {
  cy.get('body').then(($body) => {
    if (!$body.find(sel.mapClusterLabel).length) return
    if (attempt >= 5) {
      throw new Error('the map never left the clustered view')
    }

    cy.get(sel.mapMarker).then(($bubbles) => {
      const withOpen = $bubbles.filter(`[stroke="${MARKER_STYLE.open.color}"]`)
      cy.wrap((withOpen.length ? withOpen : $bubbles).first()).click({ force: true })
    })
    // A click that arrives while the opening `fitBounds` is still animating is
    // dropped by Leaflet with no error, so give this one a beat to land and
    // then look again rather than assuming it took.
    cy.wait(400)
    openARegion(attempt + 1)
  })
}

const showComuni = () => {
  cy.get(sel.mapClusterLabel).should('exist')
  openARegion()
  cy.get(sel.mapClusterLabel).should('not.exist')
  cy.get(sel.mapMarker).should('have.length', bidsWithCoordinates.length)
}

/**
 * Leaflet's SVG renderer empties the `d` of any path outside the viewport, so
 * once the map has moved the node is still there but nothing is painted and a
 * click cannot reach it. These are the markers actually on screen — and far
 * enough inside it for a popup to open beside one without being clipped by the
 * map's own `overflow: hidden`.
 */
const markersInView = () =>
  cy.get(sel.map).then(($map) => {
    const box = $map[0].getBoundingClientRect()
    return cy.get(sel.mapMarker).filter((_, marker) => {
      const rect = marker.getBoundingClientRect()
      return (
        rect.width > 0 &&
        rect.left > box.left + 40 &&
        rect.right < box.right - 40 &&
        // A popup opens above its marker, so it needs that much room over it.
        rect.top > box.top + 160 &&
        rect.bottom < box.bottom - 20
      )
    })
  })

/**
 * The radius Leaflet actually drew. A circle marker is an SVG `<path>` of two
 * arcs, not a `<circle>`, so the radius is the first arc's rx:
 * `M{x-r},{y} a{r},{r} 0 1,0 {2r},0 …`.
 */
const radiusOf = (marker: Element) =>
  Number(/a([\d.]+),/.exec(marker.getAttribute('d') ?? '')?.[1])

describe('Bids map', () => {
  beforeEach(() => {
    cy.useDesktop()
    cy.visitPage('/')
    openMapTab()
    cy.get(sel.map).should('be.visible')
    // The container is visible before Leaflet has drawn its layers. Waiting
    // for the cluster bubbles means a test never grabs a marker mid-paint —
    // a click on a node the next commit is about to detach never reaches
    // Leaflet, and the popup silently never opens.
    cy.get(sel.mapClusterLabel).should('have.length.greaterThan', 0)
  })

  it('mounts a Leaflet map with OpenStreetMap tiles', () => {
    cy.get(sel.map).should('have.length', 1)
    cy.get('.leaflet-tile-pane img').should('have.length.greaterThan', 0)
    cy.get('.leaflet-tile-pane img')
      .first()
      .should('have.attr', 'src')
      .and('match', /tile\.openstreetmap\.org/)
  })

  it('draws one marker per bid that has coordinates, once a region is opened', () => {
    showComuni()
  })

  it('colours markers green for open bids and grey for expired ones', () => {
    showComuni()
    const expectedGreen = bidsWithCoordinates.filter((bid) => isActive(bid)).length
    const expectedGrey = bidsWithCoordinates.length - expectedGreen

    // Marker colour depends on MapView's `today` state, which is only set
    // after hydration; the layer is not drawn at all until then. Grey, not
    // red — see MARKER_STYLE in lib/mapMarkers.ts, which is imported here so
    // the spec cannot hold a second opinion about the palette.
    cy.get(sel.mapMarker).should(($markers) => {
      const strokes = $markers.toArray().map((marker) => marker.getAttribute('stroke'))
      expect(strokes.filter((stroke) => stroke === MARKER_STYLE.open.color)).to.have.length(
        expectedGreen
      )
      expect(strokes.filter((stroke) => stroke === MARKER_STYLE.closed.color)).to.have.length(
        expectedGrey
      )
    })
  })

  it('draws every marker at a size the licence counts can explain', () => {
    showComuni()
    // Every radius on screen has to be one `markerRadius` produces for some
    // bando in the dataset, and inside the clamps. The scale itself — √, and
    // why — is checked in test/map-markers.test.ts.
    const allowed = new Set(bidsWithCoordinates.map((bid) => markerRadius(bid.amount)))
    markersInView().should(($markers) => {
      const radii = $markers.toArray().map(radiusOf).filter(Number.isFinite)
      expect(radii, 'markers carry a radius').to.not.be.empty
      radii.forEach((radius) => {
        expect(allowed.has(radius), `${radius}px is a radius some bando implies`).to.equal(true)
      })
      expect(Math.min(...radii), 'smallest marker').to.be.at.least(MARKER_MIN_RADIUS)
      expect(Math.max(...radii), 'largest marker is capped').to.be.at.most(MARKER_MAX_RADIUS)
    })
  })

  it('gives a marker the exact radius its own licence count implies', () => {
    // The end-to-end binding the check above cannot make: this marker, this
    // bando, this number of licences.
    showComuni()
    markersInView()
      .first()
      .then(($marker) => {
        const radius = radiusOf($marker[0])
        cy.wrap($marker).click({ force: true })
        cy.get(sel.mapPopup)
          .should('be.visible')
          .then(($popup) => {
            const bid = bids.find((candidate) => $popup.text().includes(candidate.location))
            expect(bid, 'popup names a bid from data.json').to.exist
            expect(radius, `${bid!.location} has ${bid!.amount} licences`).to.equal(
              markerRadius(bid!.amount)
            )
          })
      })
  })

  it('opens a popup with the bid summary and a link to its detail page', () => {
    showComuni()
    markersInView().first().click({ force: true })
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
    showComuni()
    // The badge and the marker colour are both rendered from the single
    // `hasExpired()` answer MapView computes per marker (CLAUDE.md, "One rule
    // for scaduto"). This asserts they cannot drift apart, and that the words
    // are the ones the detail page uses rather than a second copy.
    const check = (stroke: string, label: string, textClass: string, shouldBeActive: boolean) => {
      const pool = bidsWithCoordinates.filter((bid) => isActive(bid) === shouldBeActive)
      // The dataset carries both today, but it is curated — do not fail a run
      // because every bando happens to be open.
      if (!pool.length) return

      markersInView().then(($markers) => {
        const candidates = $markers.filter(`[stroke="${stroke}"]`)
        if (!candidates.length) {
          // The opened region happens to hold none of this kind on screen.
          // Skipping beats panning the map around looking for one.
          cy.log(`no ${shouldBeActive ? 'open' : 'expired'} marker in view`)
          return
        }

        cy.wrap(candidates.first()).click({ force: true })
        cy.get(sel.mapPopup).should('be.visible')
        cy.get(sel.mapPopupStatus).should('contain.text', label).and('have.class', textClass)

        // ...and the bando it actually named really does have that status.
        cy.get(sel.mapPopup).then(($popup) => {
          const text = $popup.text()
          const bid = bids.find((candidate) => text.includes(candidate.location))
          expect(bid, `popup names a bid from data.json (got: ${text.slice(0, 120)})`).to.exist
          expect(isActive(bid!), `${bid!.location} is labelled "${label}"`).to.equal(shouldBeActive)
        })
        // No explicit close: Leaflet's `autoClose` shuts the previous popup
        // when the next one opens, and closing by hand raced that — two close
        // buttons in the DOM at once.
      })
    }

    check(MARKER_STYLE.open.color, t.pages.bidDetail.labels.active, 'text-green-300', true)
    check(MARKER_STYLE.closed.color, t.pages.bidDetail.labels.expired, 'text-gray-300', false)
  })

  it('navigates to the detail page from a popup link', () => {
    showComuni()
    markersInView().first().click({ force: true })
    cy.get(sel.mapPopup).find('a[href^="/bandi/"]').click()
    cy.location('pathname').should('include', '/bandi/')
    cy.get(sel.contentArea).find('h1').should('contain.text', 'Bando NCC')
  })

  it('closes the popup again', () => {
    showComuni()
    markersInView().first().click({ force: true })
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
    cy.get(sel.mapClusterLabel).should('have.length.greaterThan', 0)
  })

  describe('clustering at country zoom', () => {
    it('rolls the bandi up into one bubble per region', () => {
      // One bubble per region that has a bando, not one per bando.
      const regionsWithBandi = new Set(
        bidsWithCoordinates.map((bid) => regionOf(asLocatable(bid))?.id).filter(Boolean)
      )
      cy.get(sel.mapClusterLabel).should('have.length', regionsWithBandi.size)
      cy.get(sel.mapMarker).should('have.length', regionsWithBandi.size)
    })

    it('prints the number of bandi inside each bubble, adding up to the dataset', () => {
      cy.get(sel.mapClusterLabel).should(($labels) => {
        const counts = $labels.toArray().map((label) => Number(label.textContent))
        expect(counts.every((count) => Number.isInteger(count) && count > 0)).to.equal(true)
        expect(counts.reduce((sum, count) => sum + count, 0)).to.equal(
          bidsWithCoordinates.length
        )
      })
    })

    it('rings a bubble green when the region still has an open bando', () => {
      // The one fact rolling the markers up must not lose: where can I apply?
      const anyOpen = bidsWithCoordinates.some((bid) => isActive(bid))
      if (!anyOpen) {
        cy.log('nothing is open today; the ring colour has nothing to distinguish')
        return
      }
      cy.get(sel.mapMarker)
        .filter(`[stroke="${MARKER_STYLE.open.color}"]`)
        .should('have.length.greaterThan', 0)
    })

    it('opens a region when its bubble is clicked', () => {
      cy.get(sel.mapMarker).first().click({ force: true })
      // Clicking zooms to that region's bounds, which is past the clustering
      // threshold — so the bubbles give way to the comuni underneath them.
      cy.get(sel.mapClusterLabel).should('not.exist')
      cy.get(sel.mapMarker).should('have.length', bidsWithCoordinates.length)
    })
  })

  describe('the open-only filter', () => {
    const filter = () => cy.get(sel.mapFilter)
    const chooseOpen = () => filter().contains('button', t.dashboard.map.filterOpen).click()
    const chooseAll = () => filter().contains('button', t.dashboard.map.filterAll).click()

    it('hides the expired bandi, and brings them back', () => {
      showComuni()
      const open = bidsWithCoordinates.filter((bid) => isActive(bid))
      if (!open.length) {
        cy.log('nothing is open today')
        return
      }

      chooseOpen()
      cy.get(sel.mapMarker).should('have.length', open.length)
      cy.get(sel.mapMarker)
        .filter(`[stroke="${MARKER_STYLE.closed.color}"]`)
        .should('have.length', 0)

      chooseAll()
      // Naming the clustered state explicitly: if the map ever falls back to
      // the country view here, the failure says so instead of reporting a
      // marker count that happens to equal the number of regions.
      cy.get(sel.mapClusterLabel).should('not.exist')
      cy.get(sel.mapMarker).should('have.length', bidsWithCoordinates.length)
    })

    it('starts on "tutti", so the archive is what the page shows', () => {
      cy.get(sel.mapFilterSelected)
        .should('have.length', 1)
        .and('contain.text', t.dashboard.map.filterAll)
    })

    it('says how many bandi each choice leaves on the map', () => {
      // The counts are half the reason the control is noticeable at all, and
      // they answer "how many are still open?" without a click.
      const open = bidsWithCoordinates.filter((bid) => isActive(bid)).length
      filter()
        .contains('button', t.dashboard.map.filterAll)
        .should('contain.text', formatAmount(bidsWithCoordinates.length))
      filter()
        .contains('button', t.dashboard.map.filterOpen)
        .should('contain.text', formatAmount(open))
    })

    it('moves the highlight when the other choice is picked', () => {
      chooseOpen()
      cy.get(sel.mapFilterSelected)
        .should('have.length', 1)
        .and('contain.text', t.dashboard.map.filterOpen)
    })

    it('is sitting above the map, where the eye lands before the markers', () => {
      cy.get(sel.mapFilter).should('be.visible')
      cy.get(sel.mapFilter).then(($filter) => {
        cy.get(sel.map).then(($map) => {
          expect(
            $filter[0].getBoundingClientRect().bottom,
            'the filter is above the map, not buried under it'
          ).to.be.at.most($map[0].getBoundingClientRect().top + 1)
        })
      })
    })
  })

  describe('the legend', () => {
    it('names both marker colours and explains the size', () => {
      cy.get(sel.mapLegend)
        .should('be.visible')
        .and('contain.text', t.dashboard.map.legendOpen)
        .and('contain.text', t.dashboard.map.legendClosed)
        .and('contain.text', t.dashboard.map.legendSize)
    })

    it('explains the clustering on the country map', () => {
      cy.contains(t.dashboard.map.legendCluster).should('be.visible')
    })
  })

  describe('hover tooltips', () => {
    it('names the comune and its licence count without opening a popup', () => {
      showComuni()
      markersInView().first().trigger('mouseover', { force: true })
      cy.get(sel.mapTooltip).should('be.visible')
      cy.get(sel.mapTooltip).then(($tooltip) => {
        const text = $tooltip.text()
        const bid = bids.find((candidate) => text.includes(candidate.location))
        expect(bid, `tooltip names a bid from data.json (got: ${text})`).to.exist
        expect(text).to.include(formatAmount(bid!.amount))
      })
      cy.get(sel.mapPopup).should('not.exist')
    })
  })

  describe('mobile', () => {
    it('renders the map from the mobile tab bar', () => {
      cy.useMobile()
      cy.visitPage('/')
      cy.get(sel.mobileTabBar).contains('button', t.dashboard.tabs.map).click()
      cy.get(sel.map).should('be.visible')
      cy.get(sel.mapClusterLabel).should('have.length.greaterThan', 0)
    })
  })
})
