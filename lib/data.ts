import data from '@/data/data.json'
import { TableData } from '@/types'
import { trimStrings } from './trim'

/** A row exactly as it is stored in data/data.json. */
export interface RawBid {
  image: string
  location: string
  amount: number
  deadline: string
  url: string
  latitude?: string
  longitude?: string
}

/**
 * Every bid, with its strings trimmed (see lib/trim.ts) and the coordinates
 * converted from the strings the JSON stores to numbers.
 *
 * Import this instead of `data/data.json` — reading the raw JSON bypasses the
 * trimming and lets a stray space leak into a slug, an href or a crest URL.
 */
export const bids: TableData[] = (data as RawBid[]).map((row) => {
  const bid = trimStrings(row)
  return {
    ...bid,
    // A value that was nothing but whitespace is now empty, so it correctly
    // falls through to undefined rather than becoming NaN.
    latitude: bid.latitude ? Number(bid.latitude) : undefined,
    longitude: bid.longitude ? Number(bid.longitude) : undefined,
  }
})

export async function getTableData(): Promise<TableData[]> {
  return bids
}
