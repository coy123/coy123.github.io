/**
 * The map's drawing rules (lib/mapMarkers.ts): the size scale, the palette and
 * the coincident-point spread.
 *
 * Browser-less, because none of it needs a browser — it is arithmetic over
 * `data/data.json`. `cypress/e2e/bids-map.cy.ts` checks that Leaflet is
 * actually handed these numbers; this checks that the numbers are right.
 */
import test from 'node:test'
import assert from 'node:assert/strict'

import bidsJson from '../data/data.json' with { type: 'json' }
import {
  CANVAS_MARKER_THRESHOLD,
  CLUSTER_BELOW_ZOOM,
  CLUSTER_MAX_RADIUS,
  CLUSTER_MIN_RADIUS,
  CLUSTER_STYLE,
  MARKER_MAX_RADIUS,
  MARKER_MIN_RADIUS,
  MARKER_STYLE,
  clusterRadius,
  markerRadius,
  spreadCoincident,
} from '../lib/mapMarkers.ts'

const amounts = (bidsJson as { amount: number }[]).map((bid) => bid.amount)

/* ------------------------------------------------------------------ */
/* Size                                                                */
/* ------------------------------------------------------------------ */

test('never draws a dot too small to tap or big enough to cover a region', () => {
  for (const amount of [...amounts, 0, 1, 10_000]) {
    const radius = markerRadius(amount)
    assert.ok(radius >= MARKER_MIN_RADIUS, `${amount} licences → ${radius}px`)
    assert.ok(radius <= MARKER_MAX_RADIUS, `${amount} licences → ${radius}px`)
  }
})

test('grows with the licence count, and never shrinks', () => {
  let previous = 0
  for (let amount = 1; amount <= 600; amount += 1) {
    const radius = markerRadius(amount)
    assert.ok(radius >= previous, `${amount} licences is smaller than ${amount - 1}`)
    previous = radius
  }
})

test('scales the area, not the radius', () => {
  // Four times the licences should be about twice the radius, before the
  // clamps bite — that is what makes the *area* proportional, which is what
  // the eye compares. Measured away from both ends of the scale.
  const four = markerRadius(4) - MARKER_MIN_RADIUS + 1.6
  const sixteen = markerRadius(16) - MARKER_MIN_RADIUS + 1.6
  assert.ok(
    sixteen / four > 1.6 && sixteen / four < 2.4,
    `16 licences vs 4: ratio ${(sixteen / four).toFixed(2)}, expected about 2`
  )
})

test('separates the sizes the dataset actually holds', () => {
  // A median bando (3 licences) and a big one must not look alike. If this
  // fails, the scale has been flattened into decoration.
  assert.ok(
    markerRadius(40) - markerRadius(3) >= 4,
    `3 → ${markerRadius(3)}px, 40 → ${markerRadius(40)}px`
  )
  assert.equal(markerRadius(450), MARKER_MAX_RADIUS, 'Milano is capped, not drawn to scale')
})

test('treats a missing or nonsensical amount as one licence', () => {
  assert.equal(markerRadius(0), markerRadius(1))
  assert.equal(markerRadius(-5), markerRadius(1))
  assert.equal(markerRadius(Number.NaN), markerRadius(1))
})

test('sizes cluster bubbles within their own bounds', () => {
  for (const bandi of [1, 2, 5, 23, 102, 5000]) {
    const radius = clusterRadius(bandi)
    assert.ok(radius >= CLUSTER_MIN_RADIUS && radius <= CLUSTER_MAX_RADIUS, `${bandi} → ${radius}px`)
  }
  assert.ok(
    clusterRadius(1) < clusterRadius(23),
    'a one-bando region is smaller than a crowded one'
  )
  // Always bigger than the biggest single bando, so a bubble never reads as one.
  assert.ok(CLUSTER_MIN_RADIUS > MARKER_MAX_RADIUS - 6)
})

/* ------------------------------------------------------------------ */
/* Colour                                                              */
/* ------------------------------------------------------------------ */

test('paints closed bandi grey, not red', () => {
  // The table paints a scaduto row grey, and green-against-red is the pair a
  // colour-vision deficiency erases. See the comment on MARKER_STYLE.
  assert.equal(MARKER_STYLE.open.color, '#22c55e')
  assert.equal(MARKER_STYLE.closed.color, '#9ca3af')
  assert.notEqual(MARKER_STYLE.closed.color, '#f87171')
})

test('lets the closed markers recede behind the open ones', () => {
  assert.ok(MARKER_STYLE.closed.fillOpacity < MARKER_STYLE.open.fillOpacity)
  assert.ok(MARKER_STYLE.closed.weight <= MARKER_STYLE.open.weight)
})

test('rings a cluster green only when it still holds an open bando', () => {
  assert.equal(CLUSTER_STYLE.withOpen.color, MARKER_STYLE.open.color)
  assert.equal(CLUSTER_STYLE.allClosed.color, MARKER_STYLE.closed.color)
})

/* ------------------------------------------------------------------ */
/* Thresholds                                                          */
/* ------------------------------------------------------------------ */

test('keeps clustering above the zoom the whole country fits in', () => {
  // Italy fits at zoom 5-6 depending on the viewport, so the threshold has to
  // be above both for the country view to be the rolled-up one.
  assert.ok(CLUSTER_BELOW_ZOOM > 6)
})

test('leaves the canvas renderer well clear of the current dataset', () => {
  // Switching to canvas removes the per-marker DOM node the map specs select
  // on, so the threshold must not be anywhere near today's row count.
  assert.ok(CANVAS_MARKER_THRESHOLD > amounts.length * 3)
})

/* ------------------------------------------------------------------ */
/* Coincident points                                                   */
/* ------------------------------------------------------------------ */

test('leaves distinct points exactly where they are', () => {
  const points = [
    { latitude: 45.4, longitude: 9.19 },
    { latitude: 41.9, longitude: 12.5 },
  ]
  assert.deepEqual(
    spreadCoincident(points).map(({ latitude, longitude }) => ({ latitude, longitude })),
    points
  )
})

test('spreads a stack of identical points apart', () => {
  const stacked = [
    { latitude: 45.4, longitude: 9.19, id: 'a' },
    { latitude: 45.4, longitude: 9.19, id: 'b' },
    { latitude: 45.4, longitude: 9.19, id: 'c' },
  ]
  const spread = spreadCoincident(stacked)

  assert.equal(spread.length, 3)
  assert.deepEqual(
    spread.map(({ point }) => point.id),
    ['a', 'b', 'c'],
    'order is preserved, so the caller can still pair a position with its bando'
  )

  const keys = new Set(spread.map(({ latitude, longitude }) => `${latitude},${longitude}`))
  assert.equal(keys.size, 3, 'three distinct drawing positions')

  for (const { latitude, longitude } of spread) {
    assert.ok(Math.abs(latitude - 45.4) < 0.01, 'nudged by metres, not kilometres')
    assert.ok(Math.abs(longitude - 9.19) < 0.01)
  }
})

test('does not move any real bando off its comune', () => {
  const points = (bidsJson as { latitude?: string; longitude?: string }[])
    .filter((bid) => bid.latitude && bid.longitude)
    .map((bid) => ({ latitude: Number(bid.latitude), longitude: Number(bid.longitude) }))

  spreadCoincident(points).forEach(({ point, latitude, longitude }) => {
    assert.ok(Math.abs(latitude - point.latitude) < 0.01)
    assert.ok(Math.abs(longitude - point.longitude) < 0.01)
  })
})
