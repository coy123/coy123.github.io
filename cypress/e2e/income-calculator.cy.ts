import { sel } from '../support/selectors'
import { normalize, t } from '../support/site'
import {
  CalculatorInputs,
  CityType,
  Fuel,
  TimeOfDay,
  calculateIncome,
} from '../../lib/calculator'

const TIME_LABELS: Record<TimeOfDay, string> = {
  [TimeOfDay.DAY]: 'Giorno',
  [TimeOfDay.NIGHT]: 'Notte',
  [TimeOfDay.DAY_AND_NIGHT]: 'Giorno e Notte',
}

const CITY_LABELS: Record<CityType, string> = {
  [CityType.BUSINESS]: 'Business',
  [CityType.TOURIST]: 'Turistica',
  [CityType.SMALL]: 'Piccola',
}

const FUEL_LABELS: Record<Fuel, string> = {
  [Fuel.PETROL]: 'Benzina',
  [Fuel.ELECTRIC]: 'Elettrico',
}

const DEFAULTS: CalculatorInputs = {
  hoursPerDay: 8,
  daysPerMonth: 20,
  timeOfDay: TimeOfDay.DAY,
  cityType: CityType.BUSINESS,
  fuel: Fuel.PETROL,
}

const expectedResult = (inputs: CalculatorInputs) =>
  `${calculateIncome(inputs).toFixed(2)} € al mese`

const fillAndSubmit = (inputs: CalculatorInputs) => {
  cy.get('#hoursPerDay').clear().type(String(inputs.hoursPerDay))
  cy.get('#daysPerMonth').clear().type(String(inputs.daysPerMonth))
  cy.get('#timeOfDay').select(TIME_LABELS[inputs.timeOfDay])
  cy.get('#cityType').select(CITY_LABELS[inputs.cityType])
  cy.get('#fuel').select(FUEL_LABELS[inputs.fuel])
  cy.contains('button', 'Calcola Guadagno').click()
}

const readResult = () =>
  cy.get(sel.calculatorModal).find('p.text-4xl').invoke('text').then(normalize)

