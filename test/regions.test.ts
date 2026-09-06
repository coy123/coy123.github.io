/**
 * The region rule (lib/regions.ts) and the catalogue it reads from.
 *
 * Browser-less on purpose: every assertion here is a call into `lib/` or a
 * check on `data/data.json`, and Cypress would add five minutes and a page
 * load to answer questions that are pure functions. See "Testing" in
 * CLAUDE.md — `cypress/e2e/regions.cy.ts` covers what the tab actually
 * *renders*, and nothing else.
 */
import test from 'node:test'
import assert from 'node:assert/strict'

import bidsJson from '../data/data.json' with { type: 'json' }
import {
  REGIONS,
  bidsInRegion,
  countByRegion,
  regionById,
  regionOf,
} from '../lib/regions.ts'
import { CREST_WIDTHS, crestUrl } from '../lib/crest.ts'
import { trimStrings } from '../lib/trim.ts'

interface RawBid {
  location: string
  latitude?: string
  longitude?: string
}

/** The rows as `lib/data.ts` hands them on: trimmed, coordinates as numbers. */
const bids = (bidsJson as RawBid[]).map((row) => {
  const bid = trimStrings(row)
  return {
    location: bid.location,
    latitude: bid.latitude ? Number(bid.latitude) : undefined,
    longitude: bid.longitude ? Number(bid.longitude) : undefined,
  }
})

/* ------------------------------------------------------------------ */
/* The catalogue                                                       */
/* ------------------------------------------------------------------ */

test('lists all twenty Italian regions, with unique ids and names', () => {
  assert.equal(REGIONS.length, 20)
  assert.equal(new Set(REGIONS.map((region) => region.id)).size, 20)
  assert.equal(new Set(REGIONS.map((region) => region.name)).size, 20)
})

test('is sorted by name, which is the order the picker renders', () => {
  const names = REGIONS.map((region) => region.name)
  assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b, 'it')))
})

test('gives every region an id that is safe in a URL and a DOM id', () => {
  REGIONS.forEach((region) => {
    assert.match(region.id, /^[a-z0-9-]+$/, `id of ${region.name}`)
  })
})

test('covers the 107 current provinces, each in exactly one region', () => {
  const codes = REGIONS.flatMap((region) => region.provinces)
  // Three of Sardinia's provinces were abolished in 2016 and are kept for the
  // archive (see the comment on that entry), so the total runs past 107.
  const abolished = ['CI', 'OT', 'VS']
  const current = codes.filter((code) => !abolished.includes(code))
  assert.equal(current.length, 107, 'one plate code per current province')
  assert.equal(new Set(codes).size, codes.length, 'no code appears twice')
  codes.forEach((code) => assert.match(code, /^[A-Z]{2}$/, `plate code ${code}`))

  // A handful of spot checks, chosen as the ones a typo would most plausibly
  // land on: two regions that share a first letter, and the capitals.
  const regionOfCode = (code: string) =>
    REGIONS.find((region) => region.provinces.includes(code))?.name
  assert.equal(regionOfCode('RM'), 'Lazio')
  assert.equal(regionOfCode('MI'), 'Lombardia')
  assert.equal(regionOfCode('CT'), 'Sicilia')
  assert.equal(regionOfCode('CA'), 'Sardegna')
  assert.equal(regionOfCode('AO'), "Valle d'Aosta")
  assert.equal(regionOfCode('TO'), 'Piemonte')
})

test('gives every region a coat of arms Wikimedia can resize', () => {
  REGIONS.forEach((region) => {
    assert.match(
      region.crest,
      /^https:\/\/upload\.wikimedia\.org\/wikipedia\//,
      `crest of ${region.name}`
    )
    // `crestUrl` returns its input untouched on a URL it does not recognise,
    // which is how a broken crest would show up: a full-size original in a
    // 32px box. A recognised one always comes back changed.
    const thumb = crestUrl(region.crest, CREST_WIDTHS[0])
    assert.notEqual(thumb, region.crest, `crest of ${region.name} is not resizable`)
    assert.ok(thumb.includes(`${CREST_WIDTHS[0]}px-`), `thumb of ${region.name}`)
  })
})

test('gives every region a bounding box inside Italy', () => {
  REGIONS.forEach(({ name, bounds }) => {
    assert.ok(bounds.south < bounds.north, `${name}: south below north`)
    assert.ok(bounds.west < bounds.east, `${name}: west before east`)
    assert.ok(bounds.south > 35 && bounds.north < 48, `${name}: latitudes in Italy`)
    assert.ok(bounds.west > 6 && bounds.east < 19, `${name}: longitudes in Italy`)
  })
})

/* ------------------------------------------------------------------ */
/* The rule                                                            */
/* ------------------------------------------------------------------ */

test('reads the province code out of the usual location shape', () => {
  assert.equal(regionOf({ location: 'Comune di Milano (MI)' })?.id, 'lombardia')
  assert.equal(regionOf({ location: 'Città di Bagheria (PA)' })?.id, 'sicilia')
  assert.equal(regionOf({ location: 'Provincia di Latina (LT)' })?.id, 'lazio')
  assert.equal(regionOf({ location: 'San Giorgio a Cremano (NA)' })?.id, 'campania')
})

