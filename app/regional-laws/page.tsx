import { Metadata } from 'next'
import { getTranslations } from '@/lib/translations'

export const metadata: Metadata = {
  title: 'Normative Regionali',
  description: 'Informazioni sulle normative regionali per le licenze NCC',
}

export default function RegionalLawsPage() {
  const t = getTranslations()

  return (
    <div className="w-full max-w-4xl mx-auto lg:w-4/5 xl:w-3/4">
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
        <p className="text-sm sm:text-base text-gray-400">
          {t.pages.regionalLaws.description}
        </p>
      </div>
    </div>
  )
}
