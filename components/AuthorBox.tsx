import Link from 'next/link'

export default function AuthorBox() {
  return (
    <div className="bg-gray-700 rounded-lg p-4 sm:p-6 mb-6">
      <p className="text-sm text-white">
        <span className="font-semibold">Scritto da</span>: La Redazione di BandiNCC
      </p>
      <p className="text-xs text-gray-300 mt-1">
        Un team di professionisti del settore tecnologico e dei trasporti che monitora quotidianamente i bandi NCC in tutta Italia.{' '}
        <Link href="/about-us" className="text-blue-400 hover:text-blue-300 transition-colors">
          Scopri di più →
        </Link>
      </p>
    </div>
  )
}
