import { sel } from '../support/selectors'
import { hrefSelector, samePath, t } from '../support/site'

/**
 * The two long-form pages read a .md file at build time and render it with
 * react-markdown + remark-gfm. These tests guard the rendering pipeline: raw
 * markdown must not leak, GFM tables must become real tables, and the
 * `&nbsp;`-based blank-line preservation must not show up as literal text.
 */
interface ArticleSpec {
  path: string
  title: string
  /** Headings that must survive the mid-article split in page.tsx. */
  headings: string[]
  /** Links rendered by the "Risorse utili" box below the article. */
  internalLinks: string[]
  schema: string
}

const ARTICLES: ArticleSpec[] = [
  {
    path: '/how-to-become-driver',
    title: t.pages.howToBecomeDriver.title,
    headings: [
      'Come diventare un autista NCC – Guida completa',
      'Requisiti fondamentali per diventare NCC',
      'Certificato di Abilitazione Professionale (CAP/KB)',
      'Iscrizione al Ruolo dei Conducenti',
      'NCC vs Taxi: principali differenze',
    ],
    internalLinks: ['/', '/regional-laws', '/income-calculator', '/faq'],
    schema: 'Article',
  },
  {
    path: '/utilities',
    title: t.pages.utilities.title,
    headings: [
      'NCC Utilities – Numeri, strumenti e link utili',
      'Costi tipici per avviare un',
      'Business plan NCC – schema semplice',
      'Iscrizione alle principali piattaforme NCC',
      'Errori comuni da evitare',
    ],
    internalLinks: [],
    schema: 'Article',
  },
]

describe('Markdown article pages', () => {
  ARTICLES.forEach((article) => {
    describe(article.path, () => {
      beforeEach(() => {
        cy.useDesktop()
        cy.visitPage(article.path)
      })

      it('renders the hero title', () => {
        cy.get(sel.hero).first().find('h1').should('have.text', article.title)
      })

      it('does not introduce a second h1 from the markdown', () => {
        // The hero already owns the page's h1; article content starts at h2.
        cy.get('h1').should('have.length', 1).and('have.text', article.title)
      })

      it('renders every expected heading from the markdown source', () => {
        article.headings.forEach((heading) => {
          cy.get(sel.contentArea).contains(':header', heading).should('exist')
        })
      })

      it('does not leak raw markdown syntax into the page text', () => {
        cy.get(sel.contentArea)
          .invoke('text')
          .then((text) => {
            expect(text, 'bold markers').to.not.include('**')
            expect(text, 'heading markers').to.not.include('####')
            expect(text, 'escaped &nbsp; entity').to.not.include('&nbsp;')
            expect(text, 'unrendered link syntax').to.not.match(/\]\(https?:/)
          })
      })

      it('renders GFM tables as real tables', () => {
        cy.get(sel.contentArea).find('table').should('have.length.greaterThan', 0)
        cy.get(sel.contentArea)
          .find('table')
          .first()
          .within(() => {
            cy.get('th').should('have.length.greaterThan', 0)
            cy.get('tbody tr').should('have.length.greaterThan', 0)
          })
      })

      it('renders markdown links as anchors with resolvable hrefs', () => {
        cy.get(sel.contentArea)
          .find('.prose a')
          .should('have.length.greaterThan', 0)
          .each(($link) => {
            const href = $link.attr('href') ?? ''
            expect(href, `href of "${$link.text().trim()}"`).to.not.be.empty
            expect(href).to.match(/^(https?:\/\/|\/|#|mailto:)/)
          })
      })

      it('renders lists as real list elements', () => {
        cy.get(sel.contentArea).find('ul li, ol li').should('have.length.greaterThan', 0)
      })

      it('renders the author box', () => {
        cy.contains('Scritto da').should('be.visible')
        cy.contains('a', 'Scopri di più').should(($link) => {
          expect(samePath($link.attr('href') ?? '', '/about-us')).to.be.true
        })
      })

      it(`publishes an ${article.schema} schema`, () => {
        cy.jsonLd().then((blocks) => {
          const schema = blocks.find((block) => block['@type'] === article.schema)
          expect(schema, `${article.schema} schema`).to.exist
          expect(schema!.author.name).to.eq('BandiNCC.it')
          expect(schema!.publisher.name).to.eq('BandiNCC.it')
          expect(schema!.mainEntityOfPage).to.eq(`https://bandincc.it${article.path}`)
        })
      })

      article.internalLinks.forEach((href) => {
        it(`links to ${href} from the resources box`, () => {
          cy.contains('h3', 'Risorse utili').parent().find(hrefSelector(href)).should('be.visible')
        })
      })
    })
  })

  it('reaches the regional laws page from the driver guide', () => {
    cy.visitPage('/how-to-become-driver')
    cy.contains('h3', 'Risorse utili').parent().find(hrefSelector('/regional-laws')).click()
    cy.assertPath('/regional-laws')
  })
})
