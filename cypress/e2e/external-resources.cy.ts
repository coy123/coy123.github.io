import { bids, laws } from '../support/site'

/**
 * Opt-in spec. The whole point is to hit the real internet — Wikimedia crests
 * and the municipal bid pages — so it is skipped unless
 * `CYPRESS_checkExternalLinks=true` is set. Municipal sites go down, move
 * pages and rate-limit, which is exactly why this must not gate a deploy by
 * default. Run it on a schedule to find rotten source URLs.
 */
const enabled = () => Boolean(Cypress.env('checkExternalLinks'))

const head = (url: string) =>
  cy.request({
    url,
    method: 'GET',
    failOnStatusCode: false,
    followRedirect: true,
    timeout: 30000,
  })

describe('External resources', { retries: 0 }, () => {
  before(function () {
    if (!enabled()) this.skip()
  })

  describe('coat-of-arms images', () => {
    it('serves every bid crest', () => {
      const seen = new Set<string>()
      bids.forEach((bid) => {
        if (seen.has(bid.image)) return
        seen.add(bid.image)
        head(bid.image).then((response) => {
          expect(response.status, `crest for ${bid.location}`).to.be.lessThan(400)
        })
      })
    })

    it('serves every law crest', () => {
      laws.forEach((law) => {
        head(law.image).then((response) => {
          expect(response.status, `crest for ${law.location}`).to.be.lessThan(400)
        })
      })
    })
  })

  describe('official sources', () => {
    it('reaches every municipal bid page', () => {
      bids.forEach((bid) => {
        head(bid.url).then((response) => {
          expect(response.status, `source for ${bid.location} (${bid.url})`).to.be.lessThan(400)
        })
      })
    })

    it('reaches every regional regulation', () => {
      laws.forEach((law) => {
        head(law.url).then((response) => {
          expect(response.status, `regulation for ${law.location} (${law.url})`).to.be.lessThan(
            400
          )
        })
      })
    })
  })
})