describe('Income calculator', () => {
  beforeEach(() => {
    cy.useDesktop()
    cy.visitPage('/income-calculator')
  })

  describe('form', () => {
    it('renders every field with its default value', () => {
      cy.get('#hoursPerDay').should('have.value', String(DEFAULTS.hoursPerDay))
      cy.get('#daysPerMonth').should('have.value', String(DEFAULTS.daysPerMonth))
      cy.get('#timeOfDay').should('have.value', String(DEFAULTS.timeOfDay))
      cy.get('#cityType').should('have.value', String(DEFAULTS.cityType))
      cy.get('#fuel').should('have.value', String(DEFAULTS.fuel))
    })

    it('labels every field', () => {
      const labels: Record<string, string> = {
        hoursPerDay: 'Ore al giorno',
        daysPerMonth: 'Giorni al mese',
        timeOfDay: 'Orario di lavoro',
        cityType: 'Tipo di città',
        fuel: 'Tipo di carburante',
      }
      Object.entries(labels).forEach(([id, label]) => {
        cy.get(`label[for="${id}"]`).should('have.text', label)
        cy.get(`#${id}`).should('exist')
      })
    })

    it('constrains the numeric inputs', () => {
      cy.get('#hoursPerDay')
        .should('have.attr', 'type', 'number')
        .and('have.attr', 'min', '1')
        .and('have.attr', 'max', '24')
        .and('have.attr', 'required')
      cy.get('#daysPerMonth')
        .should('have.attr', 'type', 'number')
        .and('have.attr', 'min', '1')
        .and('have.attr', 'max', '31')
        .and('have.attr', 'required')
    })

    it('offers every option of every select', () => {
      cy.get('#timeOfDay option').should('have.length', 3)
      Object.values(TIME_LABELS).forEach((label) =>
        cy.get('#timeOfDay').contains('option', label).should('exist')
      )
      cy.get('#cityType option').should('have.length', 3)
      Object.values(CITY_LABELS).forEach((label) =>
        cy.get('#cityType').contains('option', label).should('exist')
      )
      cy.get('#fuel option').should('have.length', 2)
      Object.values(FUEL_LABELS).forEach((label) =>
        cy.get('#fuel').contains('option', label).should('exist')
      )
    })

    it('shows the estimate disclaimer', () => {
      cy.contains(t.pages.incomeCalculator.disclaimer).should('be.visible')
    })
  })

  describe('result modal', () => {
    it('stays hidden until the form is submitted', () => {
      cy.get(sel.calculatorModal).should('not.exist')
    })

    it('shows the result for the default inputs', () => {
      cy.contains('button', 'Calcola Guadagno').click()
      cy.get(sel.calculatorModal).should('be.visible')
      cy.get(sel.calculatorModal).contains('h3', 'Risultato').should('be.visible')
      readResult().should('eq', expectedResult(DEFAULTS))
    })

    it('closes via the bottom button', () => {
      cy.contains('button', 'Calcola Guadagno').click()
      cy.get(sel.calculatorModal).should('be.visible')
      cy.get(sel.calculatorModal).contains('button', 'Chiudi').click()
      cy.get(sel.calculatorModal).should('not.exist')
    })

    it('closes via the X in the corner', () => {
      cy.contains('button', 'Calcola Guadagno').click()
      cy.get(sel.calculatorModal)
        .find('button[aria-label="Chiudi"]')
        .should('exist')
        .click()
      cy.get(sel.calculatorModal).should('not.exist')
    })

    it('closes when the backdrop is clicked', () => {
      cy.contains('button', 'Calcola Guadagno').click()
      cy.get(sel.calculatorModal).should('be.visible')
      cy.get(sel.calculatorBackdrop).click('topLeft')
      cy.get(sel.calculatorModal).should('not.exist')
    })

    it('stays open when the panel itself is clicked', () => {
      cy.contains('button', 'Calcola Guadagno').click()
      cy.get(sel.calculatorModal).contains('h3', 'Risultato').click()
      cy.get(sel.calculatorModal).should('be.visible')
    })

    it('recalculates when reopened with new inputs', () => {
      cy.contains('button', 'Calcola Guadagno').click()
      readResult().should('eq', expectedResult(DEFAULTS))
      cy.get(sel.calculatorModal).contains('button', 'Chiudi').click()

      const changed: CalculatorInputs = { ...DEFAULTS, hoursPerDay: 12 }
      fillAndSubmit(changed)
      readResult().should('eq', expectedResult(changed))
    })
  })

  describe('calculation', () => {
    // Every combination of the three enums, checked against lib/calculator.ts
    // so a change to the model has to be a deliberate one.
    const combinations: CalculatorInputs[] = []
    ;[TimeOfDay.DAY, TimeOfDay.NIGHT, TimeOfDay.DAY_AND_NIGHT].forEach((timeOfDay) => {
      ;[CityType.BUSINESS, CityType.TOURIST, CityType.SMALL].forEach((cityType) => {
        ;[Fuel.PETROL, Fuel.ELECTRIC].forEach((fuel) => {
          combinations.push({ ...DEFAULTS, timeOfDay, cityType, fuel })
        })
      })
    })

    combinations.forEach((inputs) => {
      const name = `${TIME_LABELS[inputs.timeOfDay]} / ${CITY_LABELS[inputs.cityType]} / ${FUEL_LABELS[inputs.fuel]}`
      it(`matches the model for ${name}`, () => {
        fillAndSubmit(inputs)
        readResult().should('eq', expectedResult(inputs))
      })
    })

    it('handles the minimum workload', () => {
      const minimal: CalculatorInputs = {
        ...DEFAULTS,
        hoursPerDay: 1,
        daysPerMonth: 1,
        cityType: CityType.SMALL,
      }
      fillAndSubmit(minimal)
      // Fixed costs dominate, so the estimate is negative — and should be shown.
      expect(calculateIncome(minimal)).to.be.lessThan(0)
      readResult().should('eq', expectedResult(minimal))
    })

    it('handles the maximum workload', () => {
      const maximal: CalculatorInputs = {
        ...DEFAULTS,
        hoursPerDay: 24,
        daysPerMonth: 31,
        timeOfDay: TimeOfDay.NIGHT,
        cityType: CityType.TOURIST,
      }
      fillAndSubmit(maximal)
      readResult().should('eq', expectedResult(maximal))
    })
  })

  describe('resource links', () => {
    const links = ['/', '/how-to-become-driver', '/faq']

    links.forEach((href) => {
      it(`links to ${href}`, () => {
        cy.contains('h3', 'Risorse utili').parent().find(`a[href="${href}"]`).should('be.visible')
      })
    })

    it('follows the FAQ link', () => {
      cy.contains('h3', 'Risorse utili').parent().find('a[href="/faq"]').click()
      cy.assertPath('/faq')
    })
  })

  it('publishes a WebApplication schema', () => {
    cy.jsonLd().then((blocks) => {
      const schema = blocks.find((block) => block['@type'] === 'WebApplication')
      expect(schema, 'WebApplication schema').to.exist
      expect(schema!.name).to.eq('Calcolatore Guadagni NCC')
      expect(schema!.applicationCategory).to.eq('FinanceApplication')
      expect(schema!.offers.price).to.eq('0')
      expect(schema!.offers.priceCurrency).to.eq('EUR')
    })
  })
})
