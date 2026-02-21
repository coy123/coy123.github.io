import { Metadata } from 'next'
import { getTranslations } from '@/lib/translations'

export const metadata: Metadata = {
  title: 'Disclaimer',
  description: 'Informazioni su Bandi NCC Italia',
}

export default function DisclaimerPage() {
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
          {t.pages.disclaimer.title}
        </h1>
        <br/>
        <h2 className="text-sm sm:text-base text-gray-300 mb-3 inline-block px-2 py-1 rounded"
          style={{backgroundColor: 'rgba(0, 0, 0, 0.7)'}}>
          {t.pages.disclaimer.subtitle}
        </h2>
      </div>
      <div className="mb-6 sm:mb-8 space-y-4">
        {Array.isArray(t.pages.disclaimer.description) ? (
          t.pages.disclaimer.description.map((paragraph, index) => (
            <p key={index} className="text-sm sm:text-base text-white">
              {paragraph}
            </p>
          ))
        ) : (
          <p className="text-sm sm:text-base text-white">
            {t.pages.disclaimer.description}
          </p>
        )}
      </div>
    </div>
  )
}
