import { sel } from '../support/selectors'
import { bidPath, bids, hrefSelector, t } from '../support/site'
import { hasItalianLocale, isPlaceholderLink } from '../../lib/subscription'

/**
 * The paid-newsletter surface: /abbonamento (the pitch and the Stripe Payment
 * Links) and /grazie (where a Payment Link redirects after payment).
 *
 * The Stripe URLs live in `locales/it.json` and are recreated in live mode, so
 * they start out as `TODO_` placeholders. Rather than assert one shape and go
 * red until someone pastes the real URLs — which would block every unrelated
 * deploy, and with it the newsletter that chains off it — each test asserts the
 * contract that applies to the state the JSON is actually in. Both branches are
 * real assertions: nothing here silently passes.
 */
type Plan = { id: string; name: string; price: string; note: string; cta: string; href: string }

const page = t.pages.abbonamento
const plans = page.plans as Plan[]
const paymentLinksLive = plans.every((plan) => !isPlaceholderLink(plan.href))
const portalLive = !isPlaceholderLink(page.manage.href)

describe('Abbonamento', () => {
  beforeEach(() => {
    cy.useDesktop()
    cy.visitPage('/abbonamento')
  })

  it('lists every plan with its price', () => {
    plans.forEach((plan) => {
      cy.contains(plan.name).should('be.visible')
      cy.contains(plan.price).should('be.visible')
    })
  })

  it('states that VAT is included', () => {
    // The prices are tax-inclusive in Stripe and irreversibly so per price:
    // advertising them without saying "IVA inclusa" would understate the
    // total to a B2C buyer.
    plans.forEach((plan) => {
      expect(plan.note, `${plan.name} note`).to.contain('IVA inclusa')
    })
  })

  if (paymentLinksLive) {
    it('sends each plan to a Stripe Payment Link', () => {
      plans.forEach((plan) => {
        const url = new URL(plan.href)
        expect(url.protocol, `${plan.name} protocol`).to.eq('https:')
        expect(url.hostname, `${plan.name} host`).to.eq('buy.stripe.com')
        cy.get(`a[href="${plan.href}"]`)
          .should('be.visible')
          .and('have.attr', 'target', '_blank')
          .and('have.attr', 'rel')
          .and('contain', 'noopener')
      })
    })

    it('asks Stripe for Italian checkout on every plan', () => {
      // Without `locale=it` Stripe renders checkout in the browser's language,
      // and a fair share of this audience runs an English browser.
      plans.forEach((plan) => {
        expect(hasItalianLocale(plan.href), `${plan.name} carries locale=it`).to.be.true
      })
    })
  } else {
    it('renders no payment button while the Payment Links are placeholders', () => {
      // A live page whose "Abbonati" link 404s is worse than one that says
      // subscriptions are not open yet.
      plans.forEach((plan) => {
        cy.contains(plan.cta).should('not.exist')
      })
      cy.get('a[href*="buy.stripe.com"]').should('not.exist')
      cy.get('a[href*="TODO_"]').should('not.exist')
      cy.contains(page.comingSoon).should('be.visible')
      cy.contains(page.comingSoonNote).should('be.visible')
    })
  }

  it(
    portalLive
      ? 'links to the Stripe customer portal'
      : 'renders no portal link while the portal URL is a placeholder',
    () => {
      if (portalLive) {
        expect(new URL(page.manage.href).hostname).to.eq('billing.stripe.com')
        cy.get(`a[href="${page.manage.href}"]`)
          .should('be.visible')
          .and('have.attr', 'target', '_blank')
      } else {
        cy.get('a[href*="billing.stripe.com"]').should('not.exist')
        cy.get('a[href*="TODO_"]').should('not.exist')
      }
    }
  )

  it('publishes a Product schema carrying both prices', () => {
    cy.jsonLd().then((blocks) => {
      const schema = blocks.find((block) => block['@type'] === 'Product')
      expect(schema, 'Product schema').to.exist
      const prices = schema!.offers.map((offer: { price: string }) => offer.price)
      expect(prices).to.deep.eq(['5.90', '59.00'])
      schema!.offers.forEach((offer: { priceCurrency: string }) => {
        expect(offer.priceCurrency).to.eq('EUR')
      })
    })
  })

  it('points at the privacy policy, where the processors are named', () => {
    cy.get(hrefSelector('/privacy-policy')).should('exist')
  })
})

