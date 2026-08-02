import Link from 'next/link'
import { getTranslations } from '@/lib/translations'

export default function Footer() {
  const t = getTranslations()
  const currentYear = new Date().getFullYear()
  const copyrightText = t.footer.copyright.replace('{year}', currentYear.toString())

  // Contatti is not a page: /contact was merged into Chi Siamo and its content
  // now sits under the #contatti anchor there.
  const links = [
    { href: '/privacy-policy', label: t.footer.links.privacyPolicy },
    { href: '/cookie-policy', label: t.footer.links.cookiePolicy },
    { href: '/disclaimer', label: t.footer.links.disclaimer },
    { href: '/about-us/#contatti', label: t.footer.links.contact },
  ]

  return (
    <footer className="bg-gray-900 border-t border-gray-700 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col items-center gap-2">
          {/* Wraps because the Italian labels are long enough to overflow a
              phone on one line. */}
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-gray-400 hover:text-blue-400 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <p className="text-center text-sm text-gray-400">
            {copyrightText}
          </p>
        </div>
      </div>
    </footer>
  )
}
