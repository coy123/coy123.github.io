'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import { TableData } from '@/types'
import { getTranslations } from '@/lib/translations'
import { toSlug } from '@/lib/slug'
import 'leaflet/dist/leaflet.css'

interface MapViewProps {
  data: TableData[]
}

type WithCoordinates = TableData & { latitude: number; longitude: number }

export default function MapView({ data }: MapViewProps) {
  const t = getTranslations()
  const locale = 'it-IT'
  const numberFormatter = useMemo(() => new Intl.NumberFormat('de-DE'), [])
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersLayerRef = useRef<any>(null)

  const markers = useMemo(
    () =>
      data
        .filter((item): item is WithCoordinates => typeof item.latitude === 'number' && typeof item.longitude === 'number')
        .map((item) => ({
          ...item,
          deadlineTime: new Date(item.deadline).getTime(),
        })),
    [data]
  )

  const positions = useMemo(() => markers.map((item) => L.latLng(item.latitude, item.longitude)), [markers])
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    setNow(Date.now())
  }, [])
  const center = useMemo(() => L.latLng(41.8719, 12.5674), [])

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) {
      return
    }

    const map = L.map(mapContainerRef.current, {
      center,
      zoom: 6,
      scrollWheelZoom: true,
      attributionControl: false,
      zoomControl: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map)

    const markerLayer = L.layerGroup().addTo(map)

    mapInstanceRef.current = map
    markersLayerRef.current = markerLayer
  }, [center])

  // Framing depends only on the data, so it runs once, before the markers
  // exist. Doing it inside the marker effect meant re-fitting on every repaint,
  // which restarted Leaflet's zoom animation and moved the markers under the
  // cursor mid-click.
  useEffect(() => {
    if (!mapInstanceRef.current) {
      return
    }

    if (positions.length) {
      mapInstanceRef.current.fitBounds(L.latLngBounds(positions), { padding: [24, 24], maxZoom: 8 })
    } else {
      mapInstanceRef.current.setView(center, 6)
    }
  }, [positions, center])

  useEffect(() => {
    // `now` is null until the mount effect above sets it. Painting during that
    // first pass would draw every marker as expired and then throw all of them
    // away on the next commit — a visible flash of red, and a window where a
    // click lands on a node that is about to be detached, so Leaflet never
    // opens its popup. Wait for the real timestamp and paint once.
    if (!mapInstanceRef.current || !markersLayerRef.current || now === null) {
      return
    }

    const layer = markersLayerRef.current
    layer.clearLayers()

    markers.forEach((item) => {
      const isFutureDeadline = item.deadlineTime >= now
      const marker = L.circleMarker([item.latitude, item.longitude], {
        radius: 8,
        color: isFutureDeadline ? '#22c55e' : '#f87171',
        weight: 2,
        fillColor: isFutureDeadline ? '#16a34a' : '#dc2626',
        fillOpacity: 0.9,
        className: 'shadow-sm',
      })
      const popupContent = `
        <div class="text-sm text-gray-900">
          <p class="font-semibold mb-1">${item.location}</p>
          <div class="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-gray-700">
            <span><strong>${t.table.headers.amount}:</strong> ${numberFormatter.format(item.amount)}</span>
            <span><strong>${t.table.headers.deadline}:</strong> ${new Date(item.deadline).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
            <a href="/bandi/${toSlug(item.location)}" class="inline-flex items-center gap-1 text-blue-600 hover:underline">
              ${t.table.headers.view} →
            </a>
          </div>
        </div>
      `
      marker.bindPopup(popupContent, { minWidth: 220 })
      marker.addTo(layer)
    })
  }, [markers, numberFormatter, locale, t, now])

  return (
    <div className="w-full rounded-lg overflow-hidden border border-gray-600">
      <div ref={mapContainerRef} className="h-[420px] sm:h-[360px] w-full" />
    </div>
  )
}
