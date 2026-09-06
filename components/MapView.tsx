'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import { TableData } from '@/types'
import { getTranslations } from '@/lib/translations'
import { toSlug } from '@/lib/slug'
import { currentDay, hasExpired } from '@/lib/embargo'
import { RegionBounds, Region, regionOf } from '@/lib/regions'
import {
  CANVAS_MARKER_THRESHOLD,
  CLUSTER_BELOW_ZOOM,
  CLUSTER_STYLE,
  MARKER_STYLE,
  clusterRadius,
  markerRadius,
  spreadCoincident,
} from '@/lib/mapMarkers'
import 'leaflet/dist/leaflet.css'

interface MapViewProps {
  data: TableData[]
  /**
   * Open framed on this box instead of on the markers — the regional view
   * passes the selected region's bounds, so the map is already zoomed into
   * Molise rather than into the one pin Molise happens to have.
   *
   * The box is a floor, not a cap: whatever markers exist are folded into it
   * before the fit, so a bando sitting outside its region's box (a rounded
   * coordinate on a border, an island trimmed out of the box on purpose —
   * see `REGIONS` in lib/regions.ts) is still on screen.
   *
   * Passing it also turns clustering off: a regional map that rolled its bandi
   * up into one bubble for that same region would say nothing at all.
   *
   * Pass a value that is referentially stable across renders — an entry from
   * `REGIONS`, not a fresh object literal — or the framing effect re-runs on
   * every repaint and restarts Leaflet's zoom animation.
   */
  focusBounds?: RegionBounds
}

type WithCoordinates = TableData & { latitude: number; longitude: number }

/** One region's bandi, rolled into the bubble that stands in for them. */
interface Cluster {
  region: Region
  latitude: number
  longitude: number
  bandi: number
  /** How many of them are still open — the bubble's ring colour. */
  open: number
  licences: number
}

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

