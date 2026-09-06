/**
 * The twenty Italian regions, and the rule that puts a bando in one of them.
 *
 * **This module imports nothing**, for the same reason `lib/embargo.ts`
 * imports nothing: `cypress/support/site.ts` pulls it in directly under plain
 * Node, and that loader resolves no `@/` aliases. The one shape it needs from
 * `types.ts` is declared locally as `RegionLocatable` instead of imported.
 *
 * Where the data came from (all fetched once, at authoring time, not at build
 * time — this is a static export and nothing here may hit the network):
 *
 * - **`provinces`**: the licence-plate codes of the 107 current provinces,
 *   cross-checked against Wikidata (`P395` on each entity whose `P131` is the
 *   region). Five regions came back short there — Friuli-Venezia Giulia has no
 *   provinces left as administrative bodies, Sicilia's free consortia and
 *   Lazio's metropolitan city carry odd codes in Wikidata (`IT-AG`, `ROMA`) —
 *   so the list below is the hand-checked canonical one.
 * - **`crest`**: `P94` (coat of arms image) on each region, resolved to its
 *   `upload.wikimedia.org` path. Left in the direct `/wikipedia/commons/…`
 *   form on purpose: `crestUrl()` turns that into a thumbnail of whatever
 *   width the caller wants, exactly as it does for the comune crests in
 *   `data/*.json`.
 * - **`bounds`**: OpenStreetMap's bounding box for the region (Nominatim), so
 *   the regional map opens framed on the region rather than on Italy.
 */

/** The two fields the region rule reads off a bando. */
export interface RegionLocatable {
  location: string
  latitude?: number
  longitude?: number
}

/** A latitude/longitude box, in the order Leaflet's `fitBounds` wants it. */
export interface RegionBounds {
  south: number
  west: number
  north: number
  east: number
}

export interface Region {
  /** ASCII, stable, safe in a DOM id or a URL fragment. */
  id: string
  /** As it is written in Italian, and as the picker shows it. */
  name: string
  /** Coat of arms, a Wikimedia source URL for `crestUrl()` to resize. */
  crest: string
  /** Licence-plate codes of the region's provinces. */
  provinces: readonly string[]
  bounds: RegionBounds
}

/**
 * Alphabetical, because that is the order the picker renders and the order a
 * reader scans a list of twenty names in. (The laws table sorts by name for
 * the same reason.)
 */
