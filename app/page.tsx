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
          className="mb-3 relative rounded-lg overflow-hidden px-4 py-2 sm:px-6 sm:py-3"
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
          <h2 className="text-sm sm:text-base text-gray-300 mb-0 px-2 py-1 rounded inline-block"
            style={{backgroundColor: 'rgba(0, 0, 0, 0.7)'}}>
            {t.pages.home.subtitle}
          </h2>
        </div>

        <p className="text-sm sm:text-base text-white mb-2 sm:mb-3">
          <span className="sm:hidden">{t.pages.home.descriptionShort}</span>
          <span className="hidden sm:inline">{t.pages.home.description}</span>
        </p>

        {/* Banner Ad - temporarily disabled */}
        {/* <a href="https://www.amazon.it/dp/B0GZBHCG5P?crid=3MKXJETSG2ODT&dib=eyJ2IjoiMSJ9.lCgzAblVwfMrdsdr61C0Qg.I8dkvYsEYc_sm7XVDqZQYw3nABhmbt25CxiwguT00r4&dib_tag=se&keywords=NCC%3A+DA+CONDUCENTE+A+IMPRENDITORE%2C&qid=1777721531&sprefix=ncc+da+conducente+a+imprenditore%2C%2Caps%2C555&sr=8-1" target="_blank" rel="noopener noreferrer" className="block mb-3 w-full sm:w-4/5 sm:mx-auto h-[170px] sm:h-[240px] rounded-lg overflow-hidden">
          <img src="/images/bookBannerSmall.avif" alt="NCC: Da Conducente a Imprenditore" className="sm:hidden w-full h-full object-cover rounded-lg" />
          <img src="/images/bookBanner.avif" alt="NCC: Da Conducente a Imprenditore" className="hidden sm:block w-full h-full object-cover rounded-lg" />
        </a> */}

        <div className="mb-1 sm:mb-2">
          <div className="flex flex-wrap gap-x-2 gap-y-[9999px] max-h-[26px] sm:max-h-[30px] overflow-hidden">
            {t.pages.home.sections.map((section: { heading: string }, index: number) => (
              <a
                key={index}
                href={`#section-${index}`}
                className="text-xs sm:text-sm text-blue-400 hover:text-blue-300 border border-gray-600 hover:border-blue-400 rounded-full px-2 py-1 transition-colors whitespace-nowrap shrink-0"
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
