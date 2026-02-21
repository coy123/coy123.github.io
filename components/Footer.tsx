import Link from 'next/link'
import { getTranslations } from '@/lib/translations'

export default function Footer() {
  const t = getTranslations()
  const currentYear = new Date().getFullYear()
  const copyrightText = t.footer.copyright.replace('{year}', currentYear.toString())

  return (
    <footer className="bg-gray-900 border-t border-gray-700 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="flex gap-4 text-sm">
            <Link href="/privacy-policy" className="text-gray-400 hover:text-blue-400 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/cookie-policy" className="text-gray-400 hover:text-blue-400 transition-colors">
              Cookie Policy
            </Link>
            <Link href="/disclaimer" className="text-gray-400 hover:text-blue-400 transition-colors">
              Disclaimer
            </Link>
          </div>
          <p className="text-center text-sm text-gray-400">
            {copyrightText}
          </p>
        </div>
      </div>
    </footer>
  )
}
