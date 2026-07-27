import { ROUTES } from '../support/routes'
import { LinkInfo } from '../support/commands'
import { anyBidWithLaw, bidPath, bids } from '../support/site'

/**
 * Crawls every link rendered on every page and proves it goes somewhere.
 *
 * Internal targets are requested once per suite run (deduplicated across
 * pages). External targets are only structurally validated by default —
 * hammering third-party sites from CI is what makes link checkers flaky. Set
 * `CYPRESS_checkExternalLinks=true` to request them too.
 */
const requestedInternal = new Set<string>()

const PAGES: string[] = [
  ...ROUTES.map((route) => route.path),
  bidPath(bids[0]),
  ...(anyBidWithLaw() ? [bidPath(anyBidWithLaw()!)] : []),
]

const assertWellFormed = (links: LinkInfo[], kind: string) => {
  links.forEach((link) => {
    expect(link.href, `${kind} link "${link.text}" has an href`).to.not.be.empty
    expect(link.href, `${kind} link "${link.text}" is not a dead placeholder`).to.not.eq('#')
    expect(link.href.toLowerCase(), `${kind} link "${link.text}"`).to.not.contain('javascript:')
    expect(link.href, `${kind} link "${link.text}" is not undefined`).to.not.contain('undefined')
  })
}

describe('Links', () => {
  PAGES.forEach((page) => {
    describe(page, () => {
      beforeEach(() => {
        cy.useDesktop()
        cy.visitPage(page)
      })

      it('renders only well-formed links', () => {
        cy.collectLinks().then((links) => {
          const all = [...links.internal, ...links.external, ...links.anchors, ...links.mail]
          expect(all.length, 'the page has links').to.be.greaterThan(0)
          assertWellFormed(all, 'any')

          all.forEach((link) => {
            expect(
              link.text.length > 0 || link.href.startsWith('mailto:'),
              `link to ${link.href} has discernible text`
            ).to.be.true
          })
        })
      })

      it('resolves every internal link to a real page', () => {
        cy.collectLinks().then((links) => {
          assertWellFormed(links.internal, 'internal')

          links.internal.forEach((link) => {
            expect(link.href, `internal link "${link.text}" is root-relative`).to.match(/^\//)
            expect(link.href, 'internal links do not expose .html').to.not.contain('.html')

            if (!requestedInternal.has(link.url)) {
              requestedInternal.add(link.url)
              cy.assertReachable(link.url)
            }
          })
        })
      })

      it('points every in-page anchor at an element that exists', () => {
        cy.collectLinks().then((links) => {
          links.anchors.forEach((link) => {
            cy.get(link.href).should('exist')
          })
        })
      })

      it('opens external links safely', () => {
        cy.collectLinks().then((links) => {
          links.external.forEach((link) => {
            expect(() => new URL(link.url), `external link "${link.text}" parses`).to.not.throw()
            expect(link.url, `external link "${link.text}" uses http(s)`).to.match(/^https?:\/\//)

            // Any link that opens a new tab must not leak window.opener.
            if (link.target === '_blank') {
              expect(link.rel, `rel of external link "${link.text}"`).to.contain('noopener')
            }
          })
        })
      })

      it('reaches every external target', function () {
        if (!Cypress.env('checkExternalLinks')) this.skip()
        cy.collectLinks().then((links) => {
          links.external.forEach((link) => {
            cy.request({
              url: link.url,
              failOnStatusCode: false,
              followRedirect: true,
              timeout: 30000,
            }).then((response) => {
              expect(response.status, `GET ${link.url}`).to.be.lessThan(400)
            })
          })
        })
      })

      it('uses a valid mailto address where one is present', () => {
        cy.collectLinks().then((links) => {
          links.mail.forEach((link) => {
            expect(link.href, `mail link "${link.text}"`).to.match(
              /^(mailto:[^@\s]+@[^@\s]+\.[a-z]{2,}|tel:\+?[\d\s-]+)$/i
            )
          })
        })
      })
    })
  })
})