describe('Abbonamento entry points', () => {
  it('is reachable from the home page banner ad', () => {
    cy.useDesktop()
    cy.visitPage('/')
    cy.get(sel.contentArea).contains(t.newsletterAd.heading).click()
    cy.assertPath('/abbonamento')
  })

  it('is reachable from the strip on a bid detail page', () => {
    cy.useDesktop()
    cy.visitPage(bidPath(bids[0]))
    cy.get(sel.contentArea).contains(t.newsletterAd.heading).click()
    cy.assertPath('/abbonamento')
  })

  it('is reachable from the footer on mobile', () => {
    cy.useMobile()
    cy.visitPage('/')
    cy.get(sel.footer).find(hrefSelector('/abbonamento')).click()
    cy.assertPath('/abbonamento')
  })

  it('shows the side rails on desktop but not on mobile', () => {
    cy.useDesktop()
    cy.visitPage('/')
    cy.get(sel.sideAd).should('have.length', 2).and('be.visible')
    cy.useMobile()
    cy.get(sel.sideAd).should('not.be.visible')
  })

  it('drops the side rails on the pages they would advertise', () => {
    // A "subscribe" pitch next to the checkout, or beside the thank-you page of
    // someone who just paid, reads as broken.
    cy.useDesktop()
    ;['/abbonamento', '/grazie'].forEach((path) => {
      cy.visitPage(path)
      cy.get(sel.sideAd).should('not.exist')
    })
  })
})

describe('Grazie', () => {
  beforeEach(() => {
    cy.useDesktop()
    cy.visitPage('/grazie')
  })

  it('responds with 200', () => {
    cy.assertReachable('/grazie')
  })

  it('renders the confirmation hero as the only h1', () => {
    cy.get('h1').should('have.length', 1).and('have.text', t.pages.grazie.title)
  })

  it('stays out of the index', () => {
    // It is a post-payment confirmation, not content: indexed it would compete
    // with /abbonamento for the same intent. It is left out of
    // public/sitemap.xml for the same reason.
    cy.get('meta[name="robots"]').should('have.attr', 'content').and('match', /noindex/)
  })

  it('explains what happens next', () => {
    ;(t.pages.grazie.steps as string[]).forEach((step) => {
      cy.contains(step).should('be.visible')
    })
  })

  it('offers a way out for a subscriber the API cannot reactivate', () => {
    // MailerLite refuses to reactivate a previously-unsubscribed address, so
    // the grant silently strands a paying customer. Until the re-subscribe
    // form exists, this copy plus the mailto is the whole mitigation.
    cy.contains(t.pages.grazie.troubleNote).should('be.visible')
    cy.get('a[href="mailto:info@bandincc.it"]').should('be.visible')
  })

  it('leads back to the bids', () => {
    cy.get(hrefSelector('/')).should('exist')
  })

  it('celebrates without getting in the way', () => {
    // Decorative only: it covers the viewport, so if it ever caught pointer
    // events it would swallow every click on the page underneath.
    cy.get(sel.celebration)
      .should('exist')
      .and('have.attr', 'aria-hidden', 'true')
      .and('have.css', 'pointer-events', 'none')
  })

  it('does not widen the page at any size', () => {
    // Confetti drifts sideways and balloons sway; the overflow-hidden wrapper
    // is what stops that turning into a horizontal scrollbar. /grazie is not in
    // ROUTES, so `responsive.cy.ts` never checks it.
    ;([
      { name: 'mobile', width: 390, height: 844 },
      { name: 'desktop', width: 1280, height: 800 },
    ] as const).forEach((viewport) => {
      cy.viewport(viewport.width, viewport.height)
      cy.visitPage('/grazie')
      cy.document().then((doc) => {
        expect(
          doc.documentElement.scrollWidth,
          `${viewport.name} horizontal overflow`
        ).to.be.at.most(viewport.width + 1)
      })
    })
  })
})
