import { Metadata } from 'next'
import { getTranslations } from '@/lib/translations'

const t = getTranslations()

export const metadata: Metadata = {
  title: t.pages.privacyPolicy.metaTitle,
  description: t.pages.privacyPolicy.metaDescription,
}

export default function PrivacyPolicyPage() {
  const t = getTranslations()

  return (
      <div className="w-full mx-auto">
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
          {t.pages.privacyPolicy.title}
        </h1>
        <br/>
        <h2 className="text-sm sm:text-base text-gray-300 mb-3 inline-block px-2 py-1 rounded"
          style={{backgroundColor: 'rgba(0, 0, 0, 0.7)'}}>
          {t.pages.privacyPolicy.subtitle}
        </h2>
      </div>
      <div className="mb-6 sm:mb-8 space-y-6">
        {t.pages.privacyPolicy.sections.map((section: { heading: string; content: string }, index: number) => (
          <div key={index}>
            <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">
              {section.heading}
            </h3>
            <p className="text-sm sm:text-base text-white">
              {section.content}
            </p>
          </div>
        ))}
        <p className="text-xs text-gray-500 mt-8">
          {t.pages.privacyPolicy.lastUpdated}
        </p>
      </div>
    </div>
  )
}
