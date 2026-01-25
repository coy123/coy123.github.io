'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getTranslations } from '@/lib/translations'

export default function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const t = getTranslations()

  const navItems = [
    { path: '/', key: 'home' },
    { path: '/how-to-become-driver', key: 'howToBecomeDriver' },
    { path: '/regional-laws', key: 'regionalLaws' },
    { path: '/utilities', key: 'utilities' },
    { path: '/income-calculator', key: 'incomeCalculator' },
    { path: '/about', key: 'about' },
    { path: '/faq', key: 'faq' },
  ]

  const isActive = (path: string) => pathname === path

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:block bg-gray-900 border-b border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-16">
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
                  {t.nav[item.key as keyof typeof t.nav]}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <div className="md:hidden bg-gray-900 border-b border-gray-700 sticky top-0 z-40">
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
          <h1 className="flex-1 text-center text-lg font-semibold text-white">
            {t.nav.title}
          </h1>
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
            <div className="px-4 pt-4 pb-4 space-y-1">
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
