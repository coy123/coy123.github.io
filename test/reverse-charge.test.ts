import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  applyReverseCharge,
  reverseChargeDecision,
  taxIdCustomer,
} from '../stripe-worker/src/reverseCharge.ts'

/**
 * `stripe-worker/src/reverseCharge.ts`: when the Worker switches a customer to
 * reverse charge. Lives here rather than in the Worker because this is the
 * suite that gates deploys, and the module imports only Stripe *types*, so
 * plain Node loads it with no Stripe SDK installed.
 *
 * The rule is narrow on purpose: a verified EU VAT number sets it, nothing ever
 * unsets it, and a customer already in the right state is not written to again.
 */

const TEMPLATE = 'inrtem_live'

// Fixtures are plain objects shaped like the API's, not typed Stripe objects:
// Node strips types and checks none, so a cast would only be decoration.
const taxId = (overrides: Record<string, unknown> = {}) =>
  ({
    id: 'txi_1',
    type: 'eu_vat',
    value: 'IT01234567890',
    customer: 'cus_1',
    owner: { type: 'customer', customer: 'cus_1' },
    verification: { status: 'verified' },
    ...overrides,
  }) as never

const customer = (overrides: Record<string, unknown> = {}) =>
  ({
    id: 'cus_1',
    tax_exempt: 'none',
    invoice_settings: { rendering_options: null },
    ...overrides,
  }) as never

describe('which customer a tax ID belongs to', () => {
  it('reads `customer`, an expanded customer, or `owner.customer`', () => {
    assert.equal(taxIdCustomer(taxId()), 'cus_1')
    assert.equal(taxIdCustomer(taxId({ customer: { id: 'cus_2' } })), 'cus_2')
    assert.equal(taxIdCustomer(taxId({ customer: null, owner: { customer: 'cus_3' } })), 'cus_3')
    assert.equal(taxIdCustomer(taxId({ customer: null, owner: null })), null)
  })
})

describe('the decision', () => {
  it('sets reverse charge and the template on a verified EU VAT number', () => {
    assert.deepEqual(reverseChargeDecision(taxId(), customer(), TEMPLATE), {
      action: 'update',
      customer: 'cus_1',
      params: { tax_exempt: 'reverse', invoice_settings: { rendering_options: { template: TEMPLATE } } },
    })
  })

  it('waits for VIES: pending, unverified and unavailable do nothing', () => {
    for (const status of ['pending', 'unverified', 'unavailable']) {
      const decision = reverseChargeDecision(taxId({ verification: { status } }), customer(), TEMPLATE)
      assert.deepEqual(decision, { action: 'skip', reason: `VIES status ${status}` })
    }
  })

  it('ignores any tax ID that is not an EU VAT number', () => {
    const decision = reverseChargeDecision(taxId({ type: 'it_cf' }), customer(), TEMPLATE)
    assert.equal(decision.action, 'skip')
  })

  it('does not write to a customer that is already set', () => {
    const done = customer({
      tax_exempt: 'reverse',
      invoice_settings: { rendering_options: { template: TEMPLATE } },
    })
    assert.deepEqual(reverseChargeDecision(taxId(), done, TEMPLATE), {
      action: 'skip',
      reason: 'already reverse charge',
    })
  })

  it('adds the template to a customer that only has the tax status', () => {
    const half = customer({ tax_exempt: 'reverse' })
    const decision = reverseChargeDecision(taxId(), half, TEMPLATE)
    assert.equal(decision.action, 'update')
  })

  it('sets the tax status alone when no template is configured for the mode', () => {
    assert.deepEqual(reverseChargeDecision(taxId(), customer(), undefined), {
      action: 'update',
      customer: 'cus_1',
      params: { tax_exempt: 'reverse' },
    })
  })

  it('leaves a deleted customer alone', () => {
    const decision = reverseChargeDecision(taxId(), customer({ deleted: true }), TEMPLATE)
    assert.deepEqual(decision, { action: 'skip', reason: 'customer deleted' })
  })
})

describe('applying it', () => {
  const fakeStripe = (record: unknown) => {
    const calls = { retrieve: [] as string[], update: [] as unknown[] }
    const stripe = {
      customers: {
        retrieve: async (id: string) => {
          calls.retrieve.push(id)
          return record
        },
        update: async (id: string, params: unknown) => {
          calls.update.push([id, params])
          return record
        },
      },
    }
    return { stripe: stripe as never, calls }
  }

  it('updates a verified customer once', async () => {
    const { stripe, calls } = fakeStripe(customer())
    const line = await applyReverseCharge(stripe, taxId(), TEMPLATE)
    assert.deepEqual(calls.update, [
      ['cus_1', { tax_exempt: 'reverse', invoice_settings: { rendering_options: { template: TEMPLATE } } }],
    ])
    assert.match(line, /cus_1: set to reverse charge and template inrtem_live/)
  })

  it('does not even look up the customer while VIES is pending', async () => {
    const { stripe, calls } = fakeStripe(customer())
    await applyReverseCharge(stripe, taxId({ verification: { status: 'pending' } }), TEMPLATE)
    assert.deepEqual(calls, { retrieve: [], update: [] })
  })

  it('makes a redelivered event a no-op', async () => {
    const done = customer({
      tax_exempt: 'reverse',
      invoice_settings: { rendering_options: { template: TEMPLATE } },
    })
    const { stripe, calls } = fakeStripe(done)
    await applyReverseCharge(stripe, taxId(), TEMPLATE)
    assert.deepEqual(calls.update, [])
  })

  it('says in the log when the mode has no template', async () => {
    const { stripe } = fakeStripe(customer())
    const line = await applyReverseCharge(stripe, taxId(), undefined)
    assert.match(line, /REVERSE_CHARGE_TEMPLATE is not set/)
  })
})
