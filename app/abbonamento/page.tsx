import { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations } from '@/lib/translations'
import { currentStripeMode, isPlaceholderLink, stripeHref } from '@/lib/subscription'
import HeroCrest from '@/components/HeroCrest'

const t = getTranslations()

export const metadata: Metadata = {
  title: t.pages.abbonamento.metaTitle,
  description: t.pages.abbonamento.metaDescription,
}

interface Plan {
  id: string
  name: string
  price: string
  period: string
  note: string
  cta: string
  href: string
  hrefTest?: string
  badge?: string
  highlight?: boolean
}

export default function AbbonamentoPage() {
  const t = getTranslations()
  const page = t.pages.abbonamento
  const plans = page.plans as Plan[]

  // Which Stripe account this build talks to. Fixed at build time — a static
  // export has no request to branch on. See lib/subscription.ts.
  const mode = currentStripeMode()
  const portalHref = stripeHref(page.manage, mode)

  // Prices are stated in the copy rather than derived: they are commercial
  // strings ("5,90 €", "Due mesi in omaggio"), not values anything computes on,
  // and the authoritative numbers live in Stripe either way.
  const offerSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'Abbonamento BandiNCC',
    description: page.metaDescription,
    brand: { '@type': 'Brand', name: 'BandiNCC.it' },
    offers: [
      {
        '@type': 'Offer',
        name: 'Mensile',
        price: '5.90',
        priceCurrency: 'EUR',
        url: 'https://bandincc.it/abbonamento/',
        availability: 'https://schema.org/InStock',
      },
      {
        '@type': 'Offer',
        name: 'Annuale',
        price: '59.00',
        priceCurrency: 'EUR',
        url: 'https://bandincc.it/abbonamento/',
        availability: 'https://schema.org/InStock',
      },
    ],
  }

  return (
    <div className="w-full mx-auto">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(offerSchema) }}
      />
      <div
        className="mb-3 relative rounded-lg overflow-hidden p-4 sm:p-6"
        style={{
          backgroundImage: 'url(/images/driver.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <HeroCrest />
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 inline-block px-2 py-1 rounded"
          style={{backgroundColor: 'rgba(0, 0, 0, 0.7)'}}>
          {page.title}
        </h1>
        <br/>
        <h2 className="text-sm sm:text-base text-gray-300 mb-3 inline-block px-2 py-1 rounded"
          style={{backgroundColor: 'rgba(0, 0, 0, 0.7)'}}>
          {page.subtitle}
        </h2>
      </div>

      <div className="mb-6 sm:mb-8 space-y-6">
        {/* Staging only. Without it a tester who lands here from a shared link
            has no way to tell a test checkout from a real one — and the two
            look identical, right down to the redirect to /grazie/. */}
        {mode === 'test' && (
          <p
            className="rounded-lg border border-amber-500 bg-amber-500/10 px-4 py-3 text-sm text-amber-200"
            role="status"
          >
            {page.testModeNotice}
          </p>
        )}

        <p className="text-sm sm:text-base text-white">{page.intro}</p>

        <div>
          <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">
            {page.benefitsHeading}
          </h3>
          <ul className="space-y-2">
            {page.benefits.map((benefit: string, index: number) => (
              <li key={index} className="flex gap-2 text-sm sm:text-base text-white">
                <span className="text-green-400 shrink-0" aria-hidden="true">✓</span>
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-lg sm:text-xl font-semibold text-white mb-3">
            {page.plansHeading}
          </h3>
          {/* Annual first on mobile would bury the cheaper entry price; source
              order keeps monthly first and the highlight does the selling. */}
          <div className="grid gap-4 sm:grid-cols-2">
            {plans.map((plan) => {
              const href = stripeHref(plan, mode)
              return (
                <div
                  key={plan.id}
                  className={`relative rounded-lg p-4 sm:p-6 flex flex-col border ${
                    plan.highlight
                      ? 'bg-gray-900 border-blue-500'
                      : 'bg-gray-900 border-gray-700'
                  }`}
                >
                  {plan.badge && (
                    <span className="absolute -top-3 left-4 bg-blue-600 text-white text-xs font-semibold px-2 py-1 rounded">
                      {plan.badge}
                    </span>
                  )}
                  <p className="text-lg font-semibold text-white">{plan.name}</p>
                  <p className="mt-2 mb-1">
                    <span className="text-3xl font-bold text-white">{plan.price}</span>
                    <span className="text-sm text-gray-400"> {plan.period}</span>
                  </p>
                  <p className="text-xs text-gray-400 mb-4 grow">{plan.note}</p>
                  {isPlaceholderLink(href) ? (
                    // The Payment Link for this mode is not in yet. Render the
                    // price, never a button that would 404. See lib/subscription.ts.
                    <span className="block text-center px-4 py-3 rounded-md font-medium bg-gray-700 text-gray-400 cursor-not-allowed">
                      {page.comingSoon}
                    </span>
                  ) : (
                    // An external Stripe-hosted page, so a plain anchor rather
                    // than next/link. No `noreferrer`: Stripe reads the referrer
                    // to attribute the checkout to this page.
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener"
                      className={`block text-center px-4 py-3 rounded-md font-medium transition-colors ${
                        plan.highlight
                          ? 'bg-blue-600 hover:bg-blue-500 text-white'
                          : 'bg-gray-700 hover:bg-gray-600 text-white'
                      }`}
                    >
                      {plan.cta}
                    </a>
                  )}
                </div>
              )
            })}
          </div>
          <p className="mt-3 text-xs text-gray-400">
            {plans.some((plan) => isPlaceholderLink(stripeHref(plan, mode)))
              ? page.comingSoonNote
              : page.paymentNote}
          </p>
        </div>

        <div className="bg-gray-700 rounded-lg p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-white mb-2">
            {page.manage.heading}
          </h3>
          <p className="text-sm text-white mb-3">{page.manage.description}</p>
          {isPlaceholderLink(portalHref) ? (
            <span className="text-sm text-gray-400">{page.comingSoon}</span>
          ) : (
            <a
              href={portalHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 transition-colors text-sm"
            >
              {page.manage.cta}
            </a>
          )}
        </div>

        <p className="text-xs text-gray-500">{page.legal}</p>

        <div className="mt-6 bg-gray-700 rounded-lg p-4 sm:p-6 space-y-2">
          <h3 className="text-lg font-semibold text-white mb-3">Esplora il sito</h3>
          <p className="text-sm">
            <Link href="/" className="text-blue-400 hover:text-blue-300 transition-colors">
              Trova i bandi NCC disponibili →
            </Link>
          </p>
          <p className="text-sm">
            <Link href="/faq" className="text-blue-400 hover:text-blue-300 transition-colors">
              FAQ e Glossario NCC →
            </Link>
          </p>
          <p className="text-sm">
            <Link href="/privacy-policy" className="text-blue-400 hover:text-blue-300 transition-colors">
              Come trattiamo i tuoi dati →
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
