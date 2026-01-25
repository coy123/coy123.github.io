import itTranslations from '@/locales/it.json'

export function getTranslations() {
  return itTranslations
}

export function getTranslation(key: string): string {
  const keys = key.split('.')
  let value: any = itTranslations

  for (const k of keys) {
    value = value?.[k]
  }

  return value || key
}
