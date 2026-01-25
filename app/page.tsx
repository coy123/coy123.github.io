import { Metadata } from 'next'
import { getTableData } from '@/lib/data'
import { getTranslations } from '@/lib/translations'
import HomeContent from '@/components/HomeContent'

export const revalidate = 3600 // ISR: rivalidazione ogni ora

export const metadata: Metadata = {
  title: 'Home',
  description: 'Database completo dei bandi NCC in Italia',
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

      <div className="w-full max-w-4xl mx-auto lg:w-4/5 xl:w-3/4">
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

        <div className="mb-6 sm:mb-8">
          <p className="text-sm sm:text-base text-gray-400">
            {t.pages.home.description}
          </p>
        </div>

        {/* Client Component per tabs interattivi */}
        <HomeContent data={tableData} />
      </div>
    </>
  )
}
