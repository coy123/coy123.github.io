import { Metadata } from 'next'
import Link from 'next/link'
import { getTableData } from '@/lib/data'
import { getTranslations } from '@/lib/translations'
import HomeContent from '@/components/HomeContent'
import CurrentDate from '@/components/CurrentDate'
import ReactMarkdown from 'react-markdown'

export const revalidate = 3600 // ISR: rivalidazione ogni ora

export const metadata: Metadata = {
  title: 'Home',
  description: 'Consulta tutti i bandi NCC attivi in Italia: licenze disponibili, scadenze e link ufficiali aggiornati ogni giorno, comune per comune.',
}

export default async function HomePage() {
  const tableData = await getTableData()
  const t = getTranslations()

  return (
    <>
      {/* JSON-LD Dataset Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Dataset',
            name: 'Database Bandi e Licenze NCC in Italia',
            description: 'Raccolta completa di tutti i bandi NCC pubblicati dai comuni italiani',
            license: 'https://creativecommons.org/publicdomain/zero/1.0/',
            spatialCoverage: {
              '@type': 'Place',
              geo: {
                '@type': 'GeoCoordinates',
                latitude: 41.8719,
                longitude: 12.5674,
              },
              name: 'Italia',
            },
          }),
        }}
      />

      <div className="w-full mx-auto">
        {/* Hero Section */}
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
            {t.pages.home.title}
          </h1>
          <br/>
          <h2 className="text-sm sm:text-base text-gray-300 mb-3 px-2 py-1 rounded inline-block"
            style={{backgroundColor: 'rgba(0, 0, 0, 0.7)'}}>
            {t.pages.home.subtitle}
          </h2>
        </div>

        {/* Top Banner Ad */}
        <div className="mb-3 w-full h-[90px] bg-gray-700 border border-gray-500 rounded-lg flex items-center justify-center">
          <p className="text-3xl font-bold text-gray-300">EGAF</p>
        </div>

        <div className="mb-1 sm:mb-2">
          <p className="text-sm sm:text-base text-white">
            {t.pages.home.description}
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            {t.pages.home.sections.map((section: { heading: string }, index: number) => (
              <a
                key={index}
                href={`#section-${index}`}
                className="text-xs sm:text-sm text-blue-400 hover:text-blue-300 border border-gray-600 hover:border-blue-400 rounded-full px-2 py-1 transition-colors"
              >
                {section.heading}
              </a>
            ))}
          </div>
        </div>

        {/* Last Updated */}
        <CurrentDate label={t.table.lastUpdated} />

        {/* Client Component per tabs interattivi */}
        <HomeContent data={tableData} />

        {/* Descriptive content sections */}
        <div className="mt-8 sm:mt-12 space-y-6">
          {t.pages.home.sections.map((section: { heading: string; content: string }, index: number) => (
            <div key={index} id={`section-${index}`} className="scroll-mt-20">
              <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">
                {section.heading}
              </h3>
              <div className="text-sm sm:text-base text-white prose prose-invert prose-sm max-w-none [&_a]:text-blue-400 [&_a:hover]:text-blue-300">
                <ReactMarkdown>{section.content}</ReactMarkdown>
              </div>
              {/* Section-specific internal links */}
              {index === 0 && (
                <p className="mt-2 text-sm">
                  <Link href="/how-to-become-driver" className="text-blue-400 hover:text-blue-300 transition-colors">
                    Scopri come diventare autista NCC →
                  </Link>
                </p>
              )}
              {index === 2 && (
                <p className="mt-2 text-sm">
                  <Link href="/faq" className="text-blue-400 hover:text-blue-300 transition-colors">
                    Hai altre domande? Consulta le FAQ e il Glossario NCC →
                  </Link>
                </p>
              )}
              {index === 3 && (
                <p className="mt-2 text-sm">
                  <Link href="/regional-laws" className="text-blue-400 hover:text-blue-300 transition-colors">
                    Consulta le leggi regionali NCC →
                  </Link>
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
