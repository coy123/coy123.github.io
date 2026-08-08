import { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations } from '@/lib/translations'
import AuthorBox from '@/components/AuthorBox'
import MarkdownArticle from '@/components/MarkdownArticle'
import { readFileSync } from 'fs'
import { join } from 'path'
import HeroCrest from '@/components/HeroCrest'

export const metadata: Metadata = {
  title: 'Come Diventare Autista NCC',
  description: 'Guida passo passo per diventare autista NCC: requisiti, esame CQC, iscrizione al ruolo conducenti, costi e tempi per ottenere la licenza.',
}

export default function HowToBecomeDriverPage() {
  const t = getTranslations()

  // Read the markdown file
  const markdownPath = join(process.cwd(), 'app', 'how-to-become-driver', 'howToBecomeDriver.md')
  const markdownContent = readFileSync(markdownPath, 'utf-8')

  // Split after point 1 (the CAP/KB section) to insert ad banner
  const splitMarker = '#### 2.'
  const splitIndex = markdownContent.indexOf(splitMarker)
  const markdownPart1 = splitIndex !== -1 ? markdownContent.slice(0, splitIndex) : markdownContent
  const markdownPart2 = splitIndex !== -1 ? markdownContent.slice(splitIndex) : ''

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Come Diventare Autista NCC in Italia',
    description: 'Guida passo passo per diventare autista NCC: requisiti, esame CQC, iscrizione al ruolo conducenti, costi e tempi per ottenere la licenza.',
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
    mainEntityOfPage: 'https://bandincc.it/how-to-become-driver',
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
          {t.pages.howToBecomeDriver.title}
        </h1>
        <br/>
        <h2 className="text-sm sm:text-base text-gray-300 mb-3 inline-block px-2 py-1 rounded"
          style={{backgroundColor: 'rgba(0, 0, 0, 0.7)'}}>
          {t.pages.howToBecomeDriver.subtitle}
        </h2>
      </div>
      {/* The article reads as a sheet laid on the gray-800 page: one darker
          surface, so the eye has a single column to follow. */}
      <div className="mt-5 sm:mt-6 mb-6 sm:mb-8 rounded-xl border border-gray-700 bg-gray-900 p-5 sm:p-8">
        <MarkdownArticle>{markdownPart1}</MarkdownArticle>

        {/* Banner Ad after point 1 */}
        {/* <div className="my-6 w-full h-[90px] bg-gray-700 border border-gray-500 rounded-lg flex items-center justify-center">
          <p className="text-3xl font-bold text-gray-300">EGAF</p>
        </div> */}

        {markdownPart2 && <MarkdownArticle className="mt-10">{markdownPart2}</MarkdownArticle>}
      </div>

      <AuthorBox />

      {/* Internal links */}
      <div className="mb-6 sm:mb-8 bg-gray-700 rounded-lg p-4 sm:p-6 space-y-2">
        <h3 className="text-lg font-semibold text-white mb-3">Risorse utili</h3>
        <p className="text-sm">
          <Link href="/" className="text-blue-400 hover:text-blue-300 transition-colors">
            Consulta i bandi NCC disponibili →
          </Link>
        </p>
        <p className="text-sm">
          <Link href="/regional-laws" className="text-blue-400 hover:text-blue-300 transition-colors">
            Leggi regionali e normative NCC →
          </Link>
        </p>
        <p className="text-sm">
          <Link href="/income-calculator" className="text-blue-400 hover:text-blue-300 transition-colors">
            Calcola i tuoi potenziali guadagni →
          </Link>
        </p>
        <p className="text-sm">
          <Link href="/faq" className="text-blue-400 hover:text-blue-300 transition-colors">
            FAQ e Glossario NCC →
          </Link>
        </p>
      </div>
    </div>
  )
}
