import { t } from '../support/site'

/**
 * /contact used to be a page. Its content now lives in the "Contatti" section
 * of Chi Siamo, and the old route survives only to catch bookmarks and any
 * indexed copy of the URL.
 *
 * `output: 'export'` means there is no server to issue a 301 and no
 * next.config redirect to lean on, so the stub does the work in markup: a
 * zero-delay meta refresh, a canonical pointing at the merged page, noindex,
 * and a visible link for anyone the refresh misses. The markup assertions read
 * the raw response rather than the rendered page, because by the time the
 * browser settles it has already left for /about-us.
 */
describe('Retired /contact route', () => {
  it('serves a stub that names the merged page', () => {
    cy.request('/contact/').then((response) => {
      expect(response.status).to.eq(200)
      expect(response.body, 'meta refresh').to.match(
        /http-equiv="refresh"[^>]*\/about-us\/#contatti/
      )

      // Matched as a whole tag so the assertion survives either attribute order.
      const canonical = (response.body as string).match(/<link[^>]*rel="canonical"[^>]*>/)
      expect(canonical, 'canonical link').to.not.be.null
      expect(canonical![0], 'canonical target').to.contain('/about-us')

      expect(response.body, 'noindex').to.contain('noindex')
    })
  })

  it('keeps the URL out of the sitemap', () => {
    cy.request('/sitemap.xml').then((response) => {
      expect(response.body).to.not.contain('/contact')
      expect(response.body).to.contain('/about-us')
    })
  })

  it('sends a visitor on to the Contatti section', () => {
    cy.visitPage('/contact')
    cy.location('pathname', { timeout: 10000 }).should('match', /^\/about-us\/?$/)
    cy.get('#contatti').should('exist')
    cy.contains('h3', t.pages.contact.title).should('be.visible')
  })
})
