'use client'

import React, { useState, useEffect } from 'react'
import { TableData } from '@/types'
import { getTranslations } from '@/lib/translations'

interface TableRowProps {
  data: TableData
  now: number | null
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

const TableRow: React.FC<TableRowProps> = ({ data, now }) => {
  const t = getTranslations()
  const locale = 'it-IT'
  const isDeadlineUpcoming = now !== null ? new Date(data.deadline).getTime() >= now : null
  const backgroundClass = isDeadlineUpcoming === null ? 'bg-gray-900/20' : isDeadlineUpcoming ? 'bg-green-900/40' : 'bg-gray-900/20'
  const hoverBackgroundClass = isDeadlineUpcoming ? 'hover:bg-green-800' : 'hover:bg-gray-600'

  return (
    <div className={`flex items-center border-b border-gray-600 ${hoverBackgroundClass} transition-colors min-h-[4.5rem] ${backgroundClass}`}>
      <div className="p-2 w-16 sm:w-24 flex items-center justify-center">
        <img
          src={data.image}
          alt={`${t.table.headers.crest} ${data.location}`}
          className="w-8 h-8 rounded-full object-cover"
          loading="lazy"
          decoding="async"
        />
      </div>

      <div className="p-2 flex-1 min-w-[15ch] flex items-center justify-center sm:justify-start">
        <a
          href={`/bandi/${data.location.replace(/\s+/g, '-')}`}
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
          href={`/bandi/${data.location.replace(/\s+/g, '-')}`}
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
}

const Table: React.FC<TableProps> = ({ data }) => {
  const t = getTranslations()
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    setNow(Date.now())
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

      <div className="divide-y divide-gray-600">
        {sortedData.map((row, index) => (
          <TableRow key={index} data={row} now={now} />
        ))}
      </div>
    </div>
  )
}

export default Table
