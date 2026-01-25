import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-white mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-300 mb-4">
          Pagina non trovata
        </h2>
        <p className="text-gray-400 mb-8">
          La pagina che stai cercando non esiste.
        </p>
        <Link
          href="/"
          className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Torna alla Home
        </Link>
      </div>
    </div>
  )
}
