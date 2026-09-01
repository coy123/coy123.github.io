'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface BidDetailMapProps {
  latitude: number
  longitude: number
  location: string
}

export default function BidDetailMap({ latitude, longitude, location }: BidDetailMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return

    const map = L.map(mapContainerRef.current, {
      center: [latitude, longitude],
      zoom: 12,
      scrollWheelZoom: false,
      attributionControl: false,
      zoomControl: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map)

    L.circleMarker([latitude, longitude], {
      radius: 10,
      color: '#3b82f6',
      weight: 2,
      fillColor: '#2563eb',
      fillOpacity: 0.9,
    })
      // Same content shell as the home map's popups (components/MapView.tsx)
      // so the two read as one component; the dark chrome around them lives in
      // app/globals.css. `font-sans` overrides the family Leaflet puts on
      // `.leaflet-container`.
      .bindPopup(
        `<div class="font-sans text-gray-200"><div class="font-semibold text-white pr-3">${location}</div></div>`,
        { minWidth: 180, maxWidth: 280 }
      )
      .addTo(map)

    mapInstanceRef.current = map
  }, [latitude, longitude, location])

  return (
    <div className="w-full rounded-lg overflow-hidden border border-gray-600">
      <div ref={mapContainerRef} className="h-[250px] w-full" />
    </div>
  )
}
