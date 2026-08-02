import { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations } from '@/lib/translations'

/**
 * Retired page. Its content now lives in the "Contatti" section of Chi Siamo.
 *
 * The route is kept rather than deleted because /contact was in the sitemap and
 * may be indexed or bookmarked. `output: 'export'` rules out a real 301 — there
 * is no server, and next.config redirects do not apply to a static export — so
 * this does the job with a zero-delay meta refresh, a canonical pointing at the
 * merged page and noindex, plus a visible link for anyone the refresh misses.
 */
const TARGET = '/about-us/#contatti'

export const metadata: Metadata = {
  title: 'Contatti',
  description: 'La pagina Contatti di BandiNCC.it è stata unita a Chi Siamo.',
  alternates: { canonical: '/about-us/' },
  robots: { index: false, follow: true },
}

export default function ContactPage() {
  const t = getTranslations()

  return (
    <div className="w-full mx-auto">
      <meta httpEquiv="refresh" content={`0; url=${TARGET}`} />
      <div className="py-12 text-center space-y-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">
          {t.pages.contact.title}
        </h1>
        <p className="text-sm sm:text-base text-gray-300">
          {t.pages.contact.movedNotice}
        </p>
        <Link
          href={TARGET}
          className="inline-block text-blue-400 hover:text-blue-300 transition-colors"
        >
          {t.pages.contact.movedLink}
        </Link>
      </div>
    </div>
  )
}
