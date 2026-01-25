'use client'

import { useState, useMemo } from 'react'
import LawsTable from './LawsTable'
import { LawData } from '@/types'
import { getTranslations } from '@/lib/translations'

interface LawsContentProps {
  data: LawData[]
}

export default function LawsContent({ data }: LawsContentProps) {
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
        <LawsTable data={filteredData} />
      ) : (
        <div className="text-center py-8 text-gray-400">
          {t.dashboard.search.noResults}
        </div>
      )}
    </div>
  )
}
