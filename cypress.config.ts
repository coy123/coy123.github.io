import { defineConfig } from 'cypress'

// The site is a static export served on a plain HTTP server, so the tests only
// need a base URL. Override with CYPRESS_BASE_URL when running against a
// preview deployment (e.g. the Netlify staging URL) instead of localhost.
const baseUrl = process.env.CYPRESS_BASE_URL ?? 'http://localhost:3000'

export default defineConfig({
  e2e: {
    baseUrl,
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    fixturesFolder: 'cypress/fixtures',
    downloadsFolder: 'cypress/downloads',
    screenshotsFolder: 'cypress/screenshots',
    videosFolder: 'cypress/videos',
    viewportWidth: 1280,
    viewportHeight: 800,
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    requestTimeout: 15000,
    responseTimeout: 30000,
    pageLoadTimeout: 60000,
    experimentalMemoryManagement: true,
    numTestsKeptInMemory: 5,
    retries: {
      runMode: 2,
      openMode: 0,
    },
    env: {
      // Stub third-party assets (Wikimedia crests, OSM tiles, Umami) so the
      // suite does not depend on external services. Set to false to exercise
      // the real network.
      stubExternalAssets: true,
      // Fire real HTTP requests at every external link found in the DOM.
      // Off by default: third-party sites rate-limit and would make CI flaky.
      checkExternalLinks: false,
      // True when running against the built `out/` export rather than
      // `next dev`. A handful of behaviours only exist in the real artifact —
      // notably, an unknown /bandi/<slug> is a plain 404 in the export, while
      // `next dev` throws "missing param in generateStaticParams()" because
      // `output: 'export'` is set. Set by the `cy:run:static` script.
      staticExport: false,
    },
  },
})
