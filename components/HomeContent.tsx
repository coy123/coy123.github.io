'use client'

import { useState, useMemo } from 'react'
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
  const t = getTranslations()

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
    <div className="bg-gray-700 rounded-lg shadow-sm p-4 sm:p-6">
      {/* Tab Buttons */}
      <div className="mb-4">
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
          {/* Search Bar */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.dashboard.search.placeholder}
            className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
          />

          {/* Table */}
          {filteredData.length > 0 ? (
            <Table data={filteredData} />
          ) : (
            <div className="text-center py-8 text-gray-400">
              {t.dashboard.search.noResults}
            </div>
          )}
        </div>
      )}

      {activeTab === 'map' && <MapView data={data} />}
    </div>
  )
}
