'use client'

import dynamic from 'next/dynamic'

const BidDetailMap = dynamic(() => import('./BidDetailMap'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[250px] bg-gray-700 rounded-lg border border-gray-600">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  ),
})

interface BidDetailMapWrapperProps {
  latitude: number
  longitude: number
  location: string
}

export default function BidDetailMapWrapper({ latitude, longitude, location }: BidDetailMapWrapperProps) {
  return <BidDetailMap latitude={latitude} longitude={longitude} location={location} />
}
