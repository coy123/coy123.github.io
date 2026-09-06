'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import Table from './Table'
import RegionsContent from './RegionsContent'
import { TableData } from '@/types'
import { getTranslations } from '@/lib/translations'
import { currentDay } from '@/lib/embargo'

/**
 * The "NUOVO" flag on the Regioni tab stops showing on this Italian calendar
 * day. It is a launch marker, not a feature: once it lapses, delete this
 * constant, `showNewBadge`, the two `<span>`s that render it, the
 * `dashboard.tabs.regionsNew*` strings in locales/it.json and the
 * `.tab-new-badge` rules in app/globals.css. Nothing else depends on it.
 */
const REGIONS_BADGE_UNTIL = '2026-11-01'

const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-[360px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
    </div>
  ),
})

interface HomeContentProps {
  data: TableData[]
  /**
   * How many bandi the release delay is holding back (lib/data.ts). The rows
   * themselves stay on the server; only this number is ever sent to a client.
   */
  lockedCount?: number
  /** Days until the first of them is released (lib/embargo.ts). */
  lockedNextInDays?: number | null
}

export default function HomeContent({
  data,
  lockedCount = 0,
  lockedNextInDays = null,
}: HomeContentProps) {
  const [activeTab, setActiveTab] = useState<'table' | 'map' | 'regions'>('table')
  const [searchQuery, setSearchQuery] = useState('')
  // Held here, not inside RegionsContent, so switching to the map and back
  // does not throw the chosen region away — same reason `searchQuery` lives at
  // this level. The tab itself unmounts; this does not.
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null)
  const [searchExpanded, setSearchExpanded] = useState(false)
  // Resolved after hydration, not during render: this component *is* in the
  // server-rendered tree, so comparing the date at render time would compare a
  // build-time day on the server against the reader's day in the browser and
  // mismatch on the first day after the badge lapses. Same dance as
  // CurrentDate.tsx, for the same reason.
  const [showNewBadge, setShowNewBadge] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const t = getTranslations()
  const locked = t.dashboard.locked

  useEffect(() => {
    if (searchExpanded) {
      searchInputRef.current?.focus()
    }
  }, [searchExpanded])

  useEffect(() => {
    setShowNewBadge(currentDay() < REGIONS_BADGE_UNTIL)
  }, [])

  const filteredData = useMemo(() => {
    const trimmedQuery = searchQuery.trim()
    if (trimmedQuery.length === 0) {
      return data
    }

    const lowerQuery = trimmedQuery.toLowerCase()
    return data.filter((item) =>
      item.location.toLowerCase().includes(lowerQuery)
    )
  }, [data, searchQuery])

  // Hidden while a search is running: sitting on top of filtered results, the
  // block would read as "some of your matches are covered", which is a claim it
  // cannot make — the withheld bandi are never matched against the query.
  const visibleLockedCount = searchQuery.trim().length > 0 ? 0 : lockedCount

  return (
    <div className="bg-gray-700 rounded-lg shadow-sm p-2 sm:p-6">
      {/* Mobile Tab Bar with integrated search */}
      <div className="sm:hidden mb-2">
        <div className="w-full rounded-lg bg-gray-800 p-1 flex">
          <button
            type="button"
            onClick={() => { setSearchExpanded(false); setActiveTab('table'); }}
            className={`transition-all duration-300 ease-in-out overflow-hidden px-2 py-1.5 text-sm font-medium rounded-md whitespace-nowrap ${
              searchExpanded ? 'flex-[1]' : 'flex-[4]'
            } ${!searchExpanded && activeTab === 'table' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-300'}`}
          >
            {searchExpanded ? '📋' : t.dashboard.tabs.table}
          </button>
          <button
            type="button"
            onClick={() => { setSearchExpanded(false); setActiveTab('map'); }}
            className={`transition-all duration-300 ease-in-out overflow-hidden px-2 py-1.5 text-sm font-medium rounded-md whitespace-nowrap ${
              searchExpanded ? 'flex-[1]' : 'flex-[4]'
            } ${!searchExpanded && activeTab === 'map' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-300'}`}
          >
            {searchExpanded ? '🗺️' : t.dashboard.tabs.map}
          </button>
          <button
            type="button"
            onClick={() => { setSearchExpanded(false); setActiveTab('regions'); }}
            className={`transition-all duration-300 ease-in-out overflow-hidden px-2 py-1.5 text-sm font-medium rounded-md whitespace-nowrap ${
              searchExpanded ? 'flex-[1]' : 'flex-[4]'
            } ${!searchExpanded && activeTab === 'regions' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-300'}`}
          >
            {searchExpanded ? (
              '🇮🇹'
            ) : (
              <>
                {t.dashboard.tabs.regions}
                {/* A dot rather than the word: four labels plus "NUOVO" do not
                    fit a 360px tab bar, and responsive.cy.ts fails the page
                    the moment they overflow it. */}
                {showNewBadge && (
                  <span
                    className="tab-new-badge tab-new-dot ml-1 align-middle"
                    role="img"
                    aria-label={t.dashboard.tabs.regionsNewLabel}
                  />
                )}
              </>
            )}
          </button>
          {/* Not a <button>: this is the search field itself once expanded, and
              a text input inside a button is not a thing. `sel.mobileSearchToggle`
              in cypress/support/selectors.ts is anchored on exactly that — the
              one plain <div> among the tab buttons. */}
          <div
            onClick={() => { if (!searchExpanded) { setSearchExpanded(true); setActiveTab('table'); } }}
            className={`transition-all duration-300 ease-in-out overflow-hidden px-2 py-1.5 text-sm font-medium rounded-md flex items-center justify-center ${
              searchExpanded ? 'flex-[8] ring-2 ring-blue-600 bg-gray-800' : 'flex-[2] cursor-pointer text-gray-300'
            }`}
          >
            {searchExpanded ? (
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.dashboard.search.placeholder}
                className="w-full bg-transparent text-white text-sm focus:outline-none placeholder-gray-400"
              />
            ) : (
              <span>🔍</span>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Tab Bar */}
      <div className="hidden sm:block mb-4">
        <div className="w-full rounded-lg bg-gray-800 p-1 flex">
          {(['table', 'map', 'regions'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              {t.dashboard.tabs[tab]}
              {tab === 'regions' && showNewBadge && (
                <span className="tab-new-badge ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider align-middle">
                  {t.dashboard.tabs.regionsNew}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {activeTab === 'table' && (
        <div className="w-full">
          {/* Search Bar - desktop only */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.dashboard.search.placeholder}
            className="hidden sm:block w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
          />

          {/* Table */}
          {filteredData.length > 0 ? (
            <Table
              data={filteredData}
              lockedCount={visibleLockedCount}
              lockedNextInDays={lockedNextInDays}
            />
          ) : (
            <div className="text-center py-8 text-white">
              {t.dashboard.search.noResults}
            </div>
          )}
        </div>
      )}

      {activeTab === 'map' && (
        <div className="w-full">
          <MapView data={data} />
          {/* No blurred marker equivalent: a pin with no location is just a
              pin in the sea. The map says it in one line instead. */}
          {lockedCount > 0 && (
            <p className="mt-3 text-xs sm:text-sm text-gray-300">
              🔒{' '}
              {lockedCount === 1
                ? locked.mapNoteOne
                : locked.mapNote.replace('{count}', String(lockedCount))}{' '}
              <Link href="/abbonamento" className="text-blue-400 hover:text-blue-300 transition-colors">
                {locked.mapCta}
              </Link>
            </p>
          )}
        </div>
      )}

      {activeTab === 'regions' && (
        <RegionsContent
          data={data}
          lockedCount={lockedCount}
          selectedId={selectedRegionId}
          onSelect={setSelectedRegionId}
        />
      )}
    </div>
  )
}