export const REGIONS: readonly Region[] = [
  {
    id: 'abruzzo',
    name: 'Abruzzo',
    crest: 'https://upload.wikimedia.org/wikipedia/commons/c/ce/Regione-Abruzzo-Stemma.svg',
    provinces: ['AQ', 'CH', 'PE', 'TE'],
    bounds: { south: 41.682, west: 13.019, north: 42.895, east: 14.784 },
  },
  {
    id: 'basilicata',
    name: 'Basilicata',
    crest: 'https://upload.wikimedia.org/wikipedia/commons/0/07/Regione-Basilicata-Stemma.svg',
    provinces: ['MT', 'PZ'],
    bounds: { south: 39.896, west: 15.335, north: 41.14, east: 16.867 },
  },
  {
    id: 'calabria',
    name: 'Calabria',
    crest: 'https://upload.wikimedia.org/wikipedia/commons/b/bf/Coat_of_arms_of_Calabria.svg',
    provinces: ['CS', 'CZ', 'KR', 'RC', 'VV'],
    bounds: { south: 37.916, west: 15.63, north: 40.145, east: 17.206 },
  },
  {
    id: 'campania',
    name: 'Campania',
    crest: 'https://upload.wikimedia.org/wikipedia/commons/a/a8/Regione-Campania-Stemma.svg',
    provinces: ['AV', 'BN', 'CE', 'NA', 'SA'],
    bounds: { south: 39.991, west: 13.762, north: 41.508, east: 15.806 },
  },
  {
    id: 'emilia-romagna',
    name: 'Emilia-Romagna',
    crest: 'https://upload.wikimedia.org/wikipedia/commons/c/ca/Regione-Emilia-Romagna-Stemma.svg',
    provinces: ['BO', 'FC', 'FE', 'MO', 'PC', 'PR', 'RA', 'RE', 'RN'],
    bounds: { south: 43.731, west: 9.198, north: 45.14, east: 12.756 },
  },
  {
    id: 'friuli-venezia-giulia',
    name: 'Friuli-Venezia Giulia',
    crest: 'https://upload.wikimedia.org/wikipedia/commons/b/b6/CoA_of_Friuli-Venezia_Giulia.svg',
    provinces: ['GO', 'PN', 'TS', 'UD'],
    bounds: { south: 45.581, west: 12.321, north: 46.648, east: 13.919 },
  },
  {
    id: 'lazio',
    name: 'Lazio',
    crest: 'https://upload.wikimedia.org/wikipedia/commons/7/76/Lazio_Coat_of_Arms.svg',
    provinces: ['FR', 'LT', 'RI', 'RM', 'VT'],
    bounds: { south: 40.785, west: 11.449, north: 42.839, east: 14.028 },
  },
  {
    id: 'liguria',
    name: 'Liguria',
    crest: 'https://upload.wikimedia.org/wikipedia/commons/4/41/Coat_of_arms_of_Liguria.svg',
    provinces: ['GE', 'IM', 'SP', 'SV'],
    bounds: { south: 43.776, west: 7.495, north: 44.676, east: 10.072 },
  },
  {
    id: 'lombardia',
    name: 'Lombardia',
    crest: 'https://upload.wikimedia.org/wikipedia/commons/9/95/Insigne_Langobardiae.svg',
    provinces: ['BG', 'BS', 'CO', 'CR', 'LC', 'LO', 'MB', 'MI', 'MN', 'PV', 'SO', 'VA'],
    bounds: { south: 44.68, west: 8.498, north: 46.635, east: 11.428 },
  },
  {
    id: 'marche',
    name: 'Marche',
    crest: 'https://upload.wikimedia.org/wikipedia/commons/b/b9/Coat_of_arms_of_Marche.svg',
    provinces: ['AN', 'AP', 'FM', 'MC', 'PU'],
    bounds: { south: 42.687, west: 12.185, north: 43.972, east: 13.916 },
  },
  {
    id: 'molise',
    name: 'Molise',
    crest: 'https://upload.wikimedia.org/wikipedia/commons/f/fb/Regione-Molise-Stemma.svg',
    provinces: ['CB', 'IS'],
    bounds: { south: 41.364, west: 13.941, north: 42.07, east: 15.162 },
  },
  {
    id: 'piemonte',
    name: 'Piemonte',
    crest: 'https://upload.wikimedia.org/wikipedia/commons/4/42/Regione-Piemonte-Stemma.svg',
    provinces: ['AL', 'AT', 'BI', 'CN', 'NO', 'TO', 'VB', 'VC'],
    bounds: { south: 44.06, west: 6.627, north: 46.464, east: 9.214 },
  },
  {
    id: 'puglia',
    name: 'Puglia',
    crest: 'https://upload.wikimedia.org/wikipedia/commons/d/d0/Coat_of_Arms_of_Apulia.svg',
    provinces: ['BA', 'BR', 'BT', 'FG', 'LE', 'TA'],
    bounds: { south: 39.79, west: 14.934, north: 42.226, east: 18.521 },
  },
  {
    id: 'sardegna',
    name: 'Sardegna',
    crest: 'https://upload.wikimedia.org/wikipedia/commons/3/33/Sardegna-Stemma.svg',
    // CI, OT and VS are the three provinces abolished in 2016. They are kept
    // because `data/data.json` is a historical archive as much as a live list,
    // and a bando filed under one of them still belongs on this map.
    provinces: ['CA', 'NU', 'OR', 'SS', 'SU', 'CI', 'OT', 'VS'],
    bounds: { south: 38.859, west: 8.131, north: 41.313, east: 9.829 },
  },
  {
    id: 'sicilia',
    name: 'Sicilia',
    crest: 'https://upload.wikimedia.org/wikipedia/commons/d/df/Coat_of_arms_of_Sicily.svg',
    provinces: ['AG', 'CL', 'CT', 'EN', 'ME', 'PA', 'RG', 'SR', 'TP'],
    // Deliberately NOT OSM's box, which runs down to Lampedusa (35.49°N) and
    // out to Pantelleria (11.93°E) and so frames mostly open sea. This is
    // Sicily plus the Eolie. Nothing is lost by trimming it: the map extends
    // whatever box it is given to cover the markers it actually has, so a
    // bando on Lampedusa still pulls the view back down to itself.
    bounds: { south: 36.6, west: 12.35, north: 38.818, east: 15.653 },
  },
  {
    id: 'toscana',
    name: 'Toscana',
    crest: 'https://upload.wikimedia.org/wikipedia/commons/4/4f/Coat_of_arms_of_Tuscany.svg',
    provinces: ['AR', 'FI', 'GR', 'LI', 'LU', 'MS', 'PI', 'PO', 'PT', 'SI'],
    bounds: { south: 42.238, west: 9.687, north: 44.473, east: 12.372 },
  },
  {
    id: 'trentino-alto-adige',
    name: 'Trentino-Alto Adige',
    crest: 'https://upload.wikimedia.org/wikipedia/commons/b/b4/Coat_of_arms_of_Trentino-South_Tyrol.svg',
    provinces: ['BZ', 'TN'],
    bounds: { south: 45.673, west: 10.382, north: 47.092, east: 12.478 },
  },
  {
    id: 'umbria',
    name: 'Umbria',
    crest: 'https://upload.wikimedia.org/wikipedia/commons/5/55/Regione-Umbria-Stemma.svg',
    provinces: ['PG', 'TR'],
    bounds: { south: 42.365, west: 11.892, north: 43.617, east: 13.264 },
  },
  {
    id: 'valle-d-aosta',
    name: "Valle d'Aosta",
    crest: 'https://upload.wikimedia.org/wikipedia/commons/f/f6/Valle_d%27Aosta-Stemma.svg',
    provinces: ['AO'],
    bounds: { south: 45.467, west: 6.802, north: 45.988, east: 7.94 },
  },
  {
    id: 'veneto',
    name: 'Veneto',
    crest: 'https://upload.wikimedia.org/wikipedia/commons/c/cd/Coat_of_Arms_of_Veneto.png',
    provinces: ['BL', 'PD', 'RO', 'TV', 'VE', 'VI', 'VR'],
    bounds: { south: 44.792, west: 10.623, north: 46.681, east: 13.102 },
  },
]

