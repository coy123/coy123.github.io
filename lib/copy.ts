/**
 * The release delay, written into copy.
 *
 * Every sentence on the site that states how long a bando stays subscriber-only
 * carries `{releaseDays}` rather than the number itself, and this substitutes
 * `RELEASE_DELAY_DAYS` into it. Change the constant in `lib/embargo.ts` and the
 * home page, the abbonamento pitch, the locked rows, the FAQ, the meta
 * descriptions and the JSON-LD all follow — none of which can be found by
 * grepping for a number, which is why the copy used to spell it "sette giorni"
 * in fifteen places and would have had to be corrected in fifteen places.
 *
 * **This module imports nothing**, for the same reason `lib/embargo.ts`,
 * `lib/regions.ts` and `lib/mapMarkers.ts` import nothing: `cypress/support/site.ts`
 * loads it under plain Node, whose loader resolves no `@/` aliases. That is why
 * the day count is a parameter here instead of an import — the caller supplies
 * `RELEASE_DELAY_DAYS`.
 *
 * The token is deliberately NOT `{days}`. That one is already taken, at runtime,
 * by `dashboard.locked.countdown` — "il prossimo si sblocca tra {days} giorni",
 * where the number is how long until the *next* release and is known only in the
 * browser. Substituting both here would fill the countdown with the delay and
 * freeze it. `{count}` and `{year}` are likewise other people's placeholders and
 * are left alone.
 */
export const RELEASE_DAYS_TOKEN = '{releaseDays}'

const substitute = (value: unknown, days: string): unknown => {
  // split/join rather than replaceAll: the project targets ES2020, where
  // String.prototype.replaceAll does not exist. A `replace` would fill only the
  // first token, and one string (abbonamento.intro) carries two.
  if (typeof value === 'string') return value.split(RELEASE_DAYS_TOKEN).join(days)
  if (Array.isArray(value)) return value.map((item) => substitute(item, days))
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, substitute(item, days)])
    )
  }
  return value
}

/**
 * A copy of `value` with every `{releaseDays}` replaced. Objects and arrays are walked
 * to any depth; anything that is not a string, an array or a plain object is
 * returned as it stands.
 *
 * The generic is a convenience for the callers, not a proof: the walk cannot
 * narrow what it rebuilds, and the shape is unchanged by construction.
 */
export const withReleaseDays = <T>(value: T, days: number): T =>
  substitute(value, String(days)) as T