export default function MapView({ data, focusBounds }: MapViewProps) {
  const t = getTranslations()
  const copy = t.dashboard.map
  const locale = 'it-IT'
  const numberFormatter = useMemo(() => new Intl.NumberFormat('de-DE'), [])
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  /**
   * Two layers, and the order they are added in is the whole point: Leaflet
   * paints in insertion order, so an expired bando for 300 licences would
   * otherwise be drawn over an open one for 2 sitting beside it and make the
   * only row a reader can still act on unclickable. Closed goes down first,
   * open on top, always.
   */
  const closedLayerRef = useRef<L.LayerGroup | null>(null)
  const openLayerRef = useRef<L.LayerGroup | null>(null)
  const clusterLayerRef = useRef<L.LayerGroup | null>(null)

  /**
   * Hides the archive, which is most of the dataset on most days. Off by
   * default: the archive is what the site is, and a map that opened already
   * filtered would understate it.
   */
  const [onlyOpen, setOnlyOpen] = useState(false)
  /**
   * The current zoom, mirrored into React state so the marker effect can react
   * to crossing the clustering threshold. Null until the map exists.
   */
  const [zoom, setZoom] = useState<number | null>(null)

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

  /** What actually gets drawn once the "solo aperti" filter has had its say. */
  const visible = useMemo(() => {
    if (!onlyOpen || today === null) return markers
    return markers.filter((item) => !hasExpired(item.deadline, today))
  }, [markers, onlyOpen, today])

  /**
   * Whether the country map is currently rolled up. Only ever true on the
   * country map — a regional map passes `focusBounds` and always draws comuni.
   */
  const clustered =
    !focusBounds && zoom !== null && zoom < CLUSTER_BELOW_ZOOM && visible.length > 1

  /** One bubble per region, placed on the mean of its own bandi, not on the
   *  region's geometric centre: the bubble should sit where the bandi are. */
  const clusters = useMemo<Cluster[]>(() => {
    if (!clustered) return []
    const byRegion = new Map<string, { region: Region; items: WithCoordinates[] }>()
    for (const item of visible) {
      const region = regionOf(item)
      if (!region) continue
      const bucket = byRegion.get(region.id)
      if (bucket) bucket.items.push(item)
      else byRegion.set(region.id, { region, items: [item] })
    }
    return [...byRegion.values()].map(({ region, items }) => ({
      region,
      latitude: items.reduce((sum, item) => sum + item.latitude, 0) / items.length,
      longitude: items.reduce((sum, item) => sum + item.longitude, 0) / items.length,
      bandi: items.length,
      open: items.filter((item) => today !== null && !hasExpired(item.deadline, today)).length,
      licences: items.reduce((sum, item) => sum + item.amount, 0),
    }))
  }, [clustered, visible, today])

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
      // One `<canvas>` instead of one SVG node per bando, once the dataset is
      // big enough for that to matter. See CANVAS_MARKER_THRESHOLD — it also
      // costs the map specs their per-marker selector, which is why the
      // threshold is far above today's 102.
      preferCanvas: markers.length > CANVAS_MARKER_THRESHOLD,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map)

    // Insertion order is the paint order — closed, then open, then clusters.
    closedLayerRef.current = L.layerGroup().addTo(map)
    openLayerRef.current = L.layerGroup().addTo(map)
    clusterLayerRef.current = L.layerGroup().addTo(map)

    map.on('zoomend', () => setZoom(map.getZoom()))
    setZoom(map.getZoom())

    mapInstanceRef.current = map
    // `markers.length` is read once, when the map is created; a dataset that
    // crosses the canvas threshold takes effect on the next mount, which for a
    // static export means the next build.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center])

  // Framing depends only on the data, so it runs once, before the markers
  // exist. Doing it inside the marker effect meant re-fitting on every repaint,
  // which restarted Leaflet's zoom animation and moved the markers under the
  // cursor mid-click.
  useEffect(() => {
    if (!mapInstanceRef.current) {
      return
    }

    if (focusBounds) {
      // The region's box first, then every marker folded in. `extend` mutates,
      // which is why the bounds object is built fresh here rather than hoisted.
      const bounds = L.latLngBounds(
        L.latLng(focusBounds.south, focusBounds.west),
        L.latLng(focusBounds.north, focusBounds.east)
      )
      positions.forEach((position) => bounds.extend(position))
      mapInstanceRef.current.fitBounds(bounds, { padding: [24, 24], maxZoom: 10 })
    } else if (positions.length) {
      mapInstanceRef.current.fitBounds(L.latLngBounds(positions), { padding: [24, 24], maxZoom: 8 })
    } else {
      mapInstanceRef.current.setView(center, 6)
    }
  }, [positions, center, focusBounds])

  useEffect(() => {
    // `today` is null until the mount effect above sets it. Painting during
    // that first pass would draw every marker as expired and then throw all of
    // them away on the next commit — a visible flash of grey, and a window
    // where a click lands on a node that is about to be detached, so Leaflet
    // never opens its popup. Wait for the real date and paint once.
    const map = mapInstanceRef.current
    const closedLayer = closedLayerRef.current
    const openLayer = openLayerRef.current
    const clusterLayer = clusterLayerRef.current
    if (!map || !closedLayer || !openLayer || !clusterLayer || today === null) {
      return
    }

    closedLayer.clearLayers()
    openLayer.clearLayers()
    clusterLayer.clearLayers()

    // Tooltips follow the pointer, so they are worth nothing on a touch screen
    // — there a tap belongs to the popup, and a tooltip would race it.
    const canHover = window.matchMedia?.('(hover: hover)').matches ?? false

    if (clustered) {
      clusters.forEach((cluster) => {
        const marker = L.circleMarker([cluster.latitude, cluster.longitude], {
          ...(cluster.open > 0 ? CLUSTER_STYLE.withOpen : CLUSTER_STYLE.allClosed),
          radius: clusterRadius(cluster.bandi),
        })
        // The count sits inside the bubble as a permanent tooltip rather than
        // a divIcon, so a cluster stays the same kind of DOM node as a bando
        // (`path.leaflet-interactive`) and the specs keep one selector.
        marker.bindTooltip(String(cluster.bandi), {
          permanent: true,
          direction: 'center',
          className: 'map-cluster-label',
        })
        const summary = (cluster.bandi === 1 ? copy.clusterTooltipOne : copy.clusterTooltip)
          .replace('{region}', cluster.region.name)
          .replace('{bandi}', String(cluster.bandi))
          .replace('{open}', String(cluster.open))
          .replace('{licences}', numberFormatter.format(cluster.licences))
        marker.bindPopup(`<div class="font-sans text-gray-200">${escapeHtml(summary)}</div>`, {
          minWidth: 180,
        })
        // Clicking a bubble opens it. That is the drill-down the reader needs
        // to discover, so it happens on the click itself and the popup is only
        // there for a tap that misses the zoom.
        marker.on('click', () => {
          const { south, west, north, east } = cluster.region.bounds
          map.fitBounds(L.latLngBounds(L.latLng(south, west), L.latLng(north, east)), {
            padding: [24, 24],
          })
        })
        marker.addTo(clusterLayer)
      })
      return
    }

    spreadCoincident(visible).forEach(({ point: item, latitude, longitude }) => {
      const isFutureDeadline = !hasExpired(item.deadline, today)
      const marker = L.circleMarker([latitude, longitude], {
        ...(isFutureDeadline ? MARKER_STYLE.open : MARKER_STYLE.closed),
        radius: markerRadius(item.amount),
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
        : 'inline-flex items-center rounded-full border border-gray-500/40 bg-gray-800/70 px-2 py-0.5 text-xs font-semibold text-gray-300'

      // Scanning the map should not mean opening 102 popups.
      if (canHover) {
        marker.bindTooltip(
          (item.amount === 1 ? copy.markerTooltipOne : copy.markerTooltip)
            .replace('{location}', item.location)
            .replace('{count}', numberFormatter.format(item.amount)),
          { direction: 'top', offset: [0, -4] }
        )
      }

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
      marker.addTo(isFutureDeadline ? openLayer : closedLayer)
    })
  }, [visible, clustered, clusters, numberFormatter, locale, t, copy, today])

  const emptied = onlyOpen && visible.length === 0 && markers.length > 0

  /**
   * How many bandi each choice would leave on the map. Null until the mount
   * effect has a date — both counts appear together on the next frame rather
   * than one of them popping in after the other.
   */
  const openCount = useMemo(
    () => (today === null ? null : markers.filter((item) => !hasExpired(item.deadline, today)).length),
    [markers, today]
  )

  /**
   * A segmented control in the tab bar's own style, not the checkbox this
   * started as. The checkbox was a line of small grey text above a 360px map
   * and readers went straight past it; a blue pill is the shape this site
   * already uses to say "this is the view you are on".
   */
  const filterButton = (label: string, count: number | null, active: boolean, next: boolean) => (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => setOnlyOpen(next)}
      className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
        active ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-300 hover:text-white'
      }`}
    >
      {label}
      {count !== null && <span className="ml-1 opacity-80">({numberFormatter.format(count)})</span>}
    </button>
  )

  return (
    <div className="w-full">
      <div
        className="map-filter mb-2 inline-flex rounded-lg bg-gray-800 p-1"
        role="group"
        aria-label={copy.filterLabel}
      >
        {filterButton(copy.filterAll, today === null ? null : markers.length, !onlyOpen, false)}
        {filterButton(copy.filterOpen, openCount, onlyOpen, true)}
      </div>

      <div className="w-full rounded-lg overflow-hidden border border-gray-600">
        <div ref={mapContainerRef} className="h-[420px] sm:h-[360px] w-full" />
      </div>

      {emptied && <p className="mt-2 text-xs sm:text-sm text-amber-300">{copy.noneOpen}</p>}

      {/* The legend earns its place only because the dots now differ in size as
          well as colour; before that there was nothing to explain. */}
      <div className="mt-2 map-legend flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-300">
        <span className="inline-flex items-center gap-1.5">
          <span className="map-legend-dot map-legend-open" aria-hidden />
          {copy.legendOpen}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="map-legend-dot map-legend-closed" aria-hidden />
          {copy.legendClosed}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="map-legend-dot map-legend-small" aria-hidden />
          <span className="map-legend-dot map-legend-large" aria-hidden />
          {copy.legendSize}
        </span>
      </div>
      {!focusBounds && (
        <p className="mt-1 text-xs text-gray-400">
          {copy.legendCluster} {copy.legendClusterOpen}
        </p>
      )}
    </div>
  )
}
