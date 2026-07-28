import { sel } from '../support/selectors'
import { hrefSelector, normalize, t } from '../support/site'

type Section = { heading: string; content: string }

const expectSections = (sections: Section[]) => {
  cy.get(sel.contentArea)
    .find('h3')
    .should('have.length', sections.length)
    .each(($heading, index) => {
      expect(normalize($heading.text())).to.eq(sections[index].heading)
    })

  sections.forEach((section) => {
    cy.contains('h3', section.heading)
      .next('p')
      .should('have.text', section.content)
  })
}

describe('Chi Siamo', () => {
  beforeEach(() => {
    cy.useDesktop()
    cy.visitPage('/about-us')
  })

  it('renders the intro and the legal note', () => {
    cy.contains(t.pages.aboutUs.intro).should('be.visible')
    cy.contains(t.pages.aboutUs.legal).should('be.visible')
  })

  it('renders every section', () => {
    // The "Esplora il sito" box also uses an h3, so it is counted in.
    const sections = t.pages.aboutUs.sections as Section[]
    sections.forEach((section) => {
      cy.contains('h3', section.heading).next('p').should('have.text', section.content)
    })
  })

  it('links onwards to the main sections of the site', () => {
    ;['/', '/utilities', '/income-calculator'].forEach((href) => {
      cy.contains('h3', 'Esplora il sito').parent().find(hrefSelector(href)).should('be.visible')
    })
  })

  it('follows the utilities link', () => {
    cy.contains('h3', 'Esplora il sito').parent().find(hrefSelector('/utilities')).click()
    cy.assertPath('/utilities')
  })

  it('publishes an AboutPage schema with the contact email', () => {
    cy.jsonLd().then((blocks) => {
      const schema = blocks.find((block) => block['@type'] === 'AboutPage')
      expect(schema, 'AboutPage schema').to.exist
      expect(schema!.mainEntity.email).to.eq('info@bandincc.it')
      expect(schema!.mainEntity.areaServed.name).to.eq('Italia')
    })
  })
})

describe('Contatti', () => {
  beforeEach(() => {
    cy.useDesktop()
    cy.visitPage('/contact')
  })

  it('renders every description paragraph', () => {
    const description = t.pages.contact.description as string[] | string
    const paragraphs = Array.isArray(description) ? description : [description]
    paragraphs.forEach((paragraph) => {
      cy.contains('p', paragraph).should('be.visible')
    })
  })

  it('exposes a working mailto link', () => {
    cy.contains(t.pages.contact.emailLabel).should('be.visible')
    cy.get('a[href="mailto:info@bandincc.it"]')
      .should('be.visible')
      .and('have.text', 'info@bandincc.it')
  })

  it('publishes a ContactPage schema', () => {
    cy.jsonLd().then((blocks) => {
      const schema = blocks.find((block) => block['@type'] === 'ContactPage')
      expect(schema, 'ContactPage schema').to.exist
      expect(schema!.mainEntity.contactPoint.email).to.eq('info@bandincc.it')
      expect(schema!.mainEntity.contactPoint.availableLanguage).to.eq('Italian')
    })
  })
})

describe('Disclaimer', () => {
  beforeEach(() => {
    cy.useDesktop()
    cy.visitPage('/disclaimer')
  })

  it('renders every paragraph of the legal notice', () => {
    const description = t.pages.disclaimer.description as string[] | string
    const paragraphs = Array.isArray(description) ? description : [description]
    cy.get(sel.contentArea).find('div.space-y-4 > p').should('have.length', paragraphs.length)
    paragraphs.forEach((paragraph, index) => {
      cy.get(sel.contentArea)
        .find('div.space-y-4 > p')
        .eq(index)
        .should('have.text', paragraph)
    })
  })
})

describe('Privacy Policy', () => {
  beforeEach(() => {
    cy.useDesktop()
    cy.visitPage('/privacy-policy')
  })

  it('renders every section in order', () => {
    expectSections(t.pages.privacyPolicy.sections as Section[])
  })

  it('shows the last-updated date', () => {
    cy.contains(t.pages.privacyPolicy.lastUpdated).should('be.visible')
  })
})

describe('Cookie Policy', () => {
  beforeEach(() => {
    cy.useDesktop()
    cy.visitPage('/cookie-policy')
  })

  it('renders every section in order', () => {
    expectSections(t.pages.cookiePolicy.sections as Section[])
  })

  it('shows the last-updated date', () => {
    cy.contains(t.pages.cookiePolicy.lastUpdated).should('be.visible')
  })
})
