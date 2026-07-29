'use client'

import React from 'react'
import { LawData } from '@/types'
import { getTranslations } from '@/lib/translations'
import { CREST_EAGER_ROWS, CREST_SIZE_TABLE, crestUrl } from '@/lib/crest'

interface LawsTableRowProps {
  data: LawData
  /** Position in the sorted list, used to decide crest loading priority. */
  index: number
}

const LawsTableRow: React.FC<LawsTableRowProps> = ({ data, index }) => {
  const t = getTranslations()
  const isAboveTheFold = index < CREST_EAGER_ROWS

  return (
    <div className="flex items-center border-b border-gray-600 hover:bg-gray-600 transition-colors min-h-[4.5rem] bg-gray-900/20">
      <div className="p-2 w-16 sm:w-24 flex items-center justify-center">
        <img
          src={crestUrl(data.image, CREST_SIZE_TABLE)}
          alt={`${t.table.headers.crest} ${data.location}`}
          className="w-8 h-8 rounded-full object-cover"
          width={32}
          height={32}
          loading={isAboveTheFold ? 'eager' : 'lazy'}
          decoding="async"
        />
      </div>

      <div className="p-2 flex-1 min-w-[15ch] flex items-center justify-center sm:justify-start">
        <p className="text-white break-words text-center sm:text-left">{data.location}</p>
      </div>

      <div className="p-2 w-24 sm:w-32 flex justify-center">
        <a
          href={data.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors w-full sm:w-auto"
          aria-label={t.table.headers.view}
        >
          <span className="sm:hidden" aria-hidden>
            🔍
          </span>
          <span className="hidden sm:inline">
            {t.table.headers.view}
          </span>
        </a>
      </div>
    </div>
  )
}

interface LawsTableProps {
  data: LawData[]
}

const LawsTable: React.FC<LawsTableProps> = ({ data }) => {
  const t = getTranslations()

  const sortedData = React.useMemo(() => {
    return [...data].sort((a, b) => a.location.localeCompare(b.location))
  }, [data])

  return (
    <div className="w-full bg-gray-700 rounded-lg shadow-md overflow-hidden">
      <div className="flex items-center bg-gray-600 border-b border-gray-500 font-semibold text-gray-200 text-xs sm:text-sm">
        <div className="p-2 w-16 sm:w-24 flex items-center sm:justify-center">
          <span className="sm:hidden text-base" aria-hidden>🛡️</span>
          <span className="hidden sm:inline text-gray-200">{t.table.headers.crest}</span>
        </div>

        <div className="p-2 flex-1 min-w-[15ch] flex items-center justify-center sm:justify-start">
          <span className="sm:hidden text-base" aria-hidden>📍</span>
          <span className="hidden sm:inline text-gray-200">{t.table.headers.location}</span>
        </div>

        <div className="p-2 w-24 sm:w-32 flex items-center sm:justify-center">
          <span className="sm:hidden text-base" aria-hidden>🔗</span>
          <span className="hidden sm:inline text-gray-200">{t.table.headers.view}</span>
        </div>
      </div>

      <div className="divide-y divide-gray-600">
        {sortedData.map((row, index) => (
          <LawsTableRow key={index} data={row} index={index} />
        ))}
      </div>
    </div>
  )
}

export default LawsTable
