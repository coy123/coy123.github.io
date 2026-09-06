'use client'

import { useEffect, useMemo, useRef } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import Table from './Table'
import { TableData } from '@/types'
import { getTranslations } from '@/lib/translations'
import { CREST_SIZE_TABLE, crestUrl } from '@/lib/crest'
import { currentDay, hasExpired } from '@/lib/embargo'
import { REGIONS, Region, regionOf } from '@/lib/regions'

const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-[360px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
    </div>
  ),
})

interface RegionsContentProps {
  /**
   * The published bandi — the same array the table and map tabs get. The
   * region split happens here, in the browser, only because it is a pure
   * function of a payload the page is already sending; nothing new crosses
   * over, and in particular the embargoed rows are not in `data` to begin
   * with (app/page.tsx passes `publishedBids`).
   */
  data: TableData[]
  /** How many bandi the release delay is holding back, across all of Italy. */
  lockedCount?: number
  /**
   * The chosen region, held by the parent so it survives a trip to the table
   * or map tab and back — the search query already behaves that way, and a
   * picker that silently forgets is worse than one that never remembered.
   */
  selectedId: string | null
  onSelect: (id: string | null) => void
}

/** Open and closed bandi in one region, as the picker reports them. */
interface Tally {
  open: number
  closed: number
  total: number
}

/**
 * The "Regioni" tab: pick one of the twenty regions, then see that region's
 * bandi in the ordinary table and on a map already framed on the region.
 *
 * Every region is offered, including the ones with nothing in them — the list
 * is a map of Italy, not a list of what happens to be available this week, and
 * an empty region is a real answer to "is there anything near me?".
 */
