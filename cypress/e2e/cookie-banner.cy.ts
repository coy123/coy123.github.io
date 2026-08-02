import { sel } from '../support/selectors'
import { t } from '../support/site'

const consent = () =>
  cy.window().then((win) => win.localStorage.getItem('cookie-consent'))

const visitWithConsent = (value: string) =>
  cy.visitRaw('/', {
    onBeforeLoad(win) {
      win.localStorage.setItem('cookie-consent', value)
    },
  })

describe('Cookie banner', () => {
  beforeEach(() => {
    cy.useDesktop()
  })

  describe('first visit', () => {
    beforeEach(() => {
      cy.visitRaw('/')
    })

    it('appears when no choice has been stored', () => {
      cy.get(sel.cookieBanner).should('be.visible')
      cy.get(sel.cookieBanner).should('contain.text', 'Questo sito utilizza cookie tecnici')
      cy.get(sel.cookieBanner).contains('button', 'Accetta').should('be.visible')
      cy.get(sel.cookieBanner).contains('button', 'Rifiuta').should('be.visible')
    })

    it('stores the consent and hides the banner on Accetta', () => {
      cy.get(sel.cookieBanner).contains('button', 'Accetta').click()
      cy.get(sel.cookieBanner).should('not.exist')
      consent().should('eq', 'accepted')
    })

    it('stores the refusal and hides the banner on Rifiuta', () => {
      cy.get(sel.cookieBanner).contains('button', 'Rifiuta').click()
      cy.get(sel.cookieBanner).should('not.exist')
      consent().should('eq', 'declined')
    })

    it('links to the cookie policy', () => {
      cy.get(sel.cookieBanner).contains('a', t.pages.cookiePolicy.title).click()
      cy.assertPath('/cookie-policy')
    })

    it('reappears on the next page while no choice has been made', () => {
      cy.get(sel.cookieBanner).should('be.visible')
      cy.visitRaw('/faq')
      cy.get(sel.cookieBanner).should('be.visible')
    })
  })

  describe('more-information modal', () => {
    beforeEach(() => {
      cy.visitRaw('/')
      cy.get(sel.cookieBanner).contains('button', 'Maggiori informazioni').click()
      cy.get(sel.cookieModal).should('be.visible')
    })

    it('explains the cookie usage', () => {
      cy.get(sel.cookieModal)
        .contains('h2', 'Questo sito utilizza cookie')
        .should('be.visible')
      cy.get(sel.cookieModal).should('contain.text', 'cookie tecnici')
    })

    it('closes via the X and leaves the banner in place', () => {
      cy.get(sel.cookieModal)
        .find('button[aria-label="Chiudi"]')
        .should('exist')
        .click()
      cy.get(sel.cookieModal).should('not.exist')
      cy.get(sel.cookieBanner).should('be.visible')
      consent().should('be.null')
    })

    it('closes when the backdrop is clicked', () => {
      // Same as the other overlays: the backdrop fills the viewport, so its
      // centre point is behind the dialog and Cypress's visibility heuristic
      // rejects it. Prove it is topmost near the corner, then click there.
      const x = 20
      const y = 20
      cy.document().then((doc) => {
        const topmost = doc.elementFromPoint(x, y)
        expect(topmost?.className, `element at (${x}, ${y})`).to.contain('bg-black')
      })
      cy.get(sel.cookieModal).find('div.absolute.inset-0').click(x, y, { force: true })
      cy.get(sel.cookieModal).should('not.exist')
      cy.get(sel.cookieBanner).should('be.visible')
    })

    it('accepts from inside the modal and dismisses everything', () => {
      cy.get(sel.cookieModal).contains('button', 'Accetta').click()
      cy.get(sel.cookieModal).should('not.exist')
      cy.get(sel.cookieBanner).should('not.exist')
      consent().should('eq', 'accepted')
    })

    it('declines from inside the modal and dismisses everything', () => {
      cy.get(sel.cookieModal).contains('button', 'Rifiuta').click()
      cy.get(sel.cookieModal).should('not.exist')
      cy.get(sel.cookieBanner).should('not.exist')
      consent().should('eq', 'declined')
    })
  })

  describe('returning visitor', () => {
    it('stays hidden after acceptance', () => {
      visitWithConsent('accepted')
      cy.get(sel.cookieBanner).should('not.exist')
    })

    it('stays hidden after refusal', () => {
      visitWithConsent('declined')
      cy.get(sel.cookieBanner).should('not.exist')
    })

    it('stays hidden across navigation', () => {
      visitWithConsent('accepted')
      cy.get(sel.cookieBanner).should('not.exist')
      cy.get(sel.desktopNav).contains('a', 'FAQ').click()
      cy.assertPath('/faq')
      cy.get(sel.cookieBanner).should('not.exist')
    })
  })

  it('does not block the content underneath it', () => {
    cy.visitRaw('/')
    cy.get(sel.cookieBanner).should('be.visible')
    // The footer links sit above the banner in the stacking order only after
    // the banner is dismissed, so accept first and then use them.
    cy.get(sel.cookieBanner).contains('button', 'Accetta').click()
    cy.get(sel.footer).contains('a', t.footer.links.disclaimer).click()
    cy.assertPath('/disclaimer')
  })
})
