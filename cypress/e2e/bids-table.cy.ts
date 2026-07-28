import { sel } from '../support/selectors'
import {
  bids,
  bidPath,
  bidsSortedByDeadlineDesc,
  formatAmount,
  formatShortDate,
  isActive,
  normalize,
  t,
  toSlug,
} from '../support/site'

const matching = (query: string) =>
  bids.filter((bid) => bid.location.toLowerCase().includes(query.trim().toLowerCase()))

describe('Bids table', () => {
  beforeEach(() => {
    cy.useDesktop()
    cy.visitPage('/')
  })

  it('renders one row per bid in data.json', () => {
    cy.get(sel.tableRow).should('have.length', bids.length)
  })

  it('renders the column headers', () => {
    Object.values(t.table.headers).forEach((header) => {
      cy.contains('span', header).should('be.visible')
    })
  })

  it('sorts rows by deadline, newest first', () => {
    const expected = bidsSortedByDeadlineDesc().map((bid) => bid.location)

    cy.get(sel.tableRow).then(($rows) => {
      const rendered = $rows
        .toArray()
        .map((row) => normalize(row.children[1].textContent ?? ''))

      // Bids sharing a deadline may appear in either order, so compare the
      // deadline sequence strictly and the membership of each position loosely.
      const renderedDeadlines = rendered.map(
        (location) => bids.find((bid) => bid.location === location)!.deadline
      )
      const sortedDeadlines = [...renderedDeadlines].sort().reverse()
      expect(renderedDeadlines, 'deadlines descending').to.deep.eq(sortedDeadlines)
      expect(rendered.slice().sort(), 'every bid rendered').to.deep.eq(expected.slice().sort())
    })
  })

  it('renders every cell of every row from the source data', () => {
    cy.get(sel.tableRow).then(($rows) => {
      $rows.toArray().forEach((row) => {
        const cells = row.children
        const location = normalize(cells[1].textContent ?? '')
        const bid = bids.find((candidate) => candidate.location === location)
        expect(bid, `bid for "${location}"`).to.exist

        const crest = cells[0].querySelector('img') as HTMLImageElement
        expect(crest.getAttribute('src'), `${location} crest src`).to.eq(bid!.image)
        expect(crest.getAttribute('alt')).to.eq(`${t.table.headers.crest} ${location}`)
        expect(crest.getAttribute('loading')).to.eq('lazy')

        const link = cells[1].querySelector('a') as HTMLAnchorElement
        expect(link.getAttribute('href'), `${location} detail link`).to.eq(bidPath(bid!))

        expect(normalize(cells[2].textContent ?? ''), `${location} amount`).to.eq(
          formatAmount(bid!.amount)
        )
        expect(normalize(cells[3].textContent ?? ''), `${location} deadline`).to.eq(
          formatShortDate(bid!.deadline)
        )

        const view = cells[4].querySelector('a') as HTMLAnchorElement
        expect(view.getAttribute('href'), `${location} view button`).to.eq(bidPath(bid!))
        expect(view.getAttribute('aria-label')).to.eq(t.table.headers.view)
      })
    })
  })

  it('paints rows with a future deadline green and expired ones grey', () => {
    // Table.tsx keeps `now` null until its useEffect runs, so every row starts
    // grey. `should` retries the whole callback until hydration has happened;
    // `then` would sample the pre-hydration DOM once and flake.
    cy.get(sel.tableRow).should(($rows) => {
      $rows.toArray().forEach((row) => {
        const location = normalize(row.children[1].textContent ?? '')
        const bid = bids.find((candidate) => candidate.location === location)!
        const className = row.getAttribute('class') ?? ''
        if (isActive(bid)) {
          expect(className, `${location} (deadline ${bid.deadline}) is active`).to.include(
            'bg-green-900/40'
          )
        } else {
          expect(className, `${location} (deadline ${bid.deadline}) is expired`).to.include(
            'bg-gray-900/20'
          )
        }
      })
    })
  })

  describe('row links', () => {
    it('opens the detail page from the location link', () => {
      const bid = bids[0]
      cy.get(`a[href="${bidPath(bid)}"]`).first().click()
      cy.location('pathname').should('include', encodeURI(toSlug(bid.location)))
      cy.get(sel.contentArea).find('h1').should('contain.text', bid.location)
    })

    it('opens the detail page from the view button', () => {
      const bid = bids[0]
      cy.get(`a[href="${bidPath(bid)}"]`).last().click()
      cy.get(sel.contentArea).find('h1').should('contain.text', bid.location)
    })

    it('points every row at a page that exists', () => {
      // Cheap guard against a slug regression: the first and last rows plus a
      // location that needs diacritic stripping. The exhaustive sweep over all
      // slugs lives in bid-detail.cy.ts.
      cy.get(sel.bidLink).then(($links) => {
        const hrefs = Array.from(new Set($links.toArray().map((a) => (a as HTMLAnchorElement).href)))
        expect(hrefs).to.have.length(bids.length)
      })
    })
  })

  describe('search', () => {
    const sample = bids[0].location.replace(/^Comune di\s+/, '').replace(/\s*\(.*\)$/, '')

    it('filters rows by location, case-insensitively', () => {
      cy.get(sel.searchInput).type(sample.toLowerCase())
      cy.get(sel.tableRow).should('have.length', matching(sample).length)
      cy.get(sel.tableRow).first().should('contain.text', sample)
    })

    it('ignores surrounding whitespace', () => {
      cy.get(sel.searchInput).type(`   ${sample}   `)
      cy.get(sel.tableRow).should('have.length', matching(sample).length)
    })

    it('restores every row when the query is cleared', () => {
      cy.get(sel.searchInput).type(sample)
      cy.get(sel.tableRow).should('have.length.lessThan', bids.length)
      cy.get(sel.searchInput).clear()
      cy.get(sel.tableRow).should('have.length', bids.length)
    })

    it('shows the empty-state message when nothing matches', () => {
      cy.get(sel.searchInput).type('zzz-nessuna-localita-zzz')
      cy.get(sel.tableRow).should('not.exist')
      cy.contains(t.dashboard.search.noResults).should('be.visible')
    })

    it('treats a whitespace-only query as empty', () => {
      cy.get(sel.searchInput).type('    ')
      cy.get(sel.tableRow).should('have.length', bids.length)
    })
  })
})
