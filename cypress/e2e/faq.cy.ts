import { sel } from '../support/selectors'
import { faqs, glossaryTerms, normalize, plainText, t } from '../support/site'

const OPEN = 'grid-rows-[1fr]'
const CLOSED = 'grid-rows-[0fr]'

const accordion = (index: 0 | 1) => cy.get(sel.accordion).eq(index)
const faqAccordion = () => accordion(0)
const glossaryAccordion = () => accordion(1)

/**
 * First words of an answer, used as a cheap "this is the right body" probe.
 * Limited to the first markdown line: react-markdown renders each line as its
 * own block, so text spanning a line break has no whitespace between the two
 * halves in the DOM.
 */
const probe = (markdown: string) => plainText(markdown.split('\n')[0]).slice(0, 40)

describe('FAQ and glossary page', () => {
  beforeEach(() => {
    cy.useDesktop()
    cy.visitPage('/faq')
  })

  it('renders two accordions: FAQ and glossary', () => {
    cy.get(sel.accordion).should('have.length', 2)
    faqAccordion().children('div').should('have.length', faqs.length)
    glossaryAccordion().children('div').should('have.length', glossaryTerms.length)
  })

  it('renders every FAQ question, numbered in order', () => {
    faqAccordion()
      .find('button')
      .should('have.length', faqs.length)
      .each(($button, index) => {
        expect(normalize($button.text())).to.eq(`${index + 1}. ${faqs[index].question}`)
      })
  })

  it('renders every glossary term, numbered in order', () => {
    glossaryAccordion()
      .find('button')
      .should('have.length', glossaryTerms.length)
      .each(($button, index) => {
        expect(normalize($button.text())).to.eq(`${index + 1}. ${glossaryTerms[index].term}`)
      })
  })

  it('starts with every panel collapsed', () => {
    cy.get(sel.accordionPanel).each(($panel) => {
      expect($panel.attr('class')).to.include(CLOSED)
    })
  })

  it('opens a FAQ answer when its question is clicked', () => {
    faqAccordion().find('button').first().click()
    faqAccordion()
      .find(sel.accordionPanel)
      .first()
      .should('have.class', OPEN)
      .and('contain.text', probe(faqs[0].answer))
  })

  it('closes the answer when the same question is clicked again', () => {
    faqAccordion().find('button').first().click()
    faqAccordion().find(sel.accordionPanel).first().should('have.class', OPEN)
    faqAccordion().find('button').first().click()
    faqAccordion().find(sel.accordionPanel).first().should('have.class', CLOSED)
  })

  it('keeps only one answer open at a time', () => {
    faqAccordion().find('button').eq(0).click()
    faqAccordion().find(sel.accordionPanel).eq(0).should('have.class', OPEN)

    faqAccordion().find('button').eq(1).click()
    faqAccordion().find(sel.accordionPanel).eq(0).should('have.class', CLOSED)
    faqAccordion().find(sel.accordionPanel).eq(1).should('have.class', OPEN)
  })

  it('renders the body of every FAQ answer', () => {
    faqs.forEach((faq, index) => {
      faqAccordion().find('button').eq(index).click()
      faqAccordion()
        .find(sel.accordionPanel)
        .eq(index)
        .should('have.class', OPEN)
        .and('contain.text', probe(faq.answer))
    })
  })

  it('renders the definition of every glossary term', () => {
    glossaryTerms.forEach((term, index) => {
      glossaryAccordion().find('button').eq(index).click()
      glossaryAccordion()
        .find(sel.accordionPanel)
        .eq(index)
        .should('have.class', OPEN)
        .and('contain.text', probe(term.definition))
    })
  })

  it('keeps the two accordions independent', () => {
    faqAccordion().find('button').first().click()
    glossaryAccordion().find('button').first().click()
    faqAccordion().find(sel.accordionPanel).first().should('have.class', OPEN)
    glossaryAccordion().find(sel.accordionPanel).first().should('have.class', OPEN)
  })

  it('renders links inside answers as real anchors', () => {
    const withLink = faqs.findIndex((faq) => /\]\(\//.test(faq.answer))
    if (withLink === -1) return
    faqAccordion().find('button').eq(withLink).click()
    faqAccordion().find(sel.accordionPanel).eq(withLink).find('a').should('exist')
  })

  describe('in-page anchors', () => {
    it('jumps to the FAQ section', () => {
      cy.get('a[href="#domande-frequenti"]').click()
      cy.hash().should('eq', '#domande-frequenti')
      cy.get('#domande-frequenti').should('be.visible').and('have.text', 'Domande Frequenti')
    })

    it('jumps to the glossary section', () => {
      cy.get('a[href="#glossario"]').click()
      cy.hash().should('eq', '#glossario')
      cy.get('#glossario').should('be.visible')
      cy.get('#glossario').find('h2').should('have.text', t.pages.glossario.title)
    })
  })

  it('publishes a FAQPage schema covering questions and glossary terms', () => {
    cy.jsonLd().then((blocks) => {
      const schema = blocks.find((block) => block['@type'] === 'FAQPage')
      expect(schema, 'FAQPage schema').to.exist
      expect(schema!.mainEntity).to.have.length(faqs.length + glossaryTerms.length)

      const names = schema!.mainEntity.map((entry: any) => entry.name)
      faqs.forEach((faq) => expect(names).to.include(faq.question))
      glossaryTerms.forEach((term) =>
        expect(names).to.include(`Cosa significa ${term.term}?`)
      )

      schema!.mainEntity.forEach((entry: any) => {
        expect(entry['@type']).to.eq('Question')
        expect(entry.acceptedAnswer['@type']).to.eq('Answer')
        expect(entry.acceptedAnswer.text, `answer for "${entry.name}"`).to.not.be.empty
        // The page strips markdown before embedding it in the schema.
        expect(entry.acceptedAnswer.text).to.not.include('**')
      })
    })
  })

  it('renders the author box', () => {
    cy.contains('Scritto da').should('be.visible')
  })
})
