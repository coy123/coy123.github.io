'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import Table from './Table'
import { TableData } from '@/types'
import { getTranslations } from '@/lib/translations'

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
}

export default function HomeContent({ data }: HomeContentProps) {
  const [activeTab, setActiveTab] = useState<'table' | 'map'>('table')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchExpanded, setSearchExpanded] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const t = getTranslations()

  useEffect(() => {
    if (searchExpanded) {
      searchInputRef.current?.focus()
    }
  }, [searchExpanded])

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
          {(['table', 'map'] as const).map((tab) => (
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
            <Table data={filteredData} />
          ) : (
            <div className="text-center py-8 text-white">
              {t.dashboard.search.noResults}
            </div>
          )}
        </div>
      )}

      {activeTab === 'map' && <MapView data={data} />}
    </div>
  )
}
