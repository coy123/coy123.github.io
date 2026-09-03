import { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations } from '@/lib/translations'
import HeroCrest from '@/components/HeroCrest'
import { jsonLd } from '@/lib/jsonLd'

export const metadata: Metadata = {
  title: 'Chi Siamo',
  description: 'Chi siamo, la nostra missione e come raccogliamo i dati sui bandi NCC. Contattaci a info@bandincc.it per segnalazioni, domande e collaborazioni.',
}

export default function AboutUsPage() {
  const t = getTranslations()

  const aboutSchema = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    mainEntity: {
      '@type': 'Organization',
      name: 'BandiNCC.it',
      url: 'https://bandincc.it',
      description: 'Piattaforma italiana che raccoglie e monitora tutti i bandi NCC pubblicati dai comuni italiani.',
      email: 'info@bandincc.it',
      // Carried over from the retired /contact page, whose ContactPage schema
      // disappeared with it. The organisation is still contactable.
      contactPoint: {
        '@type': 'ContactPoint',
        email: 'info@bandincc.it',
        contactType: 'customer service',
        availableLanguage: 'Italian',
      },
      areaServed: {
        '@type': 'Country',
        name: 'Italia',
      },
    },
  }

  return (
      <div className="w-full mx-auto">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(aboutSchema) }}
      />
      <div
        className="mb-3 relative rounded-lg overflow-hidden p-4 sm:p-6"
        style={{
          backgroundImage: 'url(/images/driver.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <HeroCrest />
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
        {/* Merged in from the retired /contact page, which held two paragraphs
            and an email address — content a "Chi Siamo" page is the natural
            home for. `scroll-mt` clears the sticky nav on the #contatti jump. */}
        <section id="contatti" className="scroll-mt-20 space-y-2">
          <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">
            {t.pages.contact.title}
          </h3>
          {(Array.isArray(t.pages.contact.description)
            ? t.pages.contact.description
            : [t.pages.contact.description]
          ).map((paragraph: string, index: number) => (
            <p key={index} className="text-sm sm:text-base text-white">
              {paragraph}
            </p>
          ))}
          <div className="mt-4 p-4 bg-gray-900 rounded-lg border border-gray-700">
            <p className="text-gray-300 mb-2">{t.pages.contact.emailLabel}</p>
            <a
              href="mailto:info@bandincc.it"
              className="text-blue-400 hover:text-blue-300 text-lg font-medium"
            >
              info@bandincc.it
            </a>
            {/* TODO: DELETE LATER — temporary, for the OSS VAT registration only.
                Remove this whole block once the registration is through.
                Hardcoded on purpose rather than put in `locales/it.json`: that
                file is imported wholesale by client components, so anything in
                it ships in the site-wide JS bundle. Here the name exists only in
                this page's HTML, which is the point — it is meant to appear on
                /about-us/ and nowhere else. */}
            <div className="mt-4 pt-4 border-t border-gray-700">
              <p className="text-gray-300 mb-2">Titolare del sito:</p>
              <p className="text-white text-lg font-medium">Siksok Inh. Yilmaz</p>
              <p className="text-sm text-gray-400">Svizzera</p>
            </div>
          </div>
        </section>

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
