// Reverse charge on B2B customers, set automatically.
//
// BandiNCC files its OSS VAT return by hand and keeps Stripe Tax off (see
// STATUS.md → "Current state"), so nothing in Stripe marks a business
// customer's invoices as reverse charge by itself. Two customer settings do it:
// `tax_exempt: 'reverse'`, which prints "Reverse charge" on invoice and receipt
// PDFs, and the invoice template whose footer carries the Italian legal wording.
// This sets both, the moment Stripe reports the customer's EU VAT number
// verified against VIES.
//
// Known gap, not fixable from here: VIES answers seconds after checkout, and by
// then the subscription's FIRST invoice is already finalized. A finalized
// invoice's footer and tax status cannot change. So this covers every renewal
// and never the first invoice; only Stripe Tax could mark that one.
//
// Never reverted: a number that later reads unverified is left alone and
// logged. Taking reverse charge off a paying business is a decision for a
// person, not for a VIES outage.
//
// Imports only types, so plain Node can load it for the website's
// `npm run test:unit` (test/reverse-charge.test.ts).

import type Stripe from 'stripe'

export type ReverseChargeDecision =
  | { action: 'skip'; reason: string }
  | { action: 'update'; customer: string; params: Stripe.CustomerUpdateParams }

/** The customer a tax ID belongs to, whichever field this API version fills. */
export const taxIdCustomer = (taxId: Stripe.TaxId): string | null => {
  const ref = taxId.customer ?? taxId.owner?.customer ?? null
  if (!ref) return null
  return typeof ref === 'string' ? ref : ref.id
}

/** Why this tax ID cannot make anyone reverse charge, or null if it can. */
export const taxIdSkipReason = (taxId: Stripe.TaxId): string | null => {
  if (taxId.type !== 'eu_vat') return `type ${taxId.type}, not eu_vat`
  const status = taxId.verification?.status ?? 'none'
  if (status !== 'verified') return `VIES status ${status}`
  if (!taxIdCustomer(taxId)) return 'no customer'
  return null
}

/**
 * What to change on `customer`, given one of its tax IDs and the template to
 * attach (undefined when none is configured for this Stripe mode). Pure.
 *
 * `rendering_options.amount_tax_display` is not carried over: nothing in this
 * account sets it, and every customer it would touch has it unset.
 */
export const reverseChargeDecision = (
  taxId: Stripe.TaxId,
  customer: Stripe.Customer | Stripe.DeletedCustomer,
  template: string | undefined,
): ReverseChargeDecision => {
  const reason = taxIdSkipReason(taxId)
  if (reason) return { action: 'skip', reason }
  if (customer.deleted) return { action: 'skip', reason: 'customer deleted' }

  const needsTemplate =
    Boolean(template) && customer.invoice_settings?.rendering_options?.template !== template
  if (customer.tax_exempt === 'reverse' && !needsTemplate) {
    return { action: 'skip', reason: 'already reverse charge' }
  }

  const params: Stripe.CustomerUpdateParams = { tax_exempt: 'reverse' }
  if (needsTemplate) params.invoice_settings = { rendering_options: { template } }
  return { action: 'update', customer: customer.id, params }
}

/**
 * Applies the decision for one tax ID and returns a line for the log. Throws on
 * a Stripe failure, so the webhook answers 500 and Stripe retries; the whole
 * thing is idempotent, so the retry is safe.
 */
export const applyReverseCharge = async (
  stripe: Stripe,
  taxId: Stripe.TaxId,
  template: string | undefined,
): Promise<string> => {
  const early = taxIdSkipReason(taxId)
  if (early) return `${taxId.id}: ${early}, nothing to do`

  const id = taxIdCustomer(taxId) as string
  const decision = reverseChargeDecision(taxId, await stripe.customers.retrieve(id), template)
  if (decision.action === 'skip') return `${id}: ${decision.reason}, nothing to do`

  await stripe.customers.update(decision.customer, decision.params)
  const templateNote = decision.params.invoice_settings
    ? ` and template ${template}`
    : template
      ? ''
      : ' (REVERSE_CHARGE_TEMPLATE is not set for this mode, so no footer template)'
  return `${id}: set to reverse charge${templateNote}`
}