export default function RegionsContent({
  data,
  lockedCount = 0,
  selectedId,
  onSelect,
}: RegionsContentProps) {
  const t = getTranslations()
  const copy = t.dashboard.regions
  const resultsRef = useRef<HTMLDivElement | null>(null)

  /*
   * Today, resolved during render rather than in a mount effect — and that is
   * safe *here* specifically.
   *
   * `Table`, `MapView` and `BidStatus` all defer the date because they sit in
   * the server-rendered tree, where a build-time day would hydrate against a
   * different one. This component never does: `HomeContent` starts on the
   * table tab, so the regions panel does not exist until a click, and a click
   * only ever happens on the client. If the default tab is ever changed to
   * 'regions', this has to move into a mount effect like the others.
   */
  const today = useMemo(() => currentDay(), [])

  /**
   * One pass over the data for all twenty regions. Both rules it is built from
   * are the app's own — `regionOf` for the region, `hasExpired` for open or
   * closed (see "One rule for scaduto") — so this counts and decides nothing.
   */
  const tallies = useMemo(() => {
    const byRegion: Record<string, Tally> = Object.fromEntries(
      REGIONS.map((region) => [region.id, { open: 0, closed: 0, total: 0 }])
    )
    for (const bid of data) {
      const region = regionOf(bid)
      if (!region) continue
      const tally = byRegion[region.id]
      tally.total += 1
      if (hasExpired(bid.deadline, today)) tally.closed += 1
      else tally.open += 1
    }
    return byRegion
  }, [data, today])

  const selected: Region | undefined = selectedId
    ? REGIONS.find((region) => region.id === selectedId)
    : undefined
  const regionData = useMemo(
    () => (selected ? data.filter((bid) => regionOf(bid)?.id === selected.id) : []),
    [data, selected]
  )

  /*
   * Picking a region moves the page to the results. On a phone the picker is
   * five rows of crests and the table starts below the fold; on a desktop the
   * grid still pushes it down. Without this, the click looks like it did
   * nothing.
   *
   * It deliberately does not fire on mount: coming back to this tab with a
   * region already chosen should leave the page where the reader left it, and
   * only an actual change of choice is a reason to move them.
   */
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    if (!selectedId || !resultsRef.current) return

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    resultsRef.current.scrollIntoView({
      behavior: reduced ? 'auto' : 'smooth',
      block: 'start',
    })
  }, [selectedId])

  const openLabel = (count: number) =>
    count === 1 ? copy.openOne : copy.open.replace('{count}', String(count))
  const closedLabel = (count: number) =>
    count === 1 ? copy.closedOne : copy.closed.replace('{count}', String(count))
  const totalLabel = (count: number) =>
    count === 0
      ? copy.countZero
      : count === 1
        ? copy.countOne
        : copy.count.replace('{count}', String(count))

  /** What a screen reader hears on a region button, in either grid. */
  const buttonLabel = (region: Region, tally: Tally) =>
    tally.total === 0
      ? `${region.name}: ${copy.countZero}`
      : copy.buttonLabel
          .replace('{region}', region.name)
          .replace('{open}', openLabel(tally.open))
          .replace('{closed}', closedLabel(tally.closed))

  const buttonClass = (isSelected: boolean, tally: Tally) =>
    `flex rounded-lg border transition-colors ${
      isSelected
        ? 'border-blue-500 bg-blue-600/20'
        : 'border-gray-600 bg-gray-800 hover:border-blue-400 hover:bg-gray-600'
    } ${tally.total === 0 ? 'opacity-60' : ''}`

  const crest = (region: Region, size: string) => (
    <img
      src={crestUrl(region.crest, CREST_SIZE_TABLE)}
      alt={copy.crestAlt.replace('{region}', region.name)}
      className={`${size} shrink-0 object-contain`}
      loading="lazy"
      decoding="async"
    />
  )

  /**
   * The open/closed pair, in the two shapes it appears in: numbers only where
   * space is scarce (the phone grid), words everywhere else. Green for open
   * and grey for closed are the table's own row colours — the same distinction
   * the reader has already learned one tab to the left.
   *
   * `aria-hidden` by default because the two grids put the same thing into
   * each button's `aria-label`, spelled out — a screen reader should hear
   * "Toscana: 3 aperti, 5 scaduti" once, not that plus a bare "3 · 5". The
   * standalone heading below passes `hidden: false`, since there it is the
   * only copy carrying the numbers.
   */
  const counts = (tally: Tally, style: 'numbers' | 'words', hidden = true) => {
    if (tally.total === 0) {
      return (
        <span aria-hidden={hidden} className="text-gray-500">
          {style === 'numbers' ? '—' : copy.countZero}
        </span>
      )
    }
    return (
      <span aria-hidden={hidden}>
        <span className="text-green-400">
          {style === 'numbers' ? tally.open : openLabel(tally.open)}
        </span>
        <span className="text-gray-500"> · </span>
        <span className="text-gray-400">
          {style === 'numbers' ? tally.closed : closedLabel(tally.closed)}
        </span>
      </span>
    )
  }

  return (
    <div className="w-full">
      <p className="text-sm text-gray-300 mb-3">{copy.intro}</p>

      {/* Mobile: crests only, four across, so all twenty fit in five rows and
          the tap targets stay thumb-sized. The name is on the button's
          `aria-label` and on the heading that appears once one is picked. */}
      <div
        className="grid sm:hidden grid-cols-4 gap-2 mb-3"
        role="group"
        aria-label={copy.selectLabel}
      >
        {REGIONS.map((region) => {
          const tally = tallies[region.id]
          const isSelected = region.id === selectedId
          return (
            <button
              key={region.id}
              type="button"
              aria-pressed={isSelected}
              aria-label={buttonLabel(region, tally)}
              title={region.name}
              onClick={() => onSelect(isSelected ? null : region.id)}
              className={`${buttonClass(isSelected, tally)} flex-col items-center gap-1 px-1 py-2`}
            >
              {crest(region, 'w-9 h-9')}
              <span className="text-[11px] leading-none">{counts(tally, 'numbers')}</span>
            </button>
          )
        })}
      </div>

      {/* Desktop: the same twenty, with their names and the counts in words. */}
      <div
        className="hidden sm:grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 mb-4"
        role="group"
        aria-label={copy.selectLabel}
      >
        {REGIONS.map((region) => {
          const tally = tallies[region.id]
          const isSelected = region.id === selectedId
          return (
            <button
              key={region.id}
              type="button"
              aria-pressed={isSelected}
              aria-label={buttonLabel(region, tally)}
              onClick={() => onSelect(isSelected ? null : region.id)}
              className={`${buttonClass(isSelected, tally)} items-center gap-2 px-2 py-2 text-left`}
            >
              {crest(region, 'w-8 h-8')}
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-white truncate">{region.name}</span>
                <span className="block text-xs truncate">{counts(tally, 'words')}</span>
              </span>
            </button>
          )
        })}
      </div>

      {/* The count is a nationwide number, so it is said as one: attributing
          the withheld bandi to the region on screen would be a claim the
          embargo cannot make — which region they are in is exactly what the
          server never sends (lib/data.ts). */}
      {lockedCount > 0 && (
        <p className="mb-4 text-xs sm:text-sm text-gray-300">
          🔒{' '}
          {lockedCount === 1
            ? copy.lockedNoteOne
            : copy.lockedNote.replace('{count}', String(lockedCount))}{' '}
          <Link href="/abbonamento" className="text-blue-400 hover:text-blue-300 transition-colors">
            {copy.lockedCta}
          </Link>
        </p>
      )}

      {/* `scroll-mt-20` clears the sticky mobile header that the smooth scroll
          would otherwise slide this heading under — the same offset the home
          page's section anchors use. */}
      <div ref={resultsRef} className="scroll-mt-20">
        {!selected && <p className="text-center py-8 text-white">{copy.prompt}</p>}

        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {crest(selected, 'w-10 h-10')}
              <div>
                <h3 className="text-lg sm:text-xl font-semibold text-white">
                  {copy.tableHeading.replace('{region}', selected.name)}
                </h3>
                <p className="text-sm">
                  {counts(tallies[selected.id], 'words', false)}
                  {tallies[selected.id].total > 0 && (
                    <>
                      <span className="text-gray-500"> · </span>
                      <span className="text-gray-300">{totalLabel(regionData.length)}</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            {regionData.length > 0 ? (
              <>
                {/* No locked rows here: the blurred skeleton speaks for the
                    whole country and would read as a claim about this region. */}
                <Table data={regionData} />

                <div>
                  <h4 className="text-base sm:text-lg font-semibold text-white mb-2">
                    {copy.mapHeading.replace('{region}', selected.name)}
                  </h4>
                  {/* `selected.bounds` comes straight out of the REGIONS
                      constant, so it is referentially stable and the map's
                      framing effect runs on a change of region and not on
                      every repaint. */}
                  <MapView data={regionData} focusBounds={selected.bounds} />
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-white">{copy.empty}</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
