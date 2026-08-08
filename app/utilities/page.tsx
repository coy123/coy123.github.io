import { Metadata } from 'next'
import { getTranslations } from '@/lib/translations'
import AuthorBox from '@/components/AuthorBox'
import MarkdownArticle from '@/components/MarkdownArticle'
import { readFileSync } from 'fs'
import { join } from 'path'
import HeroCrest from '@/components/HeroCrest'

export const metadata: Metadata = {
  title: 'Strumenti Utili',
  description: 'Strumenti essenziali per autisti NCC: app di navigazione, gestione prenotazioni, contabilità e risorse per avviare e gestire la tua attività.',
}

export default function UtilitiesPage() {
  const t = getTranslations()

  // Read the markdown file
  const markdownPath = join(process.cwd(), 'app', 'utilities', 'utilities.md')
  const markdownContent = readFileSync(markdownPath, 'utf-8')

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Strumenti Utili per Autisti NCC',
    description: 'Strumenti essenziali per autisti NCC: app di navigazione, gestione prenotazioni, contabilità e risorse per la tua attività.',
    author: {
      '@type': 'Organization',
      name: 'BandiNCC.it',
      url: 'https://bandincc.it/about-us',
    },
    publisher: {
      '@type': 'Organization',
      name: 'BandiNCC.it',
      url: 'https://bandincc.it',
    },
    mainEntityOfPage: 'https://bandincc.it/utilities',
  }

  return (
    <div className="w-full mx-auto">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
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
          {t.pages.utilities.title}
        </h1>
        <br/>
        <h2 className="text-sm sm:text-base text-gray-300 mb-3 inline-block px-2 py-1 rounded"
          style={{backgroundColor: 'rgba(0, 0, 0, 0.7)'}}>
          {t.pages.utilities.subtitle}
        </h2>
      </div>
      {/* Same sheet-on-page treatment as /how-to-become-driver. */}
      <div className="mt-5 sm:mt-6 mb-6 sm:mb-8 rounded-xl border border-gray-700 bg-gray-900 p-5 sm:p-8">
        <MarkdownArticle>{markdownContent}</MarkdownArticle>
      </div>

      <AuthorBox />
    </div>
  )
}
