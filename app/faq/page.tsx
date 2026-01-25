import { Metadata } from 'next'
import { getTranslations } from '@/lib/translations'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { readFileSync } from 'fs'
import { join } from 'path'

export const metadata: Metadata = {
  title: 'FAQ',
  description: 'Domande frequenti sulle licenze NCC',
}

export default function FAQPage() {
  const t = getTranslations()

  // Read the markdown file
  const markdownPath = join(process.cwd(), 'app', 'faq', 'faq.md')
  let markdownContent = readFileSync(markdownPath, 'utf-8')

  // Preserve empty lines by replacing them with line breaks
  markdownContent = markdownContent.replace(/\n\n/g, '\n\n&nbsp;\n\n')

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
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-400 mb-2 inline-block px-2 py-1 rounded"
          style={{backgroundColor: 'rgba(0, 0, 0, 0.7)'}}>
          {t.pages.faq.title}
        </h1>
        <br/>
        <h2 className="text-sm sm:text-base text-gray-300 mb-3 inline-block px-2 py-1 rounded"
          style={{backgroundColor: 'rgba(0, 0, 0, 0.7)'}}>
          {t.pages.faq.subtitle}
        </h2>
      </div>
      <div className="mb-6 sm:mb-8 prose prose-invert prose-sm sm:prose-base max-w-none [&>*]:text-gray-400 [&_p]:text-gray-400 [&_li]:text-gray-400 [&_td]:text-gray-400 [&_th]:text-gray-400 [&_strong]:text-gray-400 [&_a]:text-blue-400 [&_a:hover]:text-blue-300 [&_ul]:list-disc [&_ul]:ml-6 [&_ol]:list-decimal [&_ol]:ml-6">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {markdownContent}
        </ReactMarkdown>
      </div>
    </div>
  )
}
