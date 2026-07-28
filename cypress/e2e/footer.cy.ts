import { FOOTER_LINKS, ROUTES } from '../support/routes'
import { sel } from '../support/selectors'
import { samePath, t } from '../support/site'

describe('Footer', () => {
  beforeEach(() => {
    cy.useDesktop()
    cy.visitPage('/')
  })

  it('renders the three legal links', () => {
    cy.get(sel.footer)
      .find('a')
      .should('have.length', FOOTER_LINKS.length)
      .each(($link, index) => {
        expect(
          samePath($link.attr('href') ?? '', FOOTER_LINKS[index].path),
          `href of ${FOOTER_LINKS[index].label}`
        ).to.be.true
        expect($link.text().trim()).to.eq(FOOTER_LINKS[index].label)
      })
  })

  it('renders the copyright line for the current year', () => {
    const expected = t.footer.copyright.replace('{year}', String(new Date().getFullYear()))
    cy.get(sel.footer).should('contain.text', expected)
  })

  FOOTER_LINKS.forEach((link) => {
    it(`navigates to ${link.path}`, () => {
      cy.get(sel.footer).contains('a', link.label).click()
      cy.assertPath(link.path)
    })
  })

  it('is present on every route', () => {
    ROUTES.forEach((route) => {
      cy.visitPage(route.path)
      cy.get(sel.footer).find('a').should('have.length', FOOTER_LINKS.length)
    })
  })

  it('is pushed to the bottom on short pages', () => {
    cy.visitPage('/contact')
    cy.get(sel.footer).then(($footer) => {
      const rect = $footer[0].getBoundingClientRect()
      expect(rect.bottom, 'footer reaches at least the viewport bottom').to.be.at.least(
        Cypress.config('viewportHeight') - 1
      )
    })
  })
})
