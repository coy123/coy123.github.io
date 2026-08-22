export interface TableData {
  image: string;
  location: string;
  amount: number;
  deadline: string;
  url: string;
  /**
   * The day the bando was first detected, "YYYY-MM-DD". Drives the release
   * delay in lib/data.ts: a row stays subscriber-only until it is
   * RELEASE_DELAY_DAYS old. Optional — a row without it is treated as already
   * released, so an entry predating the field can never vanish from the site.
   */
  detectedAt?: string;
  latitude?: number;
  longitude?: number;
}

export interface LawData {
  image: string;
  location: string;
  url: string;
}
