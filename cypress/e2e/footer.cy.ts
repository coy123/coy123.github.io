import { FOOTER_LINKS, ROUTES } from '../support/routes'
import { sel } from '../support/selectors'
import { samePath, t } from '../support/site'

describe('Footer', () => {
  beforeEach(() => {
    cy.useDesktop()
    cy.visitPage('/')
  })

  it('renders every footer link in Italian', () => {
    cy.get(sel.footer)
      .find('a')
      .should('have.length', FOOTER_LINKS.length)
      .each(($link, index) => {
        const link = FOOTER_LINKS[index]
        const [path, hash] = ($link.attr('href') ?? '').split('#')
        expect(samePath(path, link.path), `href of ${link.label}`).to.be.true
        expect(hash ? `#${hash}` : '', `hash of ${link.label}`).to.eq(link.hash ?? '')
        expect($link.text().trim()).to.eq(link.label)
      })
  })

  it('shows the crest above the links', () => {
    cy.get(sel.footer)
      .find('img')
      .should('have.length', 1)
      .and('be.visible')
      .and('have.attr', 'src', '/images/logo-crest.svg')
      .and('have.attr', 'alt')
      .and('not.be.empty')
  })

  it('renders the copyright line for the current year', () => {
    const expected = t.footer.copyright.replace('{year}', String(new Date().getFullYear()))
    cy.get(sel.footer).should('contain.text', expected)
  })

  FOOTER_LINKS.forEach((link) => {
    it(`navigates to ${link.path}${link.hash ?? ''}`, () => {
      cy.get(sel.footer).contains('a', link.label).click()
      cy.assertPath(link.path)
      if (link.hash) {
        cy.location('hash').should('eq', link.hash)
        cy.get(link.hash).should('exist')
      }
    })
  })

  it('is present on every route', () => {
    ROUTES.forEach((route) => {
      cy.visitPage(route.path)
      cy.get(sel.footer).find('a').should('have.length', FOOTER_LINKS.length)
    })
  })

  it('is pushed to the bottom on short pages', () => {
    // The 404 page is now the shortest thing on the site — /contact used to
    // hold this role, and is a redirect stub since Contatti merged into
    // Chi Siamo.
    cy.visitPage('/questa-pagina-non-esiste', { failOnStatusCode: false })
    cy.get(sel.footer).then(($footer) => {
      const rect = $footer[0].getBoundingClientRect()
      expect(rect.bottom, 'footer reaches at least the viewport bottom').to.be.at.least(
        Cypress.config('viewportHeight') - 1
      )
    })
  })
})
