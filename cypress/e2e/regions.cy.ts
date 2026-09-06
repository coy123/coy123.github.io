import { sel } from '../support/selectors'
import {
  REGIONS,
  anyEmptyRegion,
  anyPopulatedRegion,
  bidPath,
  bidsOfRegion,
  regionTallies,
  t,
} from '../support/site'

/**
 * The "Regioni" tab: the picker, and the table and map it filters.
 *
 * Everything that is a pure question about the rule — which region a location
 * belongs to, whether every row resolves, whether the plate codes are right —
 * lives in `test/regions.test.ts` and runs in two seconds without a browser.
 * What is here is what only a browser can answer: that the tab renders, that
 * picking a region filters both views and moves the page to them, and that the
 * map arrives already framed on the region rather than on Italy.
 *
 * Both pickers are always in the DOM (one is `display:none` at any given
 * width), so every assertion is scoped to `sel.regionGrid` or
 * `sel.regionGridMobile` — never to `sel.regionButton` on its own, which
 * matches forty buttons.
 */

const copy = t.dashboard.regions

const openLabel = (count: number) =>
  count === 1 ? copy.openOne : copy.open.replace('{count}', String(count))
const closedLabel = (count: number) =>
  count === 1 ? copy.closedOne : copy.closed.replace('{count}', String(count))

const openRegionsTab = () =>
  cy.get(sel.desktopTabBar).contains('button', t.dashboard.tabs.regions).click()

