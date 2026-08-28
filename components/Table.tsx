'use client'

import React, { useState, useEffect } from 'react'
import { TableData } from '@/types'
import { getTranslations } from '@/lib/translations'
import { toSlug } from '@/lib/slug'
import { CREST_EAGER_ROWS, CREST_SIZE_TABLE, crestUrl } from '@/lib/crest'
import { currentDay, hasExpired } from '@/lib/embargo'
import LockedRows from './LockedRows'

interface TableRowProps {
  data: TableData
  /**
   * Today as an Italian calendar day, or null until the mount effect below
   * has one. A day rather than a timestamp because that is what decides open
   * or closed everywhere else — see `hasExpired` in lib/embargo.ts.
   */
  today: string | null
  /** Position in the sorted list, used to decide crest loading priority. */
  index: number
}

const formatDate = (dateString: string, locale: string = 'it-IT') => {
  const date = new Date(dateString)
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const formatAmount = (amount: number) => {
  return new Intl.NumberFormat('de-DE').format(amount)
}

const TableRow: React.FC<TableRowProps> = ({ data, today, index }) => {
  const t = getTranslations()
  const locale = 'it-IT'
  const isAboveTheFold = index < CREST_EAGER_ROWS
  const isDeadlineUpcoming = today !== null ? !hasExpired(data.deadline, today) : null
  const backgroundClass = isDeadlineUpcoming === null ? 'bg-gray-900/20' : isDeadlineUpcoming ? 'bg-green-900/40' : 'bg-gray-900/20'
  const hoverBackgroundClass = isDeadlineUpcoming ? 'hover:bg-green-800' : 'hover:bg-gray-600'

  return (
    <div className={`flex items-center border-b border-gray-600 ${hoverBackgroundClass} transition-colors min-h-[4.5rem] ${backgroundClass}`}>
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
        <a
          href={`/bandi/${toSlug(data.location)}`}
          className="text-blue-400 hover:text-blue-300 break-words text-center sm:text-left transition-colors"
        >
          {data.location}
        </a>
      </div>

      <div className="p-2 w-14 sm:w-24 flex justify-center sm:justify-end">
        <p className="text-green-400 text-center sm:text-right">{formatAmount(data.amount)}</p>
      </div>

      <div className="p-2 w-20 sm:w-28 flex justify-center">
        <p className="text-sm text-gray-300 text-center">{formatDate(data.deadline, locale)}</p>
      </div>

      <div className="p-2 w-14 sm:w-24 flex justify-center">
        <a
          href={`/bandi/${toSlug(data.location)}`}
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

interface TableProps {
  data: TableData[]
  /**
   * How many bandi are being held back by the release delay (lib/data.ts).
   * Rendered as blurred placeholder rows above the real ones — only the
   * number crosses over, never the rows themselves.
   */
  lockedCount?: number
  /** Days until the first of those bandi goes public (lib/embargo.ts). */
  lockedNextInDays?: number | null
}

const Table: React.FC<TableProps> = ({ data, lockedCount = 0, lockedNextInDays = null }) => {
  const t = getTranslations()
  // Deferred to the client for the usual reason (an SSR/CSR date mismatch),
  // and held as a calendar day so a bando expiring *today* still reads as
  // open — the same boundary the embargo and the newsletter use.
  const [today, setToday] = useState<string | null>(null)

  useEffect(() => {
    setToday(currentDay())
  }, [])

  const sortedData = React.useMemo(() => {
    return [...data].sort((a, b) => {
      const deadlineA = new Date(a.deadline).getTime()
      const deadlineB = new Date(b.deadline).getTime()
      return deadlineB - deadlineA
    })
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

        <div className="p-2 w-14 sm:w-24 flex items-center justify-end">
          <span className="sm:hidden text-base text-green-400" aria-hidden>#</span>
          <span className="hidden sm:inline text-green-400 text-center sm:text-right">{t.table.headers.amount}</span>
        </div>

        <div className="p-2 w-20 sm:w-28 flex items-center justify-center">
          <span className="sm:hidden text-base text-gray-300" aria-hidden>📅</span>
          <span className="hidden sm:inline text-gray-300 text-right">{t.table.headers.deadline}</span>
        </div>

        <div className="p-2 w-14 sm:w-24 flex items-center sm:justify-center">
          <span className="sm:hidden text-base" aria-hidden>🔗</span>
          <span className="hidden sm:inline text-gray-200">{t.table.headers.view}</span>
        </div>
      </div>

      {/* Above the rows, because the withheld bandi are the newest ones and
          this is where the descending-deadline sort would put them. */}
      <LockedRows count={lockedCount} nextInDays={lockedNextInDays} />

      <div className="divide-y divide-gray-600">
        {sortedData.map((row, index) => (
          <TableRow key={index} data={row} today={today} index={index} />
        ))}
      </div>
    </div>
  )
}

export default Table
