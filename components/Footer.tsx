import { getTranslations } from '@/lib/translations'

export default function Footer() {
  const t = getTranslations()
  const currentYear = new Date().getFullYear()
  const copyrightText = t.footer.copyright.replace('{year}', currentYear.toString())

  return (
    <footer className="bg-gray-900 border-t border-gray-700 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <p className="text-center text-sm text-gray-400">
          {copyrightText}
        </p>
      </div>
    </footer>
  )
}
