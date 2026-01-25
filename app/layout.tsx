import type { Metadata } from 'next'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://bandincc.it'),
  title: {
    default: 'Bandi NCC Italia | Licenze Noleggio Con Conducente',
    template: '%s | Bandi NCC Italia'
  },
  description: 'Database completo dei bandi e licenze NCC (Noleggio Con Conducente) pubblicati dai comuni italiani.',
  openGraph: {
    type: 'website',
    locale: 'it_IT',
    siteName: 'Bandi NCC Italia',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="it">
      <body>
        <div className="min-h-screen bg-gray-800 flex flex-col">
          <Navigation />
          <div className="flex-1 py-4 sm:py-8 px-4 sm:px-6 lg:px-8">
            {children}
          </div>
          <Footer />
        </div>
      </body>
    </html>
  )
}
