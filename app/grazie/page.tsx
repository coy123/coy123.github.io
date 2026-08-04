import { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations } from '@/lib/translations'
import { isPlaceholderLink } from '@/lib/subscription'
import HeroCrest from '@/components/HeroCrest'
import Celebration from '@/components/Celebration'

const t = getTranslations()

/**
 * The Stripe Payment Link redirect target.
 *
 * `noindex`: it is a post-payment confirmation, not content. Indexed it would
 * compete with /abbonamento/ for the same intent and show people a "thank you"
 * page for a purchase they never made. It is deliberately absent from
 * public/sitemap.xml for the same reason.
 *
 * It carries no order details — a static export has no way to read the Stripe
 * session, and the entitlement is granted by the webhook, not by this page
 * being loaded. Anyone can open the URL directly; the copy is written so that
 * costs nothing.
 */
export const metadata: Metadata = {
  title: t.pages.grazie.metaTitle,
  description: t.pages.grazie.metaDescription,
  robots: { index: false, follow: true },
}

export default function GraziePage() {
  const t = getTranslations()
  const page = t.pages.grazie

  return (
    <div className="w-full mx-auto">
      <Celebration />
      <div
        className="mb-3 relative rounded-lg overflow-hidden p-4 sm:p-6"
        style={{
          backgroundImage: 'url(/images/driver.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <HeroCrest />
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 inline-block px-2 py-1 rounded"
          style={{backgroundColor: 'rgba(0, 0, 0, 0.7)'}}>
          {page.title}
        </h1>
        <br/>
        <h2 className="text-sm sm:text-base text-gray-300 mb-3 inline-block px-2 py-1 rounded"
          style={{backgroundColor: 'rgba(0, 0, 0, 0.7)'}}>
          {page.subtitle}
        </h2>
      </div>

      <div className="mb-6 sm:mb-8 space-y-6">
        <div>
          <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">
            {page.stepsHeading}
          </h3>
          <ol className="space-y-2">
            {page.steps.map((step: string, index: number) => (
              <li key={index} className="flex gap-3 text-sm sm:text-base text-white">
                <span className="shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-semibold flex items-center justify-center">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-gray-400">{page.spamNote}</p>
        </div>

        <div className="bg-gray-900 rounded-lg p-4 sm:p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-2">
            {page.troubleHeading}
          </h3>
          <p className="text-sm text-white mb-3">{page.troubleNote}</p>
          <a
            href="mailto:info@bandincc.it"
            className="text-blue-400 hover:text-blue-300 transition-colors text-sm"
          >
            info@bandincc.it
          </a>
        </div>

        <div className="bg-gray-700 rounded-lg p-4 sm:p-6 space-y-2">
          <p className="text-sm">
            <Link href="/" className="text-blue-400 hover:text-blue-300 transition-colors">
              {page.homeCta}
            </Link>
          </p>
          {/* Omitted entirely while the portal link is a placeholder: a dead
              "manage subscription" link is worse than none. See
              lib/subscription.ts. */}
          {!isPlaceholderLink(t.pages.abbonamento.manage.href) && (
            <p className="text-sm">
              <a
                href={t.pages.abbonamento.manage.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                {t.pages.abbonamento.manage.cta}
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