/** Licence-plate code → region. Built once; every code belongs to one region. */
const REGION_BY_PROVINCE: ReadonlyMap<string, Region> = new Map(
  REGIONS.flatMap((region) => region.provinces.map((code) => [code, region] as const))
)

export const regionById = (id: string): Region | undefined =>
  REGIONS.find((region) => region.id === id)

/**
 * Lowercased, diacritics stripped, everything that is not a letter or a digit
 * folded to a single space. So "Trentino-Alto Adige", "TRENTINO ALTO ADIGE"
 * and "Regione Trentino–Alto Adige" all reduce to the same haystack.
 */
const fold = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

/**
 * Names a location string may carry instead of a province code. `location` in
 * `data/data.json` is written by hand and a few rows name the region outright
 * — "Comune di Foggia (Puglia)", "Regione Calabria" — so the region names
 * themselves are matched, plus the shortenings that actually appear in the
 * wild.
 */
const NAME_ALIASES: ReadonlyArray<readonly [string, string]> = [
  ...REGIONS.map((region) => [fold(region.name), region.id] as const),
  ['trentino', 'trentino-alto-adige'],
  ['alto adige', 'trentino-alto-adige'],
  ['sudtirol', 'trentino-alto-adige'],
  ['south tyrol', 'trentino-alto-adige'],
  ['friuli', 'friuli-venezia-giulia'],
  ['val d aosta', 'valle-d-aosta'],
  ['aosta valley', 'valle-d-aosta'],
  ['apulia', 'puglia'],
  ['sicily', 'sicilia'],
  ['sardinia', 'sardegna'],
  ['tuscany', 'toscana'],
  ['lombardy', 'lombardia'],
  ['piedmont', 'piemonte'],
]

/**
 * The province code in a location string, or null.
 *
 * The convention is "Comune di NomeCittà (XX)", but a couple of rows carry
 * more than that inside the brackets — "Comune di Calto (RO, Veneto)" — so
 * each comma-separated part is considered.
 */
const provinceCodeIn = (location: string): string | null => {
  const brackets = location.match(/\(([^)]*)\)/g)
  if (!brackets) return null

  for (const bracket of brackets) {
    for (const part of bracket.slice(1, -1).split(',')) {
      const code = part.trim().toUpperCase()
      if (REGION_BY_PROVINCE.has(code)) return code
    }
  }
  return null
}

