'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getTranslations } from '@/lib/translations'

export default function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const t = getTranslations()

  // No home entry: the crest carries it. On desktop it sits at the head of the
  // bar and takes the active highlight, on mobile it is the header logo.
  const navItems = [
    { path: '/how-to-become-driver', key: 'howToBecomeDriver' },
    { path: '/regional-laws', key: 'regionalLaws' },
    { path: '/utilities', key: 'utilities' },
    { path: '/income-calculator', key: 'incomeCalculator' },
    { path: '/faq', key: 'faq' },
    { path: '/about-us', key: 'aboutUs' },
  ]

  // `trailingSlash: true` makes usePathname() return "/faq/", while navItems
  // hold "/faq". Comparing them raw left every page except the home page
  // without an active-link highlight.
  const normalizePath = (path: string) => path.replace(/\/+$/, '') || '/'
  const isActive = (path: string) => normalizePath(pathname ?? '/') === normalizePath(path)

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:block bg-gray-900 border-b border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-16 gap-2">
            {/* The home link. In flow rather than absolutely placed, so it can
                never ride over the item list. Textless shield plus real text,
                rather than logo-mark.svg: at this size the wordmark baked into
                that file renders about three pixels tall. */}
            <Link
              href="/"
              aria-label={t.nav.home}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors ${
                isActive('/') ? 'bg-blue-600' : 'hover:bg-gray-800'
              }`}
            >
              <img
                src="/images/logo-favicon.svg"
                alt={t.nav.title}
                className="h-9 w-auto"
              />
              {/* The bar is already full at lg — the seven labels alone run
                  wider than the container there. Showing the wordmark only
                  from xl keeps the crest exactly as wide as the Home link it
                  replaces, so no width that fitted before stops fitting. */}
              <span className="hidden xl:inline text-sm font-extrabold tracking-wider text-gray-200">
                BANDI <span className="text-amber-300">NCC</span>
              </span>
            </Link>
            <div className="flex space-x-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive(item.path)
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  {item.key === 'incomeCalculator' && <span className="mr-1">💶</span>}
                  {t.nav[item.key as keyof typeof t.nav]}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      {/* Above the drawer (z-50) so the toggle stays clickable while the menu
          is open — otherwise the drawer covers it and its X state is dead. */}
      <div className="md:hidden bg-gray-900 border-b border-gray-700 sticky top-0 z-[60]">
        <div className="px-4 py-3 flex items-center relative">
          <button
            onClick={toggleMobileMenu}
            className="inline-flex items-center justify-center p-2 rounded-md text-gray-300 hover:text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 absolute left-4"
            aria-expanded={isMobileMenuOpen}
          >
            <span className="sr-only">{t.nav.openMenu}</span>
            {!isMobileMenuOpen ? (
              <svg
                className="block h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            ) : (
              <svg
                className="block h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            )}
          </button>
          {/* Not an <h1>: every page already has one, and a second heading
              would compete with it for the document outline. */}
          {/* The wrapper keeps the centring; the link wraps only its own
              content, so the tap target does not stretch across the row and
              under the absolutely placed menu and calculator buttons. */}
          <div className="flex-1 flex justify-center">
            <Link
              href="/"
              aria-label={t.nav.home}
              className="flex items-center gap-2"
            >
              <img
                src="/images/logo-favicon.svg"
                alt="Stemma Bandi NCC"
                className="h-7 w-auto"
              />
              <p className="text-lg font-semibold text-white">{t.nav.title}</p>
            </Link>
          </div>
          <Link
            href="/income-calculator"
            className="absolute right-4 p-2 text-xl"
            aria-label={t.nav.incomeCalculator}
          >
            💶
          </Link>
        </div>
      </div>

      {/* Mobile Navigation Menu Overlay */}
      {isMobileMenuOpen && (
        <>
          {/* Invisible backdrop for closing menu on click outside */}
          <div
            className="md:hidden fixed inset-0 z-50"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          {/* Menu */}
          <div className="md:hidden fixed top-0 left-0 w-64 h-full bg-gray-900 shadow-lg z-50 overflow-y-auto">
            {/* pt-20 clears the sticky header that now sits above this panel. */}
            <div className="px-4 pt-20 pb-4 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block px-4 py-3 rounded-md text-base font-medium transition-colors ${
                    isActive(item.path)
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  {t.nav[item.key as keyof typeof t.nav]}
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  )
}
