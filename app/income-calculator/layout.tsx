import { Metadata } from 'next'
import { jsonLd } from '@/lib/jsonLd'

export const metadata: Metadata = {
  title: 'Calcolatore Guadagni NCC',
  description: 'Calcola quanto puoi guadagnare come autista NCC: stima personalizzata in base a ore, città, tipo di servizio e costi di gestione del veicolo.',
}

const calculatorSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Calcolatore Guadagni NCC',
  description: 'Strumento gratuito per stimare i guadagni mensili come autista NCC in Italia.',
  url: 'https://bandincc.it/income-calculator',
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'All',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'EUR',
  },
  provider: {
    '@type': 'Organization',
    name: 'BandiNCC.it',
    url: 'https://bandincc.it',
  },
}

export default function IncomeCalculatorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(calculatorSchema) }}
      />
      {children}
    </>
  )
}
