// Generates a URL-safe slug from a location name.
// Strips diacritics (e.g. "Città" → "Citta") so static-export paths stay ASCII
// and work correctly on GitHub Pages, then replaces whitespace with hyphens.
export const toSlug = (location: string) =>
  location
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-')
