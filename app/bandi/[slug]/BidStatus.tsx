'use client'

import { useState, useEffect } from 'react'

interface BidStatusProps {
  deadline: string
  activeLabel: string
  expiredLabel: string
}

export default function BidStatus({ deadline, activeLabel, expiredLabel }: BidStatusProps) {
  const [isActive, setIsActive] = useState<boolean | null>(null)

  useEffect(() => {
    setIsActive(new Date(deadline).getTime() >= Date.now())
  }, [deadline])

  if (isActive === null) {
    return <p className="text-lg font-semibold text-gray-400">—</p>
  }

  return (
    <p className={`text-lg font-semibold ${isActive ? 'text-green-400' : 'text-red-400'}`}>
      {isActive ? activeLabel : expiredLabel}
    </p>
  )
}
