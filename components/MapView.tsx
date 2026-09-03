'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import { TableData } from '@/types'
import { getTranslations } from '@/lib/translations'
import { toSlug } from '@/lib/slug'
import { currentDay, hasExpired } from '@/lib/embargo'
import 'leaflet/dist/leaflet.css'

interface MapViewProps {
  data: TableData[]
}

type WithCoordinates = TableData & { latitude: number; longitude: number }

/**
 * `bindPopup()` takes a raw HTML string, so anything interpolated into it is
 * markup, not text. `item.location` is the only free text that reaches it —
 * every other value in the popup is a number, a date or a translation constant.
 *
 * `data/data.json` is curated by hand, so this guards nothing that is loose
 * today; it is here for the same reason as `lib/jsonLd.ts`, one level down.
 */
const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

export default function MapView({ data }: MapViewProps) {
  const t = getTranslations()
  const locale = 'it-IT'
  const numberFormatter = useMemo(() => new Intl.NumberFormat('de-DE'), [])
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markersLayerRef = useRef<L.LayerGroup | null>(null)

  const markers = useMemo(
    () =>
      data.filter(
        (item): item is WithCoordinates =>
          typeof item.latitude === 'number' && typeof item.longitude === 'number'
      ),
    [data]
  )

  const positions = useMemo(() => markers.map((item) => L.latLng(item.latitude, item.longitude)), [markers])
  // Today as an Italian calendar day, resolved on the client to avoid an
  // SSR/CSR mismatch. A day rather than a timestamp so a bando keeps its green
  // marker for the whole of its scadenza — the same boundary the table, the
  // detail page, the newsletter and the embargo all use (lib/embargo.ts).
  const [today, setToday] = useState<string | null>(null)

  useEffect(() => {
    setToday(currentDay())
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
    // `today` is null until the mount effect above sets it. Painting during
    // that first pass would draw every marker as expired and then throw all of
    // them away on the next commit — a visible flash of red, and a window where
    // a click lands on a node that is about to be detached, so Leaflet never
    // opens its popup. Wait for the real date and paint once.
    if (!mapInstanceRef.current || !markersLayerRef.current || today === null) {
      return
    }

    const layer = markersLayerRef.current
    layer.clearLayers()

    markers.forEach((item) => {
      const isFutureDeadline = !hasExpired(item.deadline, today)
      const marker = L.circleMarker([item.latitude, item.longitude], {
        radius: 8,
        color: isFutureDeadline ? '#22c55e' : '#f87171',
        weight: 2,
        fillColor: isFutureDeadline ? '#16a34a' : '#dc2626',
        fillOpacity: 0.9,
        className: 'shadow-sm',
      })
      // The marker colour already says open or closed; the popup now says it
      // in words, from the same `hasExpired()` answer that painted the marker.
      // There is exactly one deadline comparison per marker — see CLAUDE.md,
      // "One rule for scaduto".
      const statusLabel = isFutureDeadline
        ? t.pages.bidDetail.labels.active
        : t.pages.bidDetail.labels.expired
      // Written out twice in full rather than assembled from parts: Tailwind's
      // JIT only emits a class it can see as a complete literal in the source.
      const statusClass = isFutureDeadline
        ? 'inline-flex items-center rounded-full border border-green-500/40 bg-green-900/50 px-2 py-0.5 text-xs font-semibold text-green-300'
        : 'inline-flex items-center rounded-full border border-red-500/40 bg-red-900/40 px-2 py-0.5 text-xs font-semibold text-red-300'

      // The popup chrome (surface, border, tip, close button) is styled in
      // app/globals.css; these utilities only dress the content. `font-sans`
      // is load-bearing: Leaflet sets its own family on `.leaflet-container`,
      // which the popup would otherwise inherit. No `<p>` here either —
      // `.leaflet-popup-content p` carries a 1.3em margin that out-specifies
      // any utility on the same element.
      const popupContent = `
        <div class="font-sans text-gray-200">
          <div class="font-semibold text-white pr-3">${escapeHtml(item.location)}</div>
          <div class="mt-1.5"><span class="${statusClass}">${statusLabel}</span></div>
          <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span><span class="text-gray-400">${t.table.headers.amount}:</span> <strong class="font-semibold text-green-400">${numberFormatter.format(item.amount)}</strong></span>
            <span><span class="text-gray-400">${t.table.headers.deadline}:</span> <strong class="font-semibold text-gray-100">${new Date(item.deadline).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })}</strong></span>
          </div>
          <a href="/bandi/${toSlug(item.location)}/" class="mt-2.5 inline-flex items-center gap-1 font-medium text-blue-400 hover:text-blue-300 transition-colors">
            ${t.table.headers.view} →
          </a>
        </div>
      `
      marker.bindPopup(popupContent, { minWidth: 220, maxWidth: 280 })
      marker.addTo(layer)
    })
  }, [markers, numberFormatter, locale, t, today])

  return (
    <div className="w-full rounded-lg overflow-hidden border border-gray-600">
      <div ref={mapContainerRef} className="h-[420px] sm:h-[360px] w-full" />
    </div>
  )
}
