'use client'

import { usePathname } from 'next/navigation'
import NewsletterAd from './NewsletterAd'

/**
 * One of the two desktop side rails, rendered either side of the content column
 * in the root layout. `xl` and up only: below that the content column already
 * fills the viewport and there is no rail to sit in.
 *
 * A client component purely so it can read the path. The rail currently carries
 * a house ad for the newsletter, which would be absurd on the two pages that
 * *are* the newsletter — a "subscribe" pitch alongside the checkout, or beside
 * the thank-you page of someone who just paid. The layout is a server
 * component and cannot branch on the route itself.
 *
 * The home page is on that list for a different reason: the locked rows in the
 * table make the same pitch, in the one place where it is not an ad but an
 * explanation of what the reader is looking at. Three copies of it around one
 * table is noise, and the rails are the copies that carry the least context.
 *
 * Sticky top is `calc(50vh - 300px)`, i.e. a 600px-tall creative centred in the
 * viewport; a different height needs that number changed with it.
 */
const HIDDEN_ON = ['/', '/abbonamento', '/grazie']

export default function SideAdSlot() {
  const pathname = usePathname()
  // `trailingSlash: true` means usePathname() returns "/abbonamento/".
  const normalized = (pathname ?? '/').replace(/\/+$/, '') || '/'

  if (HIDDEN_ON.includes(normalized)) return null

  return (
    <aside className="hidden xl:flex flex-1 justify-center items-start px-4">
      <div className="sticky top-[calc(50vh-300px)] w-1/2 min-w-[160px] max-w-[280px]">
        <NewsletterAd variant="side" />
      </div>
    </aside>
  )
}
