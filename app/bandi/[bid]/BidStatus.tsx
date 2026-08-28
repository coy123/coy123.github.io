'use client'

import { useState, useEffect } from 'react'

import { hasExpired } from '@/lib/embargo'

interface BidStatusProps {
  deadline: string
  activeLabel: string
  expiredLabel: string
}

export default function BidStatus({ deadline, activeLabel, expiredLabel }: BidStatusProps) {
  const [isActive, setIsActive] = useState<boolean | null>(null)

  // Italian calendar days, not instants: a bando is active for the whole of
  // its scadenza, not until midnight UTC of it. `hasExpired` is the same
  // function the table, the map, the newsletter and the embargo go through.
  useEffect(() => {
    setIsActive(!hasExpired(deadline))
  }, [deadline])

  if (isActive === null) {
    return <p className="text-lg font-semibold text-white">—</p>
  }

  return (
    <p className={`text-lg font-semibold ${isActive ? 'text-green-400' : 'text-red-400'}`}>
      {isActive ? activeLabel : expiredLabel}
    </p>
  )
}
