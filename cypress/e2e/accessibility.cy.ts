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

  it('exposes the FAQ toggles as keyboard-operable buttons', () => {
    // Enter/Space activation on a native <button> is a browser default action,
    // which Cypress's synthetic key events do not reproduce. So assert the
    // properties that make it keyboard-operable — real <button>, in the tab
    // order, focusable — and that activating it toggles the panel.
    cy.visitPage('/faq')
    cy.get(sel.accordion).first().find('button').first().as('toggle')
    cy.get('@toggle').should('have.prop', 'tagName', 'BUTTON')
    cy.get('@toggle').should('not.have.attr', 'tabindex')
    cy.get('@toggle').should('not.be.disabled')
    cy.get('@toggle').focus().should('have.focus')
    cy.get('@toggle').click()
    cy.get(sel.accordion)
      .first()
      .find(sel.accordionPanel)
      .first()
      .should('have.class', 'grid-rows-[1fr]')
  })

  it('tells assistive tech whether an FAQ answer is open', () => {
    // Without aria-expanded the toggle announces as a bare button: nothing says
    // it expands anything, nor whether it currently is. aria-controls ties it to
    // the panel it opens.
    cy.visitPage('/faq')
    cy.get(sel.accordion).first().find('button').first().as('toggle')

    cy.get('@toggle').should('have.attr', 'aria-expanded', 'false')
    cy.get('@toggle')
      .invoke('attr', 'aria-controls')
      .should('be.a', 'string')
      .and('not.be.empty')

    cy.get('@toggle').then(($toggle) => {
      const panelId = $toggle.attr('aria-controls') as string
      // The panel must exist, and point back at the button that controls it.
      cy.get(`#${CSS.escape(panelId)}`)
        .should('exist')
        .and('have.attr', 'aria-labelledby', $toggle.attr('id') as string)
    })

    cy.get('@toggle').click()
    cy.get('@toggle').should('have.attr', 'aria-expanded', 'true')
  })

  it('keeps every id unique across both accordions on the page', () => {
    // /faq renders two independent accordions — 18 FAQ entries, then the
    // glossary — and the ids now cross the SSR/hydration boundary. An index-based
    // scheme would collide between the two lists and aria-controls would resolve
    // to the wrong panel.
    cy.visitPage('/faq')
    cy.get('[aria-controls]').then(($toggles) => {
      const ids = [...$toggles].map((el) => el.getAttribute('aria-controls'))
      expect(ids.length, 'toggles found').to.be.greaterThan(1)
      expect(new Set(ids).size, 'every aria-controls target is distinct').to.eq(ids.length)
    })
  })

  it('takes a collapsed answer out of the tab order', () => {
    // The panel collapses with grid-rows/opacity, which hides it visually but
    // leaves its content focusable and readable by a screen reader. `invisible`
    // is what actually removes it: without it, a keyboard user is dragged
    // through the links buried in every closed answer on the page.
    cy.visitPage('/faq')

    // Every answer on the page starts collapsed.
    cy.get(sel.accordionPanel).should('have.class', 'invisible')

    // Anything focusable inside any of them must be unreachable. Asserted over
    // every panel rather than a chosen one: which answers carry links is a
    // property of data/faq.json, and the first one happens not to.
    cy.get(sel.accordionPanel).find('a').should('have.length.greaterThan', 0)
    cy.get(sel.accordionPanel)
      .find('a')
      .each(($link) => {
        // `:visible` is Cypress's own check and honours visibility:hidden on an
        // ancestor, which is exactly the property that removes the tab stop.
        cy.wrap($link).should('not.be.visible')
      })

    cy.get(sel.accordion).first().find('button').first().click()
    cy.get(sel.accordion)
      .first()
      .find(sel.accordionPanel)
      .first()
      .should('have.class', 'visible')
      .and('be.visible')
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
