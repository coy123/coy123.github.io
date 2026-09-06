/**
 * How a bando is drawn on the map: how big the dot is, what colour, and when
 * nearby dots are rolled up into one per region.
 *
 * **This module imports nothing**, for the same reason `lib/embargo.ts` and
 * `lib/regions.ts` import nothing: `cypress/support/site.ts` loads it under
 * plain Node, whose loader resolves no `@/` aliases. It is also where every
 * number the map uses is pinned, so `test/map-markers.test.ts` can check the
 * scale against the real dataset without a browser.
 */

/* ------------------------------------------------------------------ */
/* Size                                                                */
/* ------------------------------------------------------------------ */

/**
 * A one-licence bando still has to be tappable. 6px of radius is a 12px dot,
 * and Leaflet's hit area is a little more generous than the paint.
 */
export const MARKER_MIN_RADIUS = 6

/**
 * And a big one must not eat the map. Milano's bando is 450 licences against a
 * median of 3; drawn to scale it would cover most of Lombardia, which is the
 * whole reason this is a clamp and not a formula.
 */
export const MARKER_MAX_RADIUS = 18

/** Tuned so the crowded part of the dataset — 1 to ~40 licences — spreads out. */
const RADIUS_BASE = 4
const RADIUS_STEP = 1.8

/**
 * Radius in **pixels** for a bando of `amount` licences.
 *
 * The square root is the point: a circle is read by its area, so a radius
 * proportional to the count squares the difference and a 450-licence bando
 * looks 450× bigger than it is. `√amount` makes the *area* proportional
 * instead, which is what the eye actually compares.
 *
 * Then it is clamped at both ends. The ceiling saturates everything past
 * ~70 licences — three bandi in the current dataset — so the exact number is
 * carried by the tooltip and the popup, not by the last pixel of radius.
 *
 * Pixels, not metres: `L.circleMarker` sizes in screen space, so a dot keeps
 * its meaning as the reader zooms. `L.circle` would grow with the map and turn
 * Milano into a region at zoom 10.
 */
export const markerRadius = (amount: number): number => {
  const licences = Number.isFinite(amount) && amount > 0 ? amount : 1
  const scaled = RADIUS_BASE + RADIUS_STEP * Math.sqrt(licences)
  // Whole pixels, because that is what gets drawn: Leaflet's SVG renderer does
  // `Math.round(radius)` before it writes the arc. Rounding here instead means
  // the number this function returns is the number on screen, which is what
  // `cypress/e2e/bids-map.cy.ts` compares a real marker against.
  return Math.min(MARKER_MAX_RADIUS, Math.max(MARKER_MIN_RADIUS, Math.round(scaled)))
}

/* ------------------------------------------------------------------ */
/* Colour                                                              */
/* ------------------------------------------------------------------ */

/**
 * Green for open, **grey** for closed — not red.
 *
 * Two reasons, and the second is the one that matters. The table paints a
 * scaduto row grey (`bg-gray-900/20`) and the map used to paint it red, so the
 * two views taught different colours for one fact. And green against red is
 * the classic pair for a colour-vision deficiency: green against grey is a
 * difference in lightness and in saturation, which survives it.
 *
 * The closed markers are also deliberately quieter — thinner stroke, lower
 * fill — so a dense archive recedes behind the handful of bandi somebody can
 * still apply to.
 */
export const MARKER_STYLE = {
  open: {
    color: '#22c55e',
    fillColor: '#16a34a',
    weight: 2,
    fillOpacity: 0.9,
  },
  closed: {
    color: '#9ca3af',
    fillColor: '#6b7280',
    weight: 1,
    fillOpacity: 0.55,
  },
} as const

/**
 * The cluster bubble. A deep fill so the white count inside it stays readable,
 * and a **ring that carries the one fact the country view must not lose**:
 * green means at least one bando in that region is still open, grey means the
 * whole group is archive. Without it, rolling the markers up would answer
 * "how many" and drop "can I apply?", which is the question the page exists
 * for.
 */
