import type {Metadata} from 'next'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import CookieBanner from '@/components/CookieBanner'
import './globals.css'

export const metadata: Metadata = {
    metadataBase: new URL('https://bandincc.it'),
    title: {
        default: 'Bandi NCC Italia | Licenze Noleggio Con Conducente',
        template: '%s | Bandi NCC Italia'
    },
    description: 'Tutti i bandi NCC in Italia aggiornati ogni giorno. Trova licenze Noleggio Con Conducente disponibili, scadenze e requisiti comune per comune.',
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

export default function RootLayout({children}: {
    children: React.ReactNode
}) {
    return (
        <html lang="it">
        <head>
            <script defer src="https://cloud.umami.is/script.js"
                    data-website-id="693859c4-b639-4fb6-b482-eaf0a08a7bbb"
                    data-domains="bandincc.it,www.bandincc.it"></script>
        </head>
        <body>
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                    '@context': 'https://schema.org',
                    '@type': 'WebSite',
                    name: 'Bandi NCC Italia',
                    url: 'https://bandincc.it',
                    description: 'Tutti i bandi NCC in Italia aggiornati ogni giorno. Trova licenze Noleggio Con Conducente disponibili, scadenze e requisiti comune per comune.',
                    publisher: {
                        '@type': 'Organization',
                        name: 'BandiNCC.it',
                        url: 'https://bandincc.it',
                        email: 'info@bandincc.it',
                    },
                    inLanguage: 'it',
                }),
            }}
        />
        <div className="min-h-screen bg-gray-800 flex flex-col">
            <Navigation/>
            <div className="flex-1 py-4 sm:py-8 px-4 sm:px-6 lg:px-8">
                {children}
            </div>
            <Footer/>
            <CookieBanner/>
        </div>
        </body>
        </html>
    )
}
