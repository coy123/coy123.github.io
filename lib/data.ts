import data from '@/data/data.json'
import { TableData } from '@/types'

export async function getTableData(): Promise<TableData[]> {
  // Trasformazione server-side
  return data.map((item: any) => ({
    ...item,
    latitude: item.latitude ? Number(item.latitude) : undefined,
    longitude: item.longitude ? Number(item.longitude) : undefined,
  }))
}
