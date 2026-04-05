'use client'

import { useState, useEffect } from 'react'

interface CurrentDateProps {
  label: string
}

export default function CurrentDate({ label }: CurrentDateProps) {
  const [date, setDate] = useState<string | null>(null)

  useEffect(() => {
    setDate(new Date().toLocaleDateString('it-IT', { year: 'numeric', month: 'long', day: 'numeric' }))
  }, [])

  if (!date) return null

  return (
    <p className="text-xs text-gray-500 mb-2 text-right">
      {label}: {date}
    </p>
  )
}
