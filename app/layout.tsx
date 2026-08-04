import type {Metadata, Viewport} from 'next'
import Script from 'next/script'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import CookieBanner from '@/components/CookieBanner'
import SideAdSlot from '@/components/SideAdSlot'
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
        images: [{
            url: '/og-image.png',
            width: 1200,
            height: 630,
            alt: 'Stemma Bandi NCC — licenze Noleggio Con Conducente',
        }],
    },
    twitter: {
        card: 'summary_large_image',
        images: ['/og-image.png'],
    },
    robots: {
        index: true,
        follow: true,
    },
    // These files sat in public/ unreferenced: nothing but the browser's
    // implicit /favicon.ico request ever reached them.
    manifest: '/site.webmanifest',
    icons: {
        icon: [
            {url: '/favicon.ico', sizes: '16x16 32x32 48x48'},
            {url: '/favicon.svg', type: 'image/svg+xml'},
            {url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png'},
        ],
        apple: [{url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png'}],
    },
}

export const viewport: Viewport = {
    // Matches Next's defaults; declared only so themeColor can ride along and
    // paint the mobile browser chrome the same gray-900 as the nav bar.
    width: 'device-width',
    initialScale: 1,
    themeColor: '#111827',
}

export default function RootLayout({children}: {
    children: React.ReactNode
}) {
    return (
        <html lang="it">
        <body>
        {/* Hand-rendering <head> in the App Router makes React hydrate a
            different <head> than the server produced. next/script injects the
            tag itself and stays out of the hydration diff. */}
        <Script
            src="https://cloud.umami.is/script.js"
            strategy="afterInteractive"
            data-website-id="693859c4-b639-4fb6-b482-eaf0a08a7bbb"
            data-domains="bandincc.it,www.bandincc.it"
        />
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
            <div className="flex-1 flex justify-center">
                {/* The rails only appear at xl. The centre column keeps its
                    max-w-5xl basis and shrinks to make room for them, since the
                    rails cannot go below their min-w-[160px] + px-4. */}
                <SideAdSlot/>
                <div className="max-w-5xl lg:w-4/5 xl:w-4/5 flex-grow min-w-0 py-4 sm:py-8 px-4 sm:px-0">
                    {children}
                </div>
                <SideAdSlot/>
            </div>
            <Footer/>
            <CookieBanner/>
        </div>
        </body>
        </html>
    )
}
