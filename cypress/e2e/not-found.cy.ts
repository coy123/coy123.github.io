import { sel } from '../support/selectors'

const UNKNOWN_PATHS = [
  '/questa-pagina-non-esiste',
  '/bandi/comune-inesistente',
  '/faq/sottopagina-inesistente',
]

describe('404 page', () => {
  UNKNOWN_PATHS.forEach((path) => {
    it(`renders the not-found page for ${path}`, () => {
      cy.useDesktop()
      cy.visitPage(path, { failOnStatusCode: false })
      cy.contains('h1', '404').should('be.visible')
      cy.contains('h2', 'Pagina non trovata').should('be.visible')
      cy.contains('La pagina che stai cercando non esiste.').should('be.visible')
    })
  })

  it('offers a way back to the home page', () => {
    cy.useDesktop()
    cy.visitPage('/questa-pagina-non-esiste', { failOnStatusCode: false })
    cy.contains('a', 'Torna alla Home').should('have.attr', 'href', '/').click()
    cy.assertPath('/')
    cy.get(sel.tableRow).should('exist')
  })

  it('keeps the navigation and footer available', () => {
    cy.useDesktop()
    cy.visitPage('/questa-pagina-non-esiste', { failOnStatusCode: false })
    cy.get(sel.desktopNav).should('be.visible')
    cy.get(sel.footer).should('exist')
  })

  it('responds with a 404 status code', () => {
    cy.request({ url: '/questa-pagina-non-esiste/', failOnStatusCode: false }).then((response) => {
      expect(response.status, 'unknown routes must not return 200').to.eq(404)
    })
  })
})
