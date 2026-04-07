import { Metadata } from 'next'
import { getTranslations } from '@/lib/translations'
import AuthorBox from '@/components/AuthorBox'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { readFileSync } from 'fs'
import { join } from 'path'

export const metadata: Metadata = {
  title: 'Strumenti Utili',
  description: 'Strumenti essenziali per autisti NCC: app di navigazione, gestione prenotazioni, contabilità e risorse per avviare e gestire la tua attività.',
}

export default function UtilitiesPage() {
  const t = getTranslations()

  // Read the markdown file
  const markdownPath = join(process.cwd(), 'app', 'utilities', 'utilities.md')
  let markdownContent = readFileSync(markdownPath, 'utf-8')

  // Preserve empty lines by replacing them with line breaks
  markdownContent = markdownContent.replace(/\n\n/g, '\n\n&nbsp;\n\n')

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
      <div className="mb-6 sm:mb-8 prose prose-invert prose-sm sm:prose-base max-w-none [&>*]:text-white [&_p]:text-white [&_li]:text-white [&_td]:text-white [&_th]:text-white [&_strong]:text-white [&_a]:text-blue-400 [&_a:hover]:text-blue-300 [&_table]:border [&_table]:border-gray-400 [&_td]:border [&_td]:border-gray-400 [&_th]:border [&_th]:border-gray-400 [&_ul]:list-disc [&_ul]:ml-6 [&_ol]:list-decimal [&_ol]:ml-6">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {markdownContent}
        </ReactMarkdown>
      </div>

      <AuthorBox />
    </div>
  )
}
