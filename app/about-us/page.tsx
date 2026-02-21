import { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations } from '@/lib/translations'

export const metadata: Metadata = {
  title: 'Chi Siamo',
  description: 'Chi siamo - Bandi NCC Italia',
}

export default function AboutUsPage() {
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
          {t.pages.aboutUs.title}
        </h1>
        <br/>
        <h2 className="text-sm sm:text-base text-gray-300 mb-3 inline-block px-2 py-1 rounded"
          style={{backgroundColor: 'rgba(0, 0, 0, 0.7)'}}>
          {t.pages.aboutUs.subtitle}
        </h2>
      </div>
      <div className="mb-6 sm:mb-8 space-y-6">
        <p className="text-sm sm:text-base text-white">
          {t.pages.aboutUs.intro}
        </p>
        {t.pages.aboutUs.sections.map((section: { heading: string; content: string }, index: number) => (
          <div key={index}>
            <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">
              {section.heading}
            </h3>
            <p className="text-sm sm:text-base text-white">
              {section.content}
            </p>
          </div>
        ))}
        <p className="text-xs text-gray-500 mt-4">
          {t.pages.aboutUs.legal}
        </p>

        {/* Internal links */}
        <div className="mt-6 bg-gray-700 rounded-lg p-4 sm:p-6 space-y-2">
          <h3 className="text-lg font-semibold text-white mb-3">Esplora il sito</h3>
          <p className="text-sm">
            <Link href="/" className="text-blue-400 hover:text-blue-300 transition-colors">
              Trova i bandi NCC disponibili →
            </Link>
          </p>
          <p className="text-sm">
            <Link href="/utilities" className="text-blue-400 hover:text-blue-300 transition-colors">
              Strumenti e risorse utili →
            </Link>
          </p>
          <p className="text-sm">
            <Link href="/income-calculator" className="text-blue-400 hover:text-blue-300 transition-colors">
              Calcolatore guadagni NCC →
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
