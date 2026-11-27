import { beforeEach, describe, expect, test, vi } from 'vitest'
import { clearCache, openCache, readCached, writeCached } from '~/store/cache'
import { dataNow, restatementsOf, sourceOf } from '~/store/sources'
import type { DocState } from '~/store/store'

const entry = { hash: 'h', envelope: { revision: 1 } as never, createdAt: 5 }

beforeEach(() => localStorage.clear())

describe('the document cache', () => {
  test('serves an entry only for the hash asked', () => {
    writeCached('d', entry)
    expect(readCached('d', 'h')).toEqual(entry)
    expect(readCached('d', 'other')).toBeNull()
    expect(readCached('missing', 'h')).toBeNull()
  })

  test('is dropped when the schema version moves, and kept when it does not', () => {
    writeCached('d', entry)
    localStorage.setItem('golazo:schema', '0')
    openCache()
    expect(readCached('d', 'h')).toBeNull()
    writeCached('d', entry)
    openCache()
    expect(readCached('d', 'h')).toEqual(entry)
  })

  test('clears only its own keys', () => {
    localStorage.setItem('other', 'x')
    writeCached('d', entry)
    clearCache()
    expect(readCached('d', 'h')).toBeNull()
    expect(localStorage.getItem('other')).toBe('x')
  })

  test('never throws when storage does', () => {
    const fail = () => {
      throw new Error('denied')
    }
    const spies = [
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(fail),
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(fail),
      vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(fail),
    ]
    expect(() => openCache()).not.toThrow()
    expect(readCached('d', 'h')).toBeNull()
    expect(() => writeCached('d', entry)).not.toThrow()
    spies.forEach((spy) => spy.mockRestore())
    localStorage.setItem('golazo:doc:x', '1')
    const remove = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(fail)
    expect(() => clearCache()).not.toThrow()
    remove.mockRestore()
  })

  test('without storage at all, everything is a quiet miss', () => {
    const spy = vi.spyOn(globalThis, 'localStorage', 'get').mockImplementation(() => {
      throw new Error('no storage')
    })
    expect(() => openCache()).not.toThrow()
    expect(readCached('d', 'h')).toBeNull()
    expect(() => writeCached('d', entry)).not.toThrow()
    expect(() => clearCache()).not.toThrow()
    spy.mockRestore()
  })
})

describe('sources from document states', () => {
  test('maps each state to what the model reads', () => {
    const docs = new Map([
      ['u', { status: 'unavailable' as const }],
      ['v', { status: 'unverified' as const, reason: 'hash' as const }],
      ['l', { status: 'loading' as const }],
    ])
    expect(sourceOf(docs, 'u')).toEqual({ status: 'unavailable', d: 'u' })
    expect(sourceOf(docs, 'v')).toEqual({ status: 'unverified', d: 'v', reason: 'hash' })
    expect(sourceOf(docs, 'l')).toEqual({ status: 'loading', d: 'l' })
    expect(sourceOf(docs, 'none')).toEqual({ status: 'loading', d: 'none' })
  })

  test('keeps only what a restatement needs', () => {
    const r = restatementsOf(
      new Map([
        ['d', { because: 'b', fromRevision: 1, toRevision: 2, previous: {} as never }],
      ]),
    )
    expect(r.get('d')).toEqual({ because: 'b', previous: {} })
  })
})

describe('dataNow', () => {
  const live = (coverage: string) =>
    ({
      status: 'live',
      envelope: {} as never,
      createdAt: 1,
      entry: {} as never,
      coverage,
    }) as const

  test('is the index coverage when every document shown is current', () => {
    const docs = new Map([['a', live('2026-11-27T19:07:03Z')]])
    expect(dataNow(docs, ['a'], '2026-11-27T19:07:03Z')).toBe(
      Date.parse('2026-11-27T19:07:03Z'),
    )
  })

  test('stops at the oldest coverage among the documents shown', () => {
    const docs = new Map<string, DocState>([
      ['a', live('2026-11-20T00:00:00Z')],
      ['b', live('2026-11-27T00:00:00Z')],
      ['c', { status: 'unavailable' }],
      ['d', live('2026-11-01T00:00:00Z')],
    ])
    expect(dataNow(docs, ['a', 'b', 'c', 'missing'], '2026-11-28T00:00:00Z')).toBe(
      Date.parse('2026-11-20T00:00:00Z'),
    )
  })

  test('ignores a coverage it cannot read', () => {
    const docs = new Map([['a', live('')]])
    expect(dataNow(docs, ['a'], '2026-11-28T00:00:00Z')).toBe(
      Date.parse('2026-11-28T00:00:00Z'),
    )
  })
})
