import { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations } from '@/lib/translations'
import AuthorBox from '@/components/AuthorBox'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { readFileSync } from 'fs'
import { join } from 'path'

export const metadata: Metadata = {
  title: 'Come Diventare Autista NCC',
  description: 'Guida passo passo per diventare autista NCC: requisiti, esame CQC, iscrizione al ruolo conducenti, costi e tempi per ottenere la licenza.',
}

export default function HowToBecomeDriverPage() {
  const t = getTranslations()

  // Read the markdown file
  const markdownPath = join(process.cwd(), 'app', 'how-to-become-driver', 'howToBecomeDriver.md')
  let markdownContent = readFileSync(markdownPath, 'utf-8')

  // Preserve empty lines by replacing them with line breaks
  markdownContent = markdownContent.replace(/\n\n/g, '\n\n&nbsp;\n\n')

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
    <div className="w-full max-w-4xl mx-auto lg:w-4/5 xl:w-3/4">
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
      <div className="mb-6 sm:mb-8 prose prose-invert prose-sm sm:prose-base max-w-none [&>*]:text-white [&_p]:text-white [&_li]:text-white [&_td]:text-white [&_th]:text-white [&_strong]:text-white [&_a]:text-blue-400 [&_a:hover]:text-blue-300">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {markdownContent}
        </ReactMarkdown>
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
