import { Metadata } from 'next'
import { getTranslations } from '@/lib/translations'
import FAQAccordion from '@/components/FAQAccordion'
import AuthorBox from '@/components/AuthorBox'
import faqData from '@/data/faq.json'

export const metadata: Metadata = {
  title: 'FAQ e Glossario NCC',
  description: 'Domande frequenti e glossario dei termini NCC: risposte pratiche su licenze, bandi, requisiti e definizioni di sigle e concetti chiave del settore.',
}

export default function FAQPage() {
  const t = getTranslations()
  const glossaryTerms = t.pages.glossario.terms as { term: string; definition: string }[]

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      ...faqData.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer.replace(/\*\*/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'),
        },
      })),
      ...glossaryTerms.map((term) => ({
        '@type': 'Question',
        name: `Cosa significa ${term.term}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: term.definition,
        },
      })),
    ],
  }

  return (
      <div className="w-full mx-auto">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
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
          {t.pages.faq.title}
        </h1>
        <br/>
        <h2 className="text-sm sm:text-base text-gray-300 mb-3 inline-block px-2 py-1 rounded"
          style={{backgroundColor: 'rgba(0, 0, 0, 0.7)'}}>
          {t.pages.faq.subtitle}
        </h2>
      </div>
      <div className="mb-6 sm:mb-8">
        <p className="text-sm sm:text-base text-white">
          {t.pages.faq.description}
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          <a
            href="#domande-frequenti"
            className="text-xs sm:text-sm text-blue-400 hover:text-blue-300 border border-gray-600 hover:border-blue-400 rounded-full px-2 py-1 transition-colors"
          >
            Domande Frequenti
          </a>
          <a
            href="#glossario"
            className="text-xs sm:text-sm text-blue-400 hover:text-blue-300 border border-gray-600 hover:border-blue-400 rounded-full px-2 py-1 transition-colors"
          >
            Glossario NCC
          </a>
        </div>
      </div>

      <h2 id="domande-frequenti" className="text-xl sm:text-2xl font-bold text-white mb-4 scroll-mt-20">
        Domande Frequenti
      </h2>
      <FAQAccordion items={faqData} />

      {/* Glossario NCC */}
      <div id="glossario" className="mt-8 mb-6 scroll-mt-20">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
          {t.pages.glossario.title}
        </h2>
        <p className="text-sm sm:text-base text-white mb-4">
          {t.pages.glossario.description}
        </p>
        <FAQAccordion
          items={t.pages.glossario.terms.map((term: { term: string; definition: string }) => ({
            question: term.term,
            answer: term.definition,
          }))}
        />
      </div>

      <div className="mt-6">
        <AuthorBox />
      </div>
    </div>
  )
}
