import { afterEach, describe, expect, test, vi } from 'vitest'
import { en } from '~/i18n/en'
import { es } from '~/i18n/es'
import { pickLocale, readStoredLocale, storeLocale } from '~/i18n/locale'
import { CATALOGUES, locale } from '~/i18n'

/** Every leaf of a catalogue, functions called with sample arguments. */
function leaves(value: unknown, path = ''): [string, string][] {
  if (typeof value === 'string') return [[path, value]]
  if (typeof value === 'function')
    return [[path, String((value as (...a: unknown[]) => unknown)('X', 'Y', 3))]]
  if (Array.isArray(value)) return value.flatMap((v, i) => leaves(v, `${path}[${i}]`))
  return Object.entries(value as object).flatMap(([k, v]) =>
    leaves(v, path ? `${path}.${k}` : k),
  )
}

describe('catalogues', () => {
  test('Spanish translates every key of the English source, none blank', () => {
    const source = leaves(en)
    const spanish = new Map(leaves(es))
    for (const [key] of source) {
      expect(spanish.get(key)?.trim(), key).toBeTruthy()
    }
    expect(spanish.size).toBe(source.length)
  })

  test('every interpolation places its argument', () => {
    for (const catalogue of [en, es]) {
      expect(catalogue.dataAt('WHEN')).toContain('WHEN')
      expect(catalogue.unavailable('series:x')).toContain('series:x')
      expect(catalogue.planMonth(3, 'MONTH')).toContain('3')
      expect(catalogue.priceUsed('P', 'S')).toMatch(/P.*S/)
    }
  })

  test('Spanish is not quietly still English', () => {
    expect(es.light.verde).not.toBe(en.light.verde)
    expect(es.reviewBanner).not.toBe(en.reviewBanner)
    expect(es.footerProof).not.toBe(en.footerProof)
  })

  test('the test run reads the Spanish catalogue it stored', () => {
    expect(locale).toBe('es')
    expect(Object.keys(CATALOGUES)).toEqual(['en', 'es'])
  })
})

describe('pickLocale', () => {
  test('a stored choice wins', () => {
    expect(pickLocale(['en-US'], 'es')).toBe('es')
  })

  test('otherwise the first browser language we have', () => {
    expect(pickLocale(['fr-FR', 'es-AR', 'en'], null)).toBe('es')
    expect(pickLocale(['EN-gb'], 'xx')).toBe('en')
  })

  test('otherwise English, the source', () => {
    expect(pickLocale(['de'], null)).toBe('en')
    expect(pickLocale([], null)).toBe('en')
  })
})

describe('the stored locale', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.setItem('golazo:locale', 'es')
  })

  test('round-trips through storage', () => {
    storeLocale('en')
    expect(readStoredLocale()).toBe('en')
  })

  test('survives storage that throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied')
    })
    expect(readStoredLocale()).toBeNull()
    expect(() => storeLocale('es')).not.toThrow()
  })

  test('is null when nothing was stored', () => {
    localStorage.removeItem('golazo:locale')
    expect(readStoredLocale()).toBeNull()
  })
})
