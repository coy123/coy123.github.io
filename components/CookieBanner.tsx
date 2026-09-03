'use client'

import { useState, useEffect } from 'react'
import { getTranslations } from '@/lib/translations'

/**
 * The consent banner, kept deliberately ahead of what the site actually does.
 *
 * **The stored value is not read by anything, and that is intended.** The site
 * sets no cookies at all — there is no `document.cookie` anywhere in the
 * codebase, and Umami (app/layout.tsx) is cookieless, collects no IP and no
 * personal data, so it loads unconditionally and must keep loading whatever is
 * clicked here. `locales/it.json → pages.cookiePolicy` states that position and
 * is the accurate description of today's behaviour.
 *
 * So "Rifiuta" changes nothing today, and nothing is being broken by that: with
 * no cookies to refuse there is no consent to obtain. What the banner and its
 * modal do is ask the question anyway, so the mechanism and the user's answer
 * are already in place the day something is added that genuinely needs consent
 * — an ad network, an embedded player, a real analytics cookie. At that point
 * this component gains a reader for `cookie-consent` and the copy becomes
 * literally true; until then it is deliberately broader than the site.
 *
 * A code review flagged the mismatch on 2026-09-01 (the modal offers "cookie di
 * analisi e profilazione" while the policy correctly says there are none) and
 * the call was to keep it. Do not "fix" this by narrowing the modal copy to
 * match the policy, and do not gate the Umami <Script> on the stored value.
 */
export default function CookieBanner() {
  const t = getTranslations()
  const [isVisible, setIsVisible] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent')
    if (!consent) {
      setIsVisible(true)
    }
  }, [])

  const acceptCookies = () => {
    localStorage.setItem('cookie-consent', 'accepted')
    setIsVisible(false)
    setIsModalOpen(false)
  }

  const declineCookies = () => {
    localStorage.setItem('cookie-consent', 'declined')
    setIsVisible(false)
    setIsModalOpen(false)
  }

  if (!isVisible) return null

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 p-4 z-50">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-300 text-center sm:text-left">
            Questo sito utilizza cookie tecnici per migliorare la tua esperienza di navigazione.{' '}
            <button
              onClick={() => setIsModalOpen(true)}
              className="text-blue-400 hover:text-blue-300 underline"
            >
              Maggiori informazioni
            </button>
            {' | '}
            {/* Mirrors the page's own heading so the two never drift apart. */}
            <a
              href="/cookie-policy"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              {t.pages.cookiePolicy.title}
            </a>
          </p>
          <div className="flex gap-3">
            <button
              onClick={declineCookies}
              className="px-6 py-2 bg-gray-700 text-white text-sm font-medium rounded-md hover:bg-gray-600 transition-colors whitespace-nowrap"
            >
              Rifiuta
            </button>
            <button
              onClick={acceptCookies}
              className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              Accetta
            </button>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setIsModalOpen(false)}
          />
          <div className="relative bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-md w-full">
            <button
              onClick={() => setIsModalOpen(false)}
              aria-label="Chiudi"
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-xl font-bold text-white mb-4">Questo sito utilizza cookie</h2>
            <p className="text-gray-300 mb-6">
              Usiamo cookie tecnici e, con il tuo consenso, cookie di analisi e profilazione.
              Puoi accettare, rifiutare o personalizzare le tue scelte.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={declineCookies}
                className="px-6 py-2 bg-gray-700 text-white text-sm font-medium rounded-md hover:bg-gray-600 transition-colors"
              >
                Rifiuta
              </button>
              <button
                onClick={acceptCookies}
                className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
              >
                Accetta
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
