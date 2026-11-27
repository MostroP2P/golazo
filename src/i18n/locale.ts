/**
 * Which catalogue a reader gets: their stored choice, else the first of the
 * browser's languages we have, else English, the source catalogue.
 */
export const LOCALES = ['en', 'es'] as const
export type Locale = (typeof LOCALES)[number]

const KEY = 'golazo:locale'

function isLocale(value: unknown): value is Locale {
  return (LOCALES as readonly unknown[]).includes(value)
}

export function pickLocale(preferred: readonly string[], stored: string | null): Locale {
  if (isLocale(stored)) return stored
  for (const tag of preferred) {
    const base = tag.toLowerCase().split('-')[0]
    if (isLocale(base)) return base
  }
  return 'en'
}

export function readStoredLocale(): string | null {
  try {
    return globalThis.localStorage?.getItem(KEY) ?? null
  } catch {
    return null
  }
}

export function storeLocale(locale: Locale): void {
  try {
    globalThis.localStorage?.setItem(KEY, locale)
  } catch {
    // The choice lasts for this page only.
  }
}
