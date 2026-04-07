import { Metadata } from 'next'
import { getTranslations } from '@/lib/translations'
import LawsContent from '@/components/LawsContent'
import lawsData from '@/data/laws.json'
import { LawData } from '@/types'

export const metadata: Metadata = {
  title: 'Normative Regionali',
  description: 'Leggi regionali NCC in Italia: normative, regolamenti e delibere di ogni regione sul Noleggio Con Conducente con link ai testi ufficiali.',
}

export default function RegionalLawsPage() {
  const t = getTranslations()

  const webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Normative Regionali NCC',
    description: 'Leggi regionali NCC in Italia: normative, regolamenti e delibere di ogni regione sul Noleggio Con Conducente.',
    publisher: {
      '@type': 'Organization',
      name: 'BandiNCC.it',
      url: 'https://bandincc.it',
    },
    about: {
      '@type': 'Thing',
      name: 'Normative regionali sul Noleggio Con Conducente in Italia',
    },
  }

  return (
      <div className="w-full mx-auto">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }}
      />
      <div
        className="mb-3 relative rounded-lg overflow-hidden p-4 sm:p-6"
        style={{
          backgroundImage: 'url(/images/driver.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 inline-block px-2 py-1 rounded"
          style={{backgroundColor: 'rgba(0, 0, 0, 0.7)'}}>
          {t.pages.regionalLaws.title}
        </h1>
        <br/>
        <h2 className="text-sm sm:text-base text-gray-300 mb-3 inline-block px-2 py-1 rounded"
          style={{backgroundColor: 'rgba(0, 0, 0, 0.7)'}}>
          {t.pages.regionalLaws.subtitle}
        </h2>
      </div>
      <div className="mb-6 sm:mb-8">
        <p className="text-sm sm:text-base text-white">
          {t.pages.regionalLaws.description}
        </p>
      </div>

      <LawsContent data={lawsData as LawData[]} />
    </div>
  )
}
