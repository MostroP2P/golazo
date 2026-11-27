/**
 * The active catalogue, chosen once as the page loads. Changing language
 * stores the choice and reloads, so every string and number on screen agrees.
 */
import { setFormatLocale } from '~/model/format'
import { en } from './en'
import { es } from './es'
import { pickLocale, readStoredLocale, type Locale } from './locale'
import type { Strings } from './strings'

export const CATALOGUES: Readonly<Record<Locale, Strings>> = { en, es }

export const locale: Locale = pickLocale(
  typeof navigator === 'undefined' ? [] : navigator.languages,
  readStoredLocale(),
)

export const t: Strings = CATALOGUES[locale]

setFormatLocale(locale)
if (typeof document !== 'undefined') document.documentElement.lang = locale

export type { Strings }
