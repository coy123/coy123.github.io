import itTranslations from '@/locales/it.json'

export function getTranslations() {
  return itTranslations
}

export function getTranslation(key: string): string {
  // `unknown` rather than `any`: the walk genuinely does not know the shape of
  // what it is stepping into, but narrowing at each step keeps the mistake of
  // indexing a string or a number from passing silently. A miss returns the key
  // itself, which shows up in the page as the dotted path — a visible failure
  // rather than an empty element.
  let value: unknown = itTranslations

  for (const k of key.split('.')) {
    if (typeof value !== 'object' || value === null) return key
    value = (value as Record<string, unknown>)[k]
  }

  return typeof value === 'string' ? value : key
}
