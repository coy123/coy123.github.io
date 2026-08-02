import { NAV_LABELLED_ITEMS, ROUTES, routeByPath } from '../support/routes'
import { sel } from '../support/selectors'
import { samePath, hrefSelector, t } from '../support/site'

describe('Navigation', () => {
  describe('desktop', () => {
    beforeEach(() => {
      cy.useDesktop()
      cy.visitPage('/')
    })

    it('shows the desktop bar and hides the mobile bar', () => {
      cy.get(sel.desktopNav).should('be.visible')
      cy.get(sel.mobileHeader).should('not.be.visible')
    })

    it('shows the crest and wordmark as the home link', () => {
      cy.get(sel.desktopNavBrand)
        .should('be.visible')
        .and('have.attr', 'aria-label', t.nav.home)
        .and('contain.text', t.nav.title)
        .find('img')
        .should('have.attr', 'src', '/images/logo-favicon.svg')
        .and('have.attr', 'alt', t.nav.title)
    })

    it('drops the labelled Home entry in favour of the crest', () => {
      cy.get(sel.desktopNavLinks).contains('a', t.nav.home).should('not.exist')
    })

    it('renders every nav item in order with the right label and href', () => {
      cy.get(sel.desktopNavLinks)
        .find('a')
        .should('have.length', NAV_LABELLED_ITEMS.length)
        .each(($link, index) => {
          const item = NAV_LABELLED_ITEMS[index]
          expect(samePath($link.attr('href') ?? '', item.path), `href of ${item.key}`).to.be.true
          expect($link.text()).to.contain(t.nav[item.key])
        })
    })

    it('marks the income calculator with the € badge', () => {
      cy.get(sel.desktopNavLinks)
        .find(hrefSelector('/income-calculator'))
        .should('contain.text', '💶')
        .and('contain.text', t.nav.incomeCalculator)
    })

    it('sticks to the top of the viewport', () => {
      cy.get(sel.desktopNav).should('have.css', 'position', 'sticky')
    })

    it('highlights the crest while the home page is open', () => {
      cy.get(sel.desktopNavBrand).should('have.class', 'bg-blue-600')
      // …and nothing in the item list competes with it.
      cy.get(sel.desktopNavLinks).find('a.bg-blue-600').should('not.exist')
    })

    it('drops the crest highlight once another page is open', () => {
      cy.get(sel.desktopNavLinks).contains('a', t.nav.faq).click()
      cy.assertPath('/faq')
      cy.get(sel.desktopNavBrand).should('not.have.class', 'bg-blue-600')
    })

    it('returns to the home page through the crest', () => {
      cy.get(sel.desktopNavLinks).contains('a', t.nav.aboutUs).click()
      cy.assertPath('/about-us')
      cy.get(sel.desktopNavBrand).click()
      cy.assertPath('/')
    })

    NAV_LABELLED_ITEMS.forEach((item) => {
      it(`navigates to ${item.path} and highlights it as active`, () => {
        cy.get(sel.desktopNavLinks).contains('a', t.nav[item.key]).click()
        cy.assertPath(item.path)

        // The active link is the only one painted blue.
        cy.get(sel.desktopNavLinks).find('a.bg-blue-600').should('have.length', 1)
        cy.get(sel.desktopNavLinks)
          .find(hrefSelector(item.path))
          .should('have.class', 'bg-blue-600')

        const route = ROUTES.find((candidate) => candidate.path === item.path)
        if (route) {
          cy.get('h1:visible').should('have.text', route.h1)
        }
      })
    })

    it('keeps the nav reachable from a bid detail page', () => {
      cy.visitPage('/')
      cy.get(sel.bidLink).first().click()
      cy.location('pathname').should('include', '/bandi/')
      cy.get(sel.desktopNavLinks).find('a').should('have.length', NAV_LABELLED_ITEMS.length)
      // Nothing is active on a route outside the nav — crest included.
      cy.get(sel.desktopNavLinks).find('a.bg-blue-600').should('not.exist')
      cy.get(sel.desktopNavBrand).should('not.have.class', 'bg-blue-600')
    })
  })

  describe('mobile', () => {
    beforeEach(() => {
      cy.useMobile()
      cy.visitPage('/')
    })

    it('shows the mobile bar and hides the desktop bar', () => {
      cy.get(sel.mobileHeader).should('be.visible')
      cy.get(sel.desktopNav).should('not.be.visible')
    })

    it('renders the site title and the calculator shortcut', () => {
      cy.get(sel.mobileHeader).should('contain.text', t.nav.title)
      cy.get(sel.mobileCalculatorShortcut)
        .should('be.visible')
        .and('have.attr', 'aria-label', t.nav.incomeCalculator)
    })

    it('reaches the home page through the header crest', () => {
      cy.get(sel.mobileHeaderBrand)
        .should('have.attr', 'aria-label', t.nav.home)
        .find('img')
        .should('have.attr', 'src', '/images/logo-favicon.svg')

      cy.get(sel.mobileMenuButton).click()
      cy.get(sel.mobileMenu).contains('a', t.nav.aboutUs).click()
      cy.assertPath('/about-us')

      cy.get(sel.mobileHeaderBrand).click()
      cy.assertPath('/')
    })

    it('opens and closes the hamburger menu', () => {
      cy.get(sel.mobileMenu).should('not.exist')
      cy.get(sel.mobileMenuButton).should('have.attr', 'aria-expanded', 'false').click()
      cy.get(sel.mobileMenu).should('be.visible')
      cy.get(sel.mobileMenuButton).should('have.attr', 'aria-expanded', 'true')

      // Second click on the (now X-shaped) button closes it again.
      cy.get(sel.mobileMenuButton).click()
      cy.get(sel.mobileMenu).should('not.exist')
    })

    it('closes the menu when the backdrop is clicked', () => {
      cy.get(sel.mobileMenuButton).click()
      cy.get(sel.mobileMenu).should('be.visible')

      // The backdrop spans the whole viewport, so its centre point sits behind
      // the 264px drawer and Cypress's visibility heuristic rejects it even
      // though the area to the right of the drawer is tappable. Prove the
      // backdrop really is the topmost element there, then tap that point.
      const x = 350
      const y = 400
      cy.document().then((doc) => {
        const topmost = doc.elementFromPoint(x, y)
        expect(topmost?.className, `element at (${x}, ${y})`).to.contain('fixed inset-0')
      })
      cy.get(sel.mobileMenuBackdrop).click(x, y, { force: true })
      cy.get(sel.mobileMenu).should('not.exist')
    })

    it('lists every nav item in the drawer, without a Home entry', () => {
      cy.get(sel.mobileMenuButton).click()
      cy.get(sel.mobileMenu).contains('a', t.nav.home).should('not.exist')
      cy.get(sel.mobileMenu)
        .find('a')
        .should('have.length', NAV_LABELLED_ITEMS.length)
        .each(($link, index) => {
          const item = NAV_LABELLED_ITEMS[index]
          expect(samePath($link.attr('href') ?? '', item.path), `href of ${item.key}`).to.be.true
          expect($link.text().trim()).to.eq(t.nav[item.key])
        })
    })

    NAV_LABELLED_ITEMS.forEach((item) => {
      it(`navigates to ${item.path} from the drawer and closes it`, () => {
        cy.get(sel.mobileMenuButton).click()
        cy.get(sel.mobileMenu).contains('a', t.nav[item.key]).click()
        cy.assertPath(item.path)
        cy.get(sel.mobileMenu).should('not.exist')
        cy.get(sel.contentArea).find('h1').should('have.text', routeByPath(item.path).h1)
      })
    })

    it('reaches the calculator through the € shortcut', () => {
      cy.get(sel.mobileCalculatorShortcut).click()
      cy.assertPath('/income-calculator')
    })
  })
})
