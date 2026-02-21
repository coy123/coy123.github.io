import { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations } from '@/lib/translations'
import AuthorBox from '@/components/AuthorBox'

export const metadata: Metadata = {
  title: 'Glossario NCC',
  description: 'Glossario dei termini più comuni nel settore NCC: definizioni, sigle e concetti utili per aspiranti autisti e operatori.',
}

export default function GlossarioPage() {
  const t = getTranslations()
  const glossary = t.pages.glossario

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
          {glossary.title}
        </h1>
        <br/>
        <h2 className="text-sm sm:text-base text-gray-300 mb-3 inline-block px-2 py-1 rounded"
          style={{backgroundColor: 'rgba(0, 0, 0, 0.7)'}}>
          {glossary.subtitle}
        </h2>
      </div>
      <div className="mb-6 sm:mb-8">
        <p className="text-sm sm:text-base text-white">
          {glossary.description}
        </p>
      </div>

      <div className="space-y-4 mb-6">
        {glossary.terms.map((term: { term: string; definition: string }, index: number) => (
          <div key={index} className="bg-gray-700 rounded-lg p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-white mb-2">{term.term}</h3>
            <p className="text-sm sm:text-base text-white">{term.definition}</p>
          </div>
        ))}
      </div>

      <AuthorBox />

      <div className="mb-6 bg-gray-700 rounded-lg p-4 sm:p-6 space-y-2">
        <h3 className="text-lg font-semibold text-white mb-3">Esplora</h3>
        <p className="text-sm">
          <Link href="/faq" className="text-blue-400 hover:text-blue-300 transition-colors">
            Domande frequenti sull&apos;attività NCC →
          </Link>
        </p>
        <p className="text-sm">
          <Link href="/how-to-become-driver" className="text-blue-400 hover:text-blue-300 transition-colors">
            Come diventare autista NCC →
          </Link>
        </p>
        <p className="text-sm">
          <Link href="/" className="text-blue-400 hover:text-blue-300 transition-colors">
            Consulta i bandi NCC disponibili →
          </Link>
        </p>
      </div>
    </div>
  )
}