test('reads a code that shares the brackets with something else', () => {
  // "Comune di Calto (RO, Veneto)" is in the dataset today.
  assert.equal(regionOf({ location: 'Comune di Calto (RO, Veneto)' })?.id, 'veneto')
})

test('falls back to a region named in the text', () => {
  assert.equal(regionOf({ location: 'Regione Calabria' })?.id, 'calabria')
  assert.equal(regionOf({ location: 'Comune di Foggia (Puglia)' })?.id, 'puglia')
  assert.equal(regionOf({ location: 'Comune di Colle di Val d’Elsa (Toscana)' })?.id, 'toscana')
  assert.equal(regionOf({ location: 'Comune di X (Emilia Romagna)' })?.id, 'emilia-romagna')
  assert.equal(regionOf({ location: 'Comune di X (Alto Adige)' })?.id, 'trentino-alto-adige')
})

test('does not match a region name inside a longer word', () => {
  // Without the word boundary "Marche" matches "Marchetti" and a comune in
  // Lombardia lands in Marche.
  assert.equal(regionOf({ location: 'Comune di Marchetti (BG)' })?.id, 'lombardia')
  assert.equal(regionOf({ location: 'Comune di Marchetti' }), null)
})

test('places a bando by its coordinates when the text says nothing', () => {
  // "Comune di Ottana" — no province code, no region name, but it has a point.
  assert.equal(regionOf({ location: 'Comune di Ottana', latitude: 40.1403, longitude: 9.0233 })?.id, 'sardegna')
})

test('believes the coordinates over an impossible province code', () => {
  // This row is in the dataset: CA is Cagliari, but the comune is Catania and
  // the coordinates are Sicilian. Without the correction it files Catania
  // under Sardegna.
  assert.equal(
    regionOf({ location: 'Comune di Catania (CA)', latitude: 37.508, longitude: 15.06362 })?.id,
    'sicilia'
  )
})

test('keeps the province code when the coordinates merely sit near a border', () => {
  // Rounded coordinates and OSM boxes must not flip a comune to its neighbour.
  // Como is in Lombardia and a few hundred metres from Switzerland.
  assert.equal(
    regionOf({ location: 'Comune di Como (CO)', latitude: 45.808, longitude: 9.085 })?.id,
    'lombardia'
  )
})

test('answers null when a row says nothing at all', () => {
  assert.equal(regionOf({ location: 'Comune di Nessunluogo' }), null)
})

test('regionById answers for every id and for nothing else', () => {
  REGIONS.forEach((region) => assert.equal(regionById(region.id), region))
  assert.equal(regionById('padania'), undefined)
})

/* ------------------------------------------------------------------ */
/* The dataset                                                         */
/* ------------------------------------------------------------------ */

test('places every bando in data.json in a region', () => {
  // A row that resolves to nothing is invisible in the regions tab, which is
  // the kind of silent gap the suite exists to catch. The fix is a province
  // code in `location`, or coordinates — see "Adding a new NCC bid" in
  // CLAUDE.md.
  const orphans = bids.filter((bid) => regionOf(bid) === null).map((bid) => bid.location)
  assert.deepEqual(orphans, [], 'bandi belonging to no region')
})

test('the counts add up to the whole dataset', () => {
  const counts = countByRegion(bids)
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0)
  assert.equal(total, bids.length)
  assert.equal(Object.keys(counts).length, REGIONS.length, 'a count for every region')
})

test('splits the dataset into disjoint regional lists', () => {
  const seen = new Set<string>()
  REGIONS.forEach((region) => {
    bidsInRegion(bids, region.id).forEach((bid) => {
      assert.equal(regionOf(bid)?.id, region.id)
      assert.ok(!seen.has(bid.location), `${bid.location} is in two regions`)
      seen.add(bid.location)
    })
  })
  assert.equal(seen.size, new Set(bids.map((bid) => bid.location)).size)
})

test('places a bando in the region its coordinates fall in', () => {
  // The end-to-end check the two rules above cannot make on their own: for
  // every row that has coordinates, the region chosen must contain them —
  // give or take the margin the rule itself allows for rounded values and
  // border comuni.
  const MARGIN = 0.15
  const strays = bids
    .filter((bid) => typeof bid.latitude === 'number' && typeof bid.longitude === 'number')
    .filter((bid) => {
      const bounds = regionOf(bid)!.bounds
      return !(
        bid.latitude! >= bounds.south - MARGIN &&
        bid.latitude! <= bounds.north + MARGIN &&
        bid.longitude! >= bounds.west - MARGIN &&
        bid.longitude! <= bounds.east + MARGIN
      )
    })
    .map((bid) => `${bid.location} → ${regionOf(bid)!.name}`)
  assert.deepEqual(strays, [], 'bandi filed under a region their coordinates are not in')
})
