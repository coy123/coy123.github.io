import { ROUTES, TITLE_SUFFIX } from '../support/routes'
import { sel } from '../support/selectors'
import { normalize } from '../support/site'

/**
 * Smoke coverage for every statically-generated route: it responds, it renders
 * the right hero, and it carries the metadata the SEO setup promises.
 */
describe('Static routes', () => {
  ROUTES.forEach((route) => {
    describe(`${route.path}`, () => {
      beforeEach(() => {
        cy.useDesktop()
        cy.visitPage(route.path)
      })

      it('responds with 200', () => {
        cy.assertReachable(route.path)
      })

      it('renders the hero heading and subheading', () => {
        cy.get('div.mb-3.relative.rounded-lg')
          .first()
          .within(() => {
            cy.get('h1').should('have.text', route.h1)
            if (route.h2) {
              cy.get('h2').first().should('have.text', route.h2)
            }
          })
      })

      it('has exactly one h1, and it is the hero heading', () => {
        cy.get('h1')
          .should('have.length', 1)
          .and('have.text', route.h1)
          .and('be.visible')
      })

      it('sets the document title', () => {
        cy.title().should('eq', route.title)
      })

      it('names the site exactly once in the title', () => {
        // The root layout appends "| Bandi NCC Italia"; a page-level title that
        // also carries the site name produces a doubled-up tab label.
        cy.title().should((title) => {
          expect(title.split(TITLE_SUFFIX), `"${title}"`).to.have.length(2)
        })
      })

      it('sets the meta description', () => {
        cy.get('head meta[name="description"]')
          .should('have.length', 1)
          .and('have.attr', 'content', route.description)
      })

      it('declares Italian as the document language', () => {
        cy.get('html').should('have.attr', 'lang', 'it')
      })

      it('allows indexing', () => {
        cy.get('head meta[name="robots"]')
          .should('have.attr', 'content')
          .and('match', /index/)
          .and('not.match', /noindex/)
      })

      it('inherits the Open Graph defaults from the root layout', () => {
        cy.get('head meta[property="og:type"]').should('have.attr', 'content', 'website')
        cy.get('head meta[property="og:locale"]').should('have.attr', 'content', 'it_IT')
        cy.get('head meta[property="og:site_name"]').should(
          'have.attr',
          'content',
          'Bandi NCC Italia'
        )
      })

      it('emits valid JSON-LD including the sitewide WebSite schema', () => {
        cy.jsonLd().then((blocks) => {
          const types = blocks.map((block) => block['@type'])
          expect(types, 'WebSite schema from the root layout').to.include('WebSite')
          route.schemas.forEach((schema) => {
            expect(types, `${schema} schema`).to.include(schema)
          })
          blocks.forEach((block) => {
            expect(block['@context']).to.eq('https://schema.org')
          })
        })
      })

      it('renders the navigation and the footer', () => {
        cy.get(sel.desktopNav).should('be.visible')
        cy.get(sel.footer).should('exist')
      })

      it('has no visibly empty page body', () => {
        cy.get('body').invoke('text').then((text) => {
          expect(normalize(text).length).to.be.greaterThan(200)
        })
      })
    })
  })

  it('keeps a single h1 per route on mobile too', () => {
    // The mobile header renders the site name; it must not be a heading.
    cy.useMobile()
    ROUTES.forEach((route) => {
      cy.visitPage(route.path)
      cy.get('h1').should('have.length', 1).and('have.text', route.h1)
    })
  })
})
