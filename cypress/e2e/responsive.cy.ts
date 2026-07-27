import { sel } from '../support/selectors'
import { bidPath, bids, t } from '../support/site'

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844, mobileLayout: true },
  { name: 'tablet', width: 768, height: 1024, mobileLayout: false },
  { name: 'desktop', width: 1280, height: 800, mobileLayout: false },
]

describe('Responsive layout', () => {
  VIEWPORTS.forEach((viewport) => {
    describe(viewport.name, () => {
      beforeEach(() => {
        cy.viewport(viewport.width, viewport.height)
        cy.visitPage('/')
      })

      it('shows the right navigation for the breakpoint', () => {
        if (viewport.mobileLayout) {
          cy.get(sel.mobileHeader).should('be.visible')
          cy.get(sel.desktopNav).should('not.be.visible')
        } else {
          cy.get(sel.desktopNav).should('be.visible')
          cy.get(sel.mobileHeader).should('not.be.visible')
        }
      })

      it('never scrolls horizontally', () => {
        cy.document().then((doc) => {
          expect(
            doc.documentElement.scrollWidth,
            `${viewport.name} horizontal overflow`
          ).to.be.at.most(viewport.width + 1)
        })
      })

      it('renders the bid table', () => {
        cy.get(sel.tableRow).should('have.length', bids.length)
      })
    })
  })

  describe('mobile dashboard', () => {
    beforeEach(() => {
      cy.useMobile()
      cy.visitPage('/')
    })

    it('uses emoji column headers instead of words', () => {
      cy.contains('span', '🛡️').should('be.visible')
      cy.contains('span', '📍').should('be.visible')
      cy.contains('span', t.table.headers.location).should('not.be.visible')
    })

    it('shows the compact tab bar with a search toggle', () => {
      cy.get(sel.mobileTabBar).should('be.visible')
      cy.get(sel.mobileTabBar).contains('button', t.dashboard.tabs.table).should('be.visible')
      cy.get(sel.mobileTabBar).contains('button', t.dashboard.tabs.map).should('be.visible')
      cy.get(sel.mobileTabBar).children().first().children().eq(2).should('contain.text', '🔍')
    })

    it('expands the search field and filters the table', () => {
      const sample = bids[0].location.replace(/^Comune di\s+/, '').replace(/\s*\(.*\)$/, '')
      const expected = bids.filter((bid) =>
        bid.location.toLowerCase().includes(sample.toLowerCase())
      ).length

      cy.get(sel.mobileTabBar).children().first().children().eq(2).click()
      cy.get(sel.mobileTabBar).find('input').should('be.focused').type(sample)
      cy.get(sel.tableRow).should('have.length', expected)
    })

    it('collapses the search when a tab is picked again', () => {
      cy.get(sel.mobileTabBar).children().first().children().eq(2).click()
      cy.get(sel.mobileTabBar).find('input').should('exist')
      cy.get(sel.mobileTabBar).contains('button', '🗺️').click()
      cy.get(sel.mobileTabBar).find('input').should('not.exist')
      cy.get(sel.map).should('be.visible')
    })

    it('shortens the hero copy', () => {
      cy.contains('span', t.pages.home.descriptionShort).should('be.visible')
      cy.contains('span', t.pages.home.description).should('not.be.visible')
    })
  })

  describe('mobile bid detail', () => {
    it('stacks the detail card without overflowing', () => {
      cy.useMobile()
      cy.visitPage(bidPath(bids[0]))
      cy.get(sel.contentArea).should('be.visible')
      cy.document().then((doc) => {
        expect(doc.documentElement.scrollWidth).to.be.at.most(391)
      })
    })
  })
})
