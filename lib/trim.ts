/**
 * `data/data.json` is hand-curated and fed by the crawler, so values regularly
 * arrive with a leading or trailing space from a copy-paste or a fat finger.
 * Every one of them does damage further down:
 *
 *   location  " Comune di Milano (MI)"  -> slug "-Comune-di-Milano-(MI)", i.e. a
 *                                          detail page nothing links to
 *   url       "https://…/bando.pdf "    -> an href with a stray space
 *   image     "https://…/Stemma.png "   -> crestUrl() cannot parse it, so the
 *                                          full-size crest is served instead
 *   deadline  "2025-06-25 "             -> fails the ISO check in the suite
 *   latitude  " 40.918"                 -> survives Number(), but only by luck
 *
 * The fix is applied on read rather than in the file, so a future edit cannot
 * reintroduce the problem: everything that touches a bid runs its rows through
 * `trimStrings` first.
 *
 * Only strings are rewritten — `amount` and any other non-string value is
 * passed through untouched.
 */
export function trimStrings<T extends object>(entry: T): T {
  const trimmed: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(entry)) {
    trimmed[key] = typeof value === 'string' ? value.trim() : value
  }
  return trimmed as T
}
