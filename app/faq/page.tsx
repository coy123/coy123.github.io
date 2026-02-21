import { Metadata } from 'next'
import { getTranslations } from '@/lib/translations'
import FAQAccordion from '@/components/FAQAccordion'
import AuthorBox from '@/components/AuthorBox'
import faqData from '@/data/faq.json'

export const metadata: Metadata = {
  title: 'FAQ',
  description: 'Domande frequenti sulle licenze NCC',
}

export default function FAQPage() {
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
      </div>

      <FAQAccordion items={faqData} />

      <div className="mt-6">
        <AuthorBox />
      </div>
    </div>
  )
}