describe('Regions tab', () => {
  beforeEach(() => {
    cy.useDesktop()
    cy.visitPage('/')
    openRegionsTab()
  })

  describe('the picker', () => {
    it('offers all twenty regions, including the empty ones', () => {
      cy.get(sel.regionGrid).find(sel.regionButton).should('have.length', REGIONS.length)
      REGIONS.forEach((region) => {
        cy.get(sel.regionGrid).contains(sel.regionButton, region.name).should('be.visible')
      })
    })

    it('shows each region crest, resized rather than served full size', () => {
      cy.get(sel.regionGrid)
        .find(`${sel.regionButton} img`)
        .should('have.length', REGIONS.length)
        .each(($img) => {
          expect($img.attr('src')).to.match(/upload\.wikimedia\.org\/wikipedia\/.*\/\d+px-/)
          expect(($img.attr('alt') ?? '').trim()).to.not.be.empty
        })
    })

    it('counts open and closed bandi separately in each region', () => {
      const tallies = regionTallies()
      REGIONS.forEach((region) => {
        const { open, closed, total } = tallies[region.id]
        cy.get(sel.regionGrid)
          .contains(sel.regionButton, region.name)
          .within(() => {
            if (total === 0) {
              cy.contains(copy.countZero).should('exist')
              return
            }
            cy.contains(openLabel(open)).should('exist')
            cy.contains(closedLabel(closed)).should('exist')
          })
      })
    })

    it('paints the open count green and the closed count grey', () => {
      // The same green and grey the table rows use, so the pair reads as
      // "still open" and "over" without a legend.
      const tallies = regionTallies()
      const region = REGIONS.find(
        (candidate) => tallies[candidate.id].open > 0 && tallies[candidate.id].closed > 0
      )
      if (!region) {
        cy.log('no region currently has both an open and a closed bando')
        return
      }

      cy.get(sel.regionGrid)
        .contains(sel.regionButton, region.name)
        .within(() => {
          cy.get('.text-green-400').should('contain.text', openLabel(tallies[region.id].open))
          cy.get('.text-gray-400').should('contain.text', closedLabel(tallies[region.id].closed))
        })
    })

    it('names the region and both counts for a screen reader', () => {
      const region = anyPopulatedRegion()!
      const { open, closed } = regionTallies()[region.id]
      const expected = copy.buttonLabel
        .replace('{region}', region.name)
        .replace('{open}', openLabel(open))
        .replace('{closed}', closedLabel(closed))

      cy.get(sel.regionGrid)
        .contains(sel.regionButton, region.name)
        .should('have.attr', 'aria-label', expected)
    })

    it('asks for a region before showing anything', () => {
      cy.contains(copy.prompt).should('be.visible')
      cy.get(sel.regionGrid).find(sel.regionButtonSelected).should('not.exist')
      cy.get(sel.tableRow).should('not.exist')
      cy.get(sel.map).should('not.exist')
    })

    it('marks the chosen region as pressed, and only that one', () => {
      const region = anyPopulatedRegion()!
      cy.get(sel.regionGrid).contains(sel.regionButton, region.name).click()
      cy.get(sel.regionGrid)
        .find(sel.regionButtonSelected)
        .should('have.length', 1)
        .and('contain.text', region.name)
    })

    it('clears the selection when the chosen region is clicked again', () => {
      const region = anyPopulatedRegion()!
      cy.get(sel.regionGrid).contains(sel.regionButton, region.name).as('button').click()
      cy.get(sel.tableRow).should('exist')
      cy.get('@button').click()
      cy.get(sel.regionGrid).find(sel.regionButtonSelected).should('not.exist')
      cy.contains(copy.prompt).should('be.visible')
    })

    it('keeps the chosen region when the reader visits another tab and returns', () => {
      const region = anyPopulatedRegion()!
      cy.get(sel.regionGrid).contains(sel.regionButton, region.name).click()

      cy.get(sel.desktopTabBar).contains('button', t.dashboard.tabs.table).click()
      openRegionsTab()

      cy.get(sel.regionGrid)
        .find(sel.regionButtonSelected)
        .should('have.length', 1)
        .and('contain.text', region.name)
      cy.get(sel.tableRow).should('have.length', bidsOfRegion(region.id).length)
    })

    it('scrolls the results into view when a region is picked', () => {
      const region = anyPopulatedRegion()!

      // Measured, not assumed to be zero: Cypress scrolls the tab bar into
      // view to click it, so the page has already moved before this starts.
      cy.window()
        .its('scrollY')
        .then((before) => {
          cy.get(sel.regionGrid).contains(sel.regionButton, region.name).click()
          // The smooth scroll is asynchronous, so the assertion retries.
          cy.window().its('scrollY').should('be.greaterThan', before)
        })

      cy.get(sel.regionResults).should('be.visible')
      cy.contains('h3', copy.tableHeading.replace('{region}', region.name)).should('be.visible')
    })
  })

  /*
   * The launch flag carries its own expiry (`REGIONS_BADGE_UNTIL` in
   * components/HomeContent.tsx, 01.11.2026). These tests go red the day after
   * it lapses — that is the reminder to delete the badge, the constant, the
   * `dashboard.tabs.regionsNew*` copy, the `.tab-new-badge` CSS and this
   * block, together.
   */
  describe('the launch flag', () => {
    it('marks the tab as new', () => {
      cy.get(sel.desktopTabBar)
        .contains('button', t.dashboard.tabs.regions)
        .find(sel.newBadge)
        .should('be.visible')
        .and('have.text', t.dashboard.tabs.regionsNew)
    })

    it('flags only the Regioni tab', () => {
      cy.get(sel.desktopTabBar).find(sel.newBadge).should('have.length', 1)
    })
  })

  describe('the filtered table', () => {
    it('shows exactly that region’s bandi, and no others', () => {
      const region = anyPopulatedRegion()!
      const expected = bidsOfRegion(region.id)

      cy.get(sel.regionGrid).contains(sel.regionButton, region.name).click()
      cy.contains('h3', copy.tableHeading.replace('{region}', region.name)).should('be.visible')
      cy.get(sel.tableRow).should('have.length', expected.length)

      expected.forEach((bid) => {
        cy.get(sel.tableRow).contains('a', bid.location).should('have.attr', 'href', bidPath(bid))
      })
    })

    it('repeats the region’s open and closed counts over the table', () => {
      const region = anyPopulatedRegion()!
      const { open, closed } = regionTallies()[region.id]

      cy.get(sel.regionGrid).contains(sel.regionButton, region.name).click()
      cy.get(sel.regionResults)
        .should('contain.text', openLabel(open))
        .and('contain.text', closedLabel(closed))
    })

    it('never shows the locked rows: the count is national, not regional', () => {
      const region = anyPopulatedRegion()!
      cy.get(sel.regionGrid).contains(sel.regionButton, region.name).click()
      cy.get(sel.lockedRows).should('not.exist')
    })

    it('switches the whole view when another region is picked', () => {
      const populated = REGIONS.filter((region) => bidsOfRegion(region.id).length > 0)
      if (populated.length < 2) {
        cy.log('needs two regions with bandi; the dataset has fewer')
        return
      }
      const [first, second] = populated

      cy.get(sel.regionGrid).contains(sel.regionButton, first.name).click()
      cy.get(sel.tableRow).should('have.length', bidsOfRegion(first.id).length)

      cy.get(sel.regionGrid).contains(sel.regionButton, second.name).click()
      cy.get(sel.tableRow).should('have.length', bidsOfRegion(second.id).length)
      cy.get(sel.tableRow).should('not.contain.text', bidsOfRegion(first.id)[0].location)
    })

    it('explains an empty region instead of showing an empty table', function () {
      const region = anyEmptyRegion()
      if (!region) {
        // Every region has a bando today. Nothing to assert, and nothing wrong.
        this.skip()
      }

      cy.get(sel.regionGrid).contains(sel.regionButton, region!.name).click()
      cy.contains(copy.empty).should('be.visible')
      cy.get(sel.tableRow).should('not.exist')
      cy.get(sel.map).should('not.exist')
    })
  })

  describe('the regional map', () => {
    it('draws only that region’s bandi', () => {
      const region = anyPopulatedRegion()!
      const withCoordinates = bidsOfRegion(region.id).filter(
        (bid) => Boolean(bid.latitude) && Boolean(bid.longitude)
      )
      if (!withCoordinates.length) {
        cy.log(`${region.name} has no bando with coordinates`)
        return
      }

      cy.get(sel.regionGrid).contains(sel.regionButton, region.name).click()
      cy.contains('h4', copy.mapHeading.replace('{region}', region.name)).should('be.visible')
      cy.get(sel.map).should('be.visible')
      cy.get(sel.mapMarker).should('have.length', withCoordinates.length)
    })

    it('opens framed on the region, not on Italy', () => {
      const region = anyPopulatedRegion()!

      // The zoom Leaflet actually settled on, read off the tiles it asked for:
      // an OSM tile URL is /{z}/{x}/{y}.png. No Leaflet internals involved, and
      // the stubbed tile responses do not change the src that was requested.
      const tileZooms = ($tiles: JQuery<HTMLElement>) =>
        $tiles
          .toArray()
          .map((tile) => Number(new URL(tile.getAttribute('src')!).pathname.split('/')[1]))
          .filter((value) => Number.isFinite(value))

      // The whole-country map first, as the baseline: every marker in Italy in
      // one frame, which MapView fits at zoom 8 at the very most.
      cy.get(sel.desktopTabBar).contains('button', t.dashboard.tabs.map).click()
      cy.get(sel.map).should('be.visible')
      cy.get('.leaflet-tile-pane img')
        .should('have.length.greaterThan', 0)
        .then(($tiles) => Math.max(...tileZooms($tiles)))
        .then((countryZoom) => {
          openRegionsTab()
          cy.get(sel.regionGrid).contains(sel.regionButton, region.name).click()
          cy.get(sel.map).should('be.visible')
          // A `should` callback, so this retries while the fit animates and the
          // deeper tiles arrive.
          cy.get('.leaflet-tile-pane img').should(($tiles) => {
            const zooms = tileZooms($tiles)
            expect(zooms, 'tiles carry a zoom level').to.not.be.empty
            expect(Math.max(...zooms), `zoom on ${region.name} vs all of Italy`).to.be.greaterThan(
              countryZoom
            )
          })
        })
    })
  })

  describe('on a phone', () => {
    beforeEach(() => {
      cy.useMobile()
      cy.visitPage('/')
      cy.get(sel.mobileTabBar).contains('button', t.dashboard.tabs.regions).click()
    })

    it('shows the crest-only grid and hides the named one', () => {
      cy.get(sel.regionGridMobile).should('be.visible')
      cy.get(sel.regionGrid).should('not.be.visible')
      cy.get(sel.regionGridMobile).find(sel.regionButton).should('have.length', REGIONS.length)
    })

    it('carries a crest and the two counts in every cell, and the name in the label', () => {
      const tallies = regionTallies()
      REGIONS.forEach((region) => {
        cy.get(sel.regionGridMobile)
          .find(`${sel.regionButton}[title="${region.name}"]`)
          .should('have.length', 1)
          .within(() => {
            cy.get('img').should('have.length', 1)
            const { open, closed, total } = tallies[region.id]
            if (total === 0) {
              cy.contains('—').should('exist')
            } else {
              cy.get('.text-green-400').should('have.text', String(open))
              cy.get('.text-gray-400').should('have.text', String(closed))
            }
          })
      })
    })

    it('filters the table from a crest', () => {
      const region = anyPopulatedRegion()!
      cy.get(sel.regionGridMobile).find(`${sel.regionButton}[title="${region.name}"]`).click()
      cy.get(sel.tableRow).should('have.length', bidsOfRegion(region.id).length)
      cy.contains('h3', copy.tableHeading.replace('{region}', region.name)).should('be.visible')
    })

    it('scrolls down to the results, which start below five rows of crests', () => {
      const region = anyPopulatedRegion()!
      cy.window()
        .its('scrollY')
        .then((before) => {
          cy.get(sel.regionGridMobile).find(`${sel.regionButton}[title="${region.name}"]`).click()
          cy.window().its('scrollY').should('be.greaterThan', before)
        })
      cy.get(sel.regionResults).should('be.visible')
    })

    it('fits four crests across without pushing the page sideways', () => {
      // The tab bar grew a fourth item and the picker is a four-column grid;
      // both are new ways to overflow a 390px phone. `responsive.cy.ts` makes
      // the same check, but only on the table tab, which is the default.
      cy.document().then((doc) => {
        expect(doc.documentElement.scrollWidth, 'horizontal overflow').to.be.at.most(391)
      })
      cy.get(sel.regionGridMobile).find(sel.regionButton).first().should('be.visible')
    })

    it('flags the tab as new with a dot, since the bar has no room for a word', () => {
      cy.get(sel.mobileTabBar)
        .contains('button', t.dashboard.tabs.regions)
        .find(sel.newBadge)
        .should('exist')
        .and('have.attr', 'aria-label', t.dashboard.tabs.regionsNewLabel)
    })
  })
})
