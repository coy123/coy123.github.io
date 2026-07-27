import { sel } from '../support/selectors'
import { laws, lawsSortedByLocation, normalize, t } from '../support/site'

const matching = (query: string) =>
  laws.filter((law) => law.location.toLowerCase().includes(query.trim().toLowerCase()))

describe('Regional laws page', () => {
  beforeEach(() => {
    cy.useDesktop()
    cy.visitPage('/regional-laws')
  })

  it('renders the page description', () => {
    cy.contains(t.pages.regionalLaws.description).should('be.visible')
  })

  it('renders one row per law in laws.json', () => {
    cy.get(sel.tableRow).should('have.length', laws.length)
  })

  it('sorts rows alphabetically by location', () => {
    const expected = lawsSortedByLocation().map((law) => law.location)
    cy.get(sel.tableRow).then(($rows) => {
      const rendered = $rows
        .toArray()
        .map((row) => normalize(row.children[1].textContent ?? ''))
      expect(rendered).to.deep.eq(expected)
    })
  })

  it('renders the crest, name and outbound link of every law', () => {
    cy.get(sel.tableRow).then(($rows) => {
      $rows.toArray().forEach((row) => {
        const location = normalize(row.children[1].textContent ?? '')
        const law = laws.find((candidate) => candidate.location === location)
        expect(law, `law for "${location}"`).to.exist

        const crest = row.children[0].querySelector('img') as HTMLImageElement
        expect(crest.getAttribute('src'), `${location} crest`).to.eq(law!.image)
        expect(crest.getAttribute('alt')).to.eq(`${t.table.headers.crest} ${location}`)

        const link = row.children[2].querySelector('a') as HTMLAnchorElement
        expect(link.getAttribute('href'), `${location} regulation link`).to.eq(law!.url)
        expect(link.getAttribute('target'), `${location} opens in a new tab`).to.eq('_blank')
        expect(link.getAttribute('rel'), `${location} rel`).to.include('noopener')
        expect(link.getAttribute('aria-label')).to.eq(t.table.headers.view)
      })
    })
  })

  it('renders the column headers', () => {
    ;[t.table.headers.crest, t.table.headers.location, t.table.headers.view].forEach(
      (header) => {
        cy.contains('span', header).should('be.visible')
      }
    )
  })

  describe('search', () => {
    const sample = laws[0].location

    it('filters by location, case-insensitively', () => {
      cy.get(sel.searchInput).type(sample.toUpperCase())
      cy.get(sel.tableRow).should('have.length', matching(sample).length)
      cy.get(sel.tableRow).first().should('contain.text', sample)
    })

    it('matches partial names', () => {
      const partial = sample.slice(0, 3)
      cy.get(sel.searchInput).type(partial)
      cy.get(sel.tableRow).should('have.length', matching(partial).length)
    })

    it('restores every row when cleared', () => {
      cy.get(sel.searchInput).type(sample)
      cy.get(sel.searchInput).clear()
      cy.get(sel.tableRow).should('have.length', laws.length)
    })

    it('shows the empty state when nothing matches', () => {
      cy.get(sel.searchInput).type('zzz-nessuna-regione-zzz')
      cy.get(sel.tableRow).should('not.exist')
      cy.contains(t.dashboard.search.noResults).should('be.visible')
    })
  })

  it('publishes a WebPage schema', () => {
    cy.jsonLd().then((blocks) => {
      const schema = blocks.find((block) => block['@type'] === 'WebPage')
      expect(schema, 'WebPage schema').to.exist
      expect(schema!.name).to.eq('Normative Regionali NCC')
      expect(schema!.publisher.name).to.eq('BandiNCC.it')
    })
  })
})
