import './commands'

/**
 * The site pulls three things from the public internet: municipal coats of
 * arms from Wikimedia, OpenStreetMap raster tiles, and the Umami analytics
 * script. None of them are part of what we're testing, and all three make CI
 * slow and flaky, so they are stubbed by default.
 *
 * Run with `CYPRESS_stubExternalAssets=false` to hit the real services, and see
 * `external-resources.cy.ts` for the spec that deliberately does so.
 */
const TRANSPARENT_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"></svg>'

const stubImage = {
  statusCode: 200,
  headers: { 'content-type': 'image/svg+xml', 'cache-control': 'max-age=600' },
  body: TRANSPARENT_SVG,
}

export const stubExternalAssets = () => {
  cy.intercept('GET', 'https://upload.wikimedia.org/**', stubImage).as('crest')
  cy.intercept('GET', 'https://*.tile.openstreetmap.org/**', stubImage).as('tile')
  cy.intercept('GET', 'https://cloud.umami.is/**', {
    statusCode: 200,
    headers: { 'content-type': 'application/javascript' },
    body: '',
  }).as('umami')
  cy.intercept('POST', 'https://cloud.umami.is/**', { statusCode: 204, body: '' })
}

beforeEach(() => {
  if (Cypress.env('stubExternalAssets') !== false) {
    stubExternalAssets()
  }
})

/**
 * React 18 strict mode plus the dynamically imported Leaflet bundle can raise
 * two benign errors during teardown. Anything else must still fail the test.
 */
const IGNORED_ERRORS = [
  'ResizeObserver loop limit exceeded',
  'ResizeObserver loop completed with undelivered notifications',
  // Leaflet throws this when the map container is torn down mid-animation.
  "Cannot read properties of null (reading '_leaflet_pos')",
]

Cypress.on('uncaught:exception', (error) => {
  if (IGNORED_ERRORS.some((message) => error.message.includes(message))) {
    return false
  }
  return true
})