export const CLUSTER_STYLE = {
  withOpen: {
    color: '#22c55e',
    fillColor: '#1e3a8a',
    weight: 3,
    fillOpacity: 0.85,
  },
  allClosed: {
    color: '#9ca3af',
    fillColor: '#374151',
    weight: 2,
    fillOpacity: 0.75,
  },
} as const

/* ------------------------------------------------------------------ */
/* Clustering                                                          */
/* ------------------------------------------------------------------ */

/**
 * Below this zoom the country map rolls its bandi up into one bubble per
 * region. At the zoom the whole of Italy fits in (5 or 6, depending on the
 * viewport) the dataset has 64 pairs of markers closer together than their own
 * diameter, and proportional sizing makes that worse, not better — the
 * northern comuni become one green-grey smear.
 *
 * 7 is where the peninsula stops fitting on screen anyway, so by the time the
 * bubbles break apart the reader has already chosen a part of the country.
 *
 * **Set this to 0 to turn clustering off**; nothing else has to change.
 */
export const CLUSTER_BELOW_ZOOM = 7

export const CLUSTER_MIN_RADIUS = 14
export const CLUSTER_MAX_RADIUS = 28

/**
 * Radius for a bubble standing in for `bandi` bandi. Same √ reasoning as
 * `markerRadius`, over a narrower range: a cluster is a label with a circle
 * around it, and the number inside it is the precise answer.
 */
export const clusterRadius = (bandi: number): number => {
  const count = Number.isFinite(bandi) && bandi > 0 ? bandi : 1
  const scaled = 10 + 2.4 * Math.sqrt(count)
  return Math.min(CLUSTER_MAX_RADIUS, Math.max(CLUSTER_MIN_RADIUS, Math.round(scaled)))
}

/* ------------------------------------------------------------------ */
/* Renderer                                                            */
/* ------------------------------------------------------------------ */

/**
 * Past this many markers Leaflet is asked to paint into a `<canvas>` instead
 * of one SVG `<path>` per bando. At 102 markers SVG is comfortable and keeps
 * every dot a real DOM node — which is what `cypress/support/selectors.ts` →
 * `mapMarker` selects, so **the map specs stop working the day this trips**.
 * That is deliberate: a dataset five times the current size is a change worth
 * noticing, and `cypress/README.md` records what to do about it.
 */
export const CANVAS_MARKER_THRESHOLD = 500

/* ------------------------------------------------------------------ */
/* Coincident points                                                   */
/* ------------------------------------------------------------------ */

/**
 * Two bandi at the exact same coordinates draw one on top of the other, and
 * the one underneath can never be clicked. Nothing in `data/data.json` is
 * exactly coincident today — but a province-level row and a comune row, or the
 * same comune posting twice, would be, and the failure is silent.
 *
 * The nudge is a few metres: enough to separate the hit areas, far too little
 * to move a marker off its comune.
 */
const NUDGE_DEGREES = 0.0012

/**
 * Spreads any group of exactly-coincident points evenly around a tiny circle,
 * and returns every point's drawing position. Points that are already unique
 * come back untouched.
 */
export const spreadCoincident = <T extends { latitude: number; longitude: number }>(
  points: readonly T[]
): { point: T; latitude: number; longitude: number }[] => {
  const groups = new Map<string, T[]>()
  for (const point of points) {
    const key = `${point.latitude},${point.longitude}`
    const group = groups.get(key)
    if (group) group.push(point)
    else groups.set(key, [point])
  }

  return points.map((point) => {
    const group = groups.get(`${point.latitude},${point.longitude}`)!
    if (group.length === 1) {
      return { point, latitude: point.latitude, longitude: point.longitude }
    }
    const index = group.indexOf(point)
    const angle = (2 * Math.PI * index) / group.length
    return {
      point,
      latitude: point.latitude + NUDGE_DEGREES * Math.sin(angle),
      // Longitude degrees are shorter than latitude ones this far north, so the
      // ring comes out round rather than as a flattened ellipse.
      longitude: point.longitude + (NUDGE_DEGREES / Math.cos((point.latitude * Math.PI) / 180)) * Math.cos(angle),
    }
  })
}
