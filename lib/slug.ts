// Generates a URL-safe slug from a location name.
//
// Static export writes one directory per slug, so the result has to stay ASCII
// to work reliably on GitHub Pages. Three things are normalised before the
// whitespace is hyphenated:
//   - diacritics          "Città"   -> "Citta"
//   - typographic quotes  "d’Elsa"  -> "d'Elsa"
//   - typographic dashes  "Val–Sud" -> "Val-Sud"
// Anything still outside printable ASCII after that is dropped.
//
// Commas become separators rather than being kept: Next's router will not match
// a dynamic segment containing a comma (encoded or not), so a location like
// "Comune di Calto (RO, Veneto)" would 404 on its own detail page.
export const toSlug = (location: string) =>
  location
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[‘’‚‛′]/g, "'")
    .replace(/[“”„‟″]/g, '"')
    .replace(/[‐-―−]/g, '-')
    .replace(/[^\x20-\x7e]/g, '')
    .replace(/,/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
