import { Metadata } from 'next'
import { getTranslations } from '@/lib/translations'

export const metadata: Metadata = {
  title: 'Contatti',
  description: 'Contatta il team di BandiNCC.it per segnalazioni, domande sui bandi NCC o collaborazioni. Rispondiamo entro 24 ore.',
}

export default function ContactPage() {
  const t = getTranslations()

  const contactSchema = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    mainEntity: {
      '@type': 'Organization',
      name: 'BandiNCC.it',
      url: 'https://bandincc.it',
      email: 'info@bandincc.it',
      contactPoint: {
        '@type': 'ContactPoint',
        email: 'info@bandincc.it',
        contactType: 'customer service',
        availableLanguage: 'Italian',
      },
    },
  }

  return (
    <div className="w-full max-w-4xl mx-auto lg:w-4/5 xl:w-3/4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactSchema) }}
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
          {t.pages.contact.title}
        </h1>
        <br/>
        <h2 className="text-sm sm:text-base text-gray-300 mb-3 inline-block px-2 py-1 rounded"
          style={{backgroundColor: 'rgba(0, 0, 0, 0.7)'}}>
          {t.pages.contact.subtitle}
        </h2>
      </div>
      <div className="mb-6 sm:mb-8 space-y-4">
        {Array.isArray(t.pages.contact.description) ? (
          t.pages.contact.description.map((paragraph, index) => (
            <p key={index} className="text-sm sm:text-base text-white">
              {paragraph}
            </p>
          ))
        ) : (
          <p className="text-sm sm:text-base text-white">
            {t.pages.contact.description}
          </p>
        )}
        <div className="mt-6 p-4 bg-gray-900 rounded-lg border border-gray-700">
          <p className="text-gray-300 mb-2">{t.pages.contact.emailLabel}</p>
          <a
            href="mailto:info@bandincc.it"
            className="text-blue-400 hover:text-blue-300 text-lg font-medium"
          >
            info@bandincc.it
          </a>
        </div>
      </div>
    </div>
  )
}