/** A region named in the location string, or null. */
const regionNamedIn = (location: string): Region | null => {
  const haystack = fold(location)
  for (const [needle, id] of NAME_ALIASES) {
    // Word-bounded, so "Marche" does not match inside "Marchetti".
    if (new RegExp(`(^| )${needle}( |$)`).test(haystack)) {
      return regionById(id) ?? null
    }
  }
  return null
}

const contains = (bounds: RegionBounds, latitude: number, longitude: number, margin = 0) =>
  latitude >= bounds.south - margin &&
  latitude <= bounds.north + margin &&
  longitude >= bounds.west - margin &&
  longitude <= bounds.east + margin

/**
 * The region a point falls in: the one whose box contains it, and among
 * several overlapping boxes (the Po valley regions overlap heavily) the one
 * whose centre is nearest. A point in no box at all — a coordinate typo, a
 * comune just over a border — falls back to the nearest centre overall, so
 * this always answers.
 *
 * Longitude is scaled by 0.75 before the distance is taken, which is roughly
 * `cos(42°)`: without it a degree of longitude counts as much as a degree of
 * latitude and the nearest region comes out wrong across the middle of Italy.
 */
const regionAt = (latitude: number, longitude: number): Region => {
  const inside = REGIONS.filter((region) => contains(region.bounds, latitude, longitude))
  const candidates = inside.length ? inside : REGIONS
  return candidates.reduce((best, region) => {
    const score = (candidate: Region) => {
      const { south, west, north, east } = candidate.bounds
      const dLat = latitude - (south + north) / 2
      const dLon = (longitude - (west + east) / 2) * 0.75
      return dLat * dLat + dLon * dLon
    }
    return score(region) < score(best) ? region : best
  })
}

/**
 * How far outside its region's box a bando's coordinates may sit before the
 * coordinates are believed over the province code. Generous on purpose: the
 * boxes are OSM's, the coordinates in `data/data.json` are rounded to three
 * decimals, and a comune on a regional border must not flip sides over either.
 */
const COORDINATE_MARGIN = 0.15

/**
 * Which region a bando belongs to, or null if nothing in the row says.
 *
 * In order:
 *
 * 1. **The province code**, which is the authoritative part of `location` and
 *    is present on all but a handful of rows.
 * 2. **A region named in the text**, for the rows that carry one instead
 *    ("Comune di Foggia (Puglia)", "Regione Calabria").
 * 3. **The coordinates**, when the row has them and steps 1-2 found nothing.
 *
 * Plus one correction: if the row *does* have coordinates and they land well
 * outside the region the text chose, the coordinates win. `location` is typed
 * by hand and a two-letter code is an easy thing to get wrong — the dataset
 * currently carries "Comune di Catania (CA)", where CA is Cagliari, and
 * without this clause Catania would be filed under Sardegna. The coordinates
 * are checked against the map anyway, so they are the more trustworthy half of
 * the row.
 */
export function regionOf(bid: RegionLocatable): Region | null {
  const code = provinceCodeIn(bid.location)
  const named = code ? REGION_BY_PROVINCE.get(code)! : regionNamedIn(bid.location)

  const hasPoint = typeof bid.latitude === 'number' && typeof bid.longitude === 'number'
  if (!hasPoint) return named

  const latitude = bid.latitude!
  const longitude = bid.longitude!
  if (!named) return regionAt(latitude, longitude)
  if (contains(named.bounds, latitude, longitude, COORDINATE_MARGIN)) return named
  return regionAt(latitude, longitude)
}

/** Convenience for the picker: how many of `bids` fall in each region, by id. */
export function countByRegion(bids: readonly RegionLocatable[]): Record<string, number> {
  const counts: Record<string, number> = Object.fromEntries(
    REGIONS.map((region) => [region.id, 0])
  )
  for (const bid of bids) {
    const region = regionOf(bid)
    if (region) counts[region.id] += 1
  }
  return counts
}

/** The subset of `bids` that belongs to one region. */
export function bidsInRegion<T extends RegionLocatable>(bids: readonly T[], id: string): T[] {
  return bids.filter((bid) => regionOf(bid)?.id === id)
}
