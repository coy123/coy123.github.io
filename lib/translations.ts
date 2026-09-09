import itTranslations from '@/locales/it.json'
import { RELEASE_DELAY_DAYS } from './embargo'
import { withReleaseDays } from './copy'

/**
 * The Italian copy, with `{releaseDays}` resolved to `RELEASE_DELAY_DAYS`.
 *
 * Substituted here, once, rather than at each call site: most of the copy is
 * rendered by loops that never see an individual string — `t.pages.*.sections`,
 * the metadata exports, the JSON-LD builders — so a per-call-site `.replace()`
 * would have to be added in a dozen places and would be forgotten in the
 * thirteenth. Doing it at the source means every consumer is already correct.
 *
 * `{count}` and `{year}` are NOT touched: those are filled at render time with
 * numbers only the browser knows. See lib/copy.ts.
 */
const translations = withReleaseDays(itTranslations, RELEASE_DELAY_DAYS)

export function getTranslations() {
  return translations
}

export function getTranslation(key: string): string {
  // `unknown` rather than `any`: the walk genuinely does not know the shape of
  // what it is stepping into, but narrowing at each step keeps the mistake of
  // indexing a string or a number from passing silently. A miss returns the key
  // itself, which shows up in the page as the dotted path — a visible failure
  // rather than an empty element.
  let value: unknown = translations

  for (const k of key.split('.')) {
    if (typeof value !== 'object' || value === null) return key
    value = (value as Record<string, unknown>)[k]
  }

  return typeof value === 'string' ? value : key
}
