import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { t } from '../cypress/support/site.ts'
import {
  hasItalianLocale,
  isPlaceholderLink,
  matchesStripeMode,
  stripeHref,
  type StripeMode,
} from '../lib/subscription.ts'

/**
 * The parts of the subscription contract that live in `locales/it.json` rather
 * than in the DOM: what the plans say, and which Stripe account their links
 * point at.
 *
 * `cypress/e2e/subscription.cy.ts` keeps everything that needs a rendered page,
 * and one of those is load-bearing here: it looks for `a[href="<resolved
 * href>"]` on `/abbonamento`, which is what ties the export to the mode it was
 * built in. This file cannot do that job — it never sees the HTML — so it does
 * the other half, checking that the links in the JSON belong to the mode we are
 * about to build. `e2e.yml` puts `STRIPE_MODE` on all three steps (this one,
 * the build and the Cypress run) for that reason.
 *
 * Read from `process.env` where the spec reads `Cypress.env('stripeMode')`, and
 * defaulting to `live` in both places to match `currentStripeMode()`.
 */
const mode: StripeMode = process.env.STRIPE_MODE === 'test' ? 'test' : 'live'

type Plan = {
  id: string
  name: string
  price: string
  note: string
  cta: string
  href: string
  hrefTest?: string
}

const page = t.pages.abbonamento
const plans = page.plans as Plan[]
const planLinks = plans.map((plan) => ({ plan, href: stripeHref(plan, mode) }))
const portalHref = stripeHref(page.manage, mode)

const paymentLinksLive = planLinks.every(({ href }) => !isPlaceholderLink(href))

describe('Abbonamento copy and links', () => {
  it('states that VAT is included', () => {
    // The prices are tax-inclusive in Stripe and irreversibly so per price:
    // advertising them without saying "IVA inclusa" would understate the
    // total to a B2C buyer.
    plans.forEach((plan) => {
      assert.ok(plan.note.includes('IVA inclusa'), `${plan.name} note: "${plan.note}"`)
    })
  })

  it(`ships only ${mode}-mode Stripe links`, () => {
    // The hard gate on the whole two-mode arrangement, and the reason
    // `stripeHref` does not need to throw during the build: this runs before
    // `next build` does, so a mismatch stops the deploy rather than shipping.
    //
    // A test-mode Payment Link on www.bandincc.it would take a card, charge
    // nobody and grant nothing — a broken checkout that looks like a working
    // one. A live link on staging is the mirror image: a routine test run that
    // silently bills a real card.
    ;[
      ...planLinks.map(({ plan, href }) => [plan.name, href] as const),
      ['portale', portalHref] as const,
    ].forEach(([name, href]) => {
      assert.ok(
        matchesStripeMode(href, mode),
        `${name}: ${href} belongs in ${mode} mode`
      )
    })
  })

  if (paymentLinksLive) {
    it('asks Stripe for Italian checkout on every plan', () => {
      // Without `locale=it` Stripe renders checkout in the browser's language,
      // and a fair share of this audience runs an English browser.
      planLinks.forEach(({ plan, href }) => {
        assert.ok(hasItalianLocale(href), `${plan.name} carries locale=it: ${href}`)
      })
    })
  } else {
    it('leaves the Payment Links as recognisable placeholders', () => {
      // The complement of the branch above, so neither state passes silently:
      // while the live account does not exist the JSON must hold `TODO_` URLs,
      // which is what `/abbonamento` branches on to render "Attivazione a
      // breve" instead of a button that 404s.
      planLinks.forEach(({ plan, href }) => {
        assert.ok(isPlaceholderLink(href), `${plan.name} is a placeholder: ${href}`)
      })
    })
  }
})
