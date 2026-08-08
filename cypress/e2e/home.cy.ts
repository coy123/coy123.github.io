import { sel } from '../support/selectors'
import { hrefSelector, t, normalize } from '../support/site'

const sections = t.pages.home.sections as { heading: string; content: string }[]

/** Internal links injected after specific sections in app/page.tsx. */
const SECTION_LINKS: Record<number, string> = {
  0: '/how-to-become-driver',
  2: '/faq',
  3: '/regional-laws',
}

describe('Home page', () => {
  beforeEach(() => {
    cy.useDesktop()
    cy.visitPage('/')
  })

  describe('hero and intro', () => {
    it('renders the hero with the background image', () => {
      cy.get(sel.hero)
        .first()
        .should('have.attr', 'style')
        .and('include', '/images/driver.png')
    })

    it('shows the long description on desktop and the short one on mobile', () => {
      cy.contains('span', t.pages.home.description).should('be.visible')
      cy.contains('span', t.pages.home.descriptionShort).should('not.be.visible')

      cy.useMobile()
      cy.contains('span', t.pages.home.descriptionShort).should('be.visible')
      cy.contains('span', t.pages.home.description).should('not.be.visible')
    })

    it('shows today as the last-updated date', () => {
      const today = new Date().toLocaleDateString('it-IT', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
      cy.contains(`${t.table.lastUpdated}: ${today}`).should('be.visible')
    })
  })

  describe('section anchor pills', () => {
    it('renders one pill per content section', () => {
      cy.get(sel.anchorPills).should('have.length', sections.length)
    })

    it('points every pill at an element that exists on the page', () => {
      sections.forEach((section, index) => {
        cy.get(`a[href="#section-${index}"]`)
          .should('exist')
          .and('have.text', section.heading)
        cy.get(`#section-${index}`).should('exist')
      })
    })

    it('jumps to the section when a pill is clicked', () => {
      // Only the first row of pills is inside the clipped container, so the
      // click test uses the first one.
      cy.get(sel.anchorPills).first().click()
      cy.hash().should('eq', '#section-0')
      cy.get('#section-0').should('be.visible')
    })
  })

  describe('SEO content sections', () => {
    it('renders every section heading and body', () => {
      cy.get('[id^="section-"]').should('have.length', sections.length)

      sections.forEach((section, index) => {
        cy.get(`#section-${index}`).within(() => {
          cy.get('h3').should('have.text', section.heading)
          // The rendered markdown is the div right after the heading. It used
          // to be found by `.prose`, which the typography plugin never styled
          // and which no longer exists — see "Article typography" in CLAUDE.md.
          cy.get('h3 + div')
            .invoke('text')
            .then((text) => {
              expect(normalize(text).length, `${section.heading} body`).to.be.greaterThan(50)
            })
        })
      })
    })

    it('renders the internal links attached to specific sections', () => {
      Object.entries(SECTION_LINKS).forEach(([index, href]) => {
        cy.get(`#section-${index}`).find(hrefSelector(href)).should('be.visible')
      })
    })

    it('follows the how-to-become-driver link from the first section', () => {
      cy.get('#section-0').find(hrefSelector('/how-to-become-driver')).click()
      cy.assertPath('/how-to-become-driver')
    })

    it('keeps the PEC affiliate link in the participation section', () => {
      cy.get('#section-3')
        .find('a[href*="keliweb.it"]')
        .should('have.attr', 'href')
        .and('include', 'aff=6108')
    })
  })

  describe('dashboard tabs', () => {
    it('opens on the table tab', () => {
      cy.get(sel.desktopTabBar)
        .contains('button', t.dashboard.tabs.table)
        .should('have.class', 'bg-blue-600')
      cy.get(sel.bidLink).should('exist')
      cy.get(sel.map).should('not.exist')
    })

    it('switches to the map tab and back', () => {
      cy.get(sel.desktopTabBar).contains('button', t.dashboard.tabs.map).click()
      cy.get(sel.map).should('be.visible')
      cy.get(sel.bidLink).should('not.exist')
      cy.get(sel.desktopTabBar)
        .contains('button', t.dashboard.tabs.map)
        .should('have.class', 'bg-blue-600')

      cy.get(sel.desktopTabBar).contains('button', t.dashboard.tabs.table).click()
      cy.get(sel.bidLink).should('exist')
      cy.get(sel.map).should('not.exist')
    })
  })

  describe('JSON-LD', () => {
    it('describes the bid database as a Dataset', () => {
      cy.jsonLd().then((blocks) => {
        const dataset = blocks.find((block) => block['@type'] === 'Dataset')
        expect(dataset, 'Dataset schema').to.exist
        expect(dataset!.name).to.eq('Database Bandi e Licenze NCC in Italia')
        expect(dataset!.spatialCoverage.name).to.eq('Italia')
        expect(dataset!.spatialCoverage.geo.latitude).to.eq(41.8719)
        expect(dataset!.spatialCoverage.geo.longitude).to.eq(12.5674)
      })
    })
  })
})
