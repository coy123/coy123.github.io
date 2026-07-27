import { ROUTES } from '../support/routes'
import { sel } from '../support/selectors'
import { bidPath, bids } from '../support/site'

const PAGES = [...ROUTES.map((route) => route.path), bidPath(bids[0])]

/**
 * Hand-rolled accessibility floor — no axe dependency, just the invariants this
 * site can be held to: every control is nameable, every image is described, and
 * everything interactive is reachable from the keyboard.
 */
describe('Accessibility basics', () => {
  PAGES.forEach((page) => {
    describe(page, () => {
      beforeEach(() => {
        cy.useDesktop()
        cy.visitPage(page)
      })

      it('gives every content image an alt text', () => {
        cy.get('body').then(($body) => {
          const images = $body
            .find('img')
            .toArray()
            .filter((image) => !image.closest('.leaflet-container'))

          images.forEach((image) => {
            const alt = image.getAttribute('alt')
            expect(alt, `alt of <img src="${image.getAttribute('src')}">`).to.be.a('string')
            expect((alt ?? '').trim(), `alt of <img src="${image.getAttribute('src')}">`).to.not
              .be.empty
          })
        })
      })

      it('gives every button an accessible name', () => {
        cy.get('button').each(($button) => {
          const name =
            $button.attr('aria-label') ||
            $button.attr('title') ||
            $button.text().trim()
          expect(name, `accessible name of <button class="${$button.attr('class')}">`).to.not.be
            .empty
        })
      })

      it('gives every form control an accessible name', () => {
        cy.get('body').then(($body) => {
          const controls = $body.find('input, select, textarea').toArray()
          controls.forEach((control) => {
            const id = control.getAttribute('id')
            const label = id ? $body.find(`label[for="${id}"]`).length > 0 : false
            const name =
              label ||
              control.getAttribute('aria-label') ||
              control.getAttribute('aria-labelledby') ||
              control.getAttribute('placeholder')
            expect(name, `accessible name of <${control.tagName.toLowerCase()} id="${id}">`).to.be
              .ok
          })
        })
      })

      it('has at least one h1 and no empty headings', () => {
        cy.get('h1').should('have.length.greaterThan', 0)
        cy.get('h1, h2, h3, h4, h5, h6').each(($heading) => {
          expect($heading.text().trim(), `<${$heading.prop('tagName')}> is not empty`).to.not.be
            .empty
        })
      })

      it('declares the page language', () => {
        cy.get('html').should('have.attr', 'lang', 'it')
      })

      it('lets the keyboard reach the first navigation link', () => {
        cy.get(sel.desktopNav).find('a').first().focus().should('have.focus')
      })
    })
  })

  it('toggles a FAQ answer with the keyboard', () => {
    cy.visitPage('/faq')
    cy.get(sel.accordion).first().find('button').first().focus().should('have.focus')
    cy.focused().type('{enter}')
    cy.get(sel.accordion)
      .first()
      .find(sel.accordionPanel)
      .first()
      .should('have.class', 'grid-rows-[1fr]')
  })

  it('submits the calculator with the keyboard', () => {
    cy.visitPage('/income-calculator')
    cy.get('#hoursPerDay').focus().type('{enter}')
    cy.get(sel.calculatorModal).should('be.visible')
  })

  it('names the icon-only buttons inside the calculator modal', () => {
    cy.visitPage('/income-calculator')
    cy.contains('button', 'Calcola Guadagno').click()
    cy.get(sel.calculatorModal)
      .find('button')
      .each(($button) => {
        const name = $button.attr('aria-label') || $button.text().trim()
        expect(name, 'accessible name of a modal button').to.not.be.empty
      })
  })

  it('names the icon-only buttons inside the cookie modal', () => {
    cy.visitRaw('/')
    cy.get(sel.cookieBanner).contains('button', 'Maggiori informazioni').click()
    cy.get(sel.cookieModal)
      .find('button')
      .each(($button) => {
        const name = $button.attr('aria-label') || $button.text().trim()
        expect(name, 'accessible name of a cookie-modal button').to.not.be.empty
      })
  })

  it('labels the mobile menu button for screen readers', () => {
    cy.useMobile()
    cy.visitPage('/')
    cy.get(sel.mobileMenuButton)
      .find('.sr-only')
      .should('exist')
      .invoke('text')
      .should('not.be.empty')
  })
})
