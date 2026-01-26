import type {Metadata} from 'next'
import Script from 'next/script'
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
        <head>
            <meta name="google-adsense-account" content="ca-pub-9161475235821616"/>
        </head>
        <body>
        <Script
            async
            src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9161475235821616"
            crossOrigin="anonymous"
            strategy="afterInteractive"
        />
        <div className="min-h-screen bg-gray-800 flex flex-col">
            <Navigation/>
            <div className="flex-1 py-4 sm:py-8 px-4 sm:px-6 lg:px-8">
                {children}
            </div>
            <Footer/>
        </div>
        </body>
        </html>
    )
}
