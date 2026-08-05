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

// ---------------------------------------------------------------------------
// Test mode vs live mode
//
// Staging (Netlify) needs to exercise the whole funnel — page → Payment Link →
// checkout → redirect → Worker → MailerLite — without moving real money, so it
// builds against Stripe's *test-mode* links and a throwaway MailerLite group.
// Production (GitHub Pages) builds against the live ones.
//
// The site is `output: 'export'`, so there is no server to branch on a hostname
// at request time: the choice is made once, at build time, from `STRIPE_MODE`.
// The variable is read only by server components, so it needs no NEXT_PUBLIC_
// prefix and never reaches the browser bundle.
//
// The pairing lives in the JSON (`href` / `hrefTest`) rather than in two
// separate files, so a link can never be updated in one mode and forgotten in
// the other.
// ---------------------------------------------------------------------------

export type StripeMode = 'live' | 'test'

export interface StripeLink {
  /** The live-mode URL. What production ships. */
  href: string
  /** The test-mode URL. What staging ships. */
  hrefTest?: string
}

/**
 * Returned when the slot for the current mode is empty. It carries the `TODO_`
 * marker on purpose: an unconfigured mode then renders "Attivazione a breve"
 * through the same branch as an unconfigured live link, rather than falling
 * back to the *other* mode's URL — which is the one failure that would put a
 * live Payment Link on staging or a test one in production.
 */
const UNCONFIGURED = 'https://buy.stripe.com/TODO_LINK_NOT_CONFIGURED'

/**
 * Defaults to `live`, and that direction matters. Forgetting `STRIPE_MODE` on
 * staging just leaves staging showing the placeholder state — visible,
 * harmless, fixed in one line. Defaulting to `test` would mean any build that
 * lost the variable could ship a test-mode checkout to production, which takes
 * a card, charges nobody and grants nothing.
 */
export const currentStripeMode = (): StripeMode =>
  typeof process !== 'undefined' && process.env.STRIPE_MODE === 'test' ? 'test' : 'live'

/**
 * Stripe puts test-mode ids behind a `test_` path segment on both hosted
 * surfaces — `buy.stripe.com/test_…` for a Payment Link,
 * `billing.stripe.com/p/login/test_…` for the portal — while live ids never
 * carry it. Host alone cannot tell the two apart, so this is the only
 * discriminator available to a static build.
 */
export const isTestModeLink = (href: string): boolean =>
  new URL(href).pathname.split('/').some((segment) => segment.startsWith('test_'))

/**
 * Picks the URL for the mode this build is for. Pure: the mode is a parameter
 * so the Cypress spec can resolve exactly what the build resolved, taking its
 * value from `Cypress.env('stripeMode')` instead of `process.env`.
 *
 * It deliberately does NOT throw on a mode/link mismatch. The gate for that is
 * `cypress/e2e/subscription.cy.ts`, which runs against the built `out/` in
 * `e2e.yml` before either deploy job starts — so a mismatch fails as a named
 * assertion with the offending URL in the message, instead of a stack trace
 * from inside `next build`.
 */
export const stripeHref = (link: StripeLink, mode: StripeMode = currentStripeMode()): string =>
  (mode === 'test' ? link.hrefTest : link.href) || UNCONFIGURED

/**
 * True when a resolved link belongs to the mode it was resolved for.
 * Placeholders pass: they render no button at all, so they cannot mis-charge
 * anyone, and holding them to this would make an unconfigured mode look like a
 * wiring bug.
 */
export const matchesStripeMode = (href: string, mode: StripeMode): boolean =>
  isPlaceholderLink(href) || isTestModeLink(href) === (mode === 'test')
