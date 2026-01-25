'use client'

import Script from 'next/script'

const ADSENSE_PUBLISHER_ID = 'ca-pub-XXXXXXXXXXXXXXXX' // Replace with your actual AdSense publisher ID

export default function GoogleAdsense() {
  return (
    <Script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PUBLISHER_ID}`}
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  )
}
