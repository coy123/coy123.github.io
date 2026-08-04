/**
 * Stripe links live in `locales/it.json` (`pages.abbonamento`), like all other
 * copy, and are recreated from scratch when the account moves from test mode to
 * live mode — test-mode Payment Links, portal links and signing secrets do not
 * copy across. Until the live URLs are pasted in, the JSON carries `TODO_`
 * placeholders.
 *
 * A placeholder must never render as a working button: a live page whose
 * "Abbonati" link 404s is worse than a page that says subscriptions are not
 * open yet. `isPlaceholderLink` is what the page branches on, and what
 * `cypress/e2e/subscription.cy.ts` uses to decide which contract to enforce —
 * so the two can never disagree about whether the links are real.
 */
export const isPlaceholderLink = (href: string): boolean => href.includes('TODO_')

/**
 * Stripe renders its hosted pages in the *browser's* language unless told
 * otherwise, and a fair share of an Italian audience runs an English-configured
 * browser. Every Payment Link therefore carries `locale=it`; the test asserts
 * it so it cannot be dropped when the live URLs are pasted in.
 */
export const hasItalianLocale = (href: string): boolean =>
  new URL(href).searchParams.get('locale') === 'it'
