/**
 * The whole app, wired: real signed events through the real store, verified
 * against the real publisher, rendered. Only the sockets and `fetch` are fake.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/preact'
import { readFileSync, readdirSync } from 'node:fs'
import type { Event } from 'nostr-tools'
import { fakeRelays } from '../store/fake-relays'

const events = readdirSync('tests/fixtures/snapshot')
  .filter((f) => f !== 'manifest.json')
  .map((f) => JSON.parse(readFileSync(`tests/fixtures/snapshot/${f}`, 'utf8')) as Event)

const relays = { current: fakeRelays(events) }
vi.mock('~/nostr/pool', () => ({ openRelays: () => relays.current }))

beforeEach(async () => {
  localStorage.clear()
  localStorage.setItem('golazo:locale', 'es')
  relays.current = fakeRelays(events)
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(new Response(JSON.stringify({ BTC: { USD: 91_000 } })))),
  )
  const { resetShared } = await import('~/store/useBoard')
  resetShared()
})

afterEach(() => {
  vi.unstubAllGlobals()
  location.hash = ''
})

describe('the app against the real snapshot', () => {
  test('loads, verifies, says it is live and shows September and October as on mostro.world', async () => {
    const { App } = await import('~/app')
    render(<App />)

    await waitFor(() =>
      expect(screen.getByText('Antes del plan · noviembre 2026')).toBeTruthy(),
    )
    await waitFor(() => expect(screen.getAllByText(/355\.908/).length).toBeGreaterThan(0))
    expect(screen.getByText('En vivo')).toBeTruthy()
    // September and October 2026 are drawn in the annual chart's tooltips.
    expect(document.body.textContent).toContain('sep 26: 238.433 sats')
    expect(document.body.textContent).toContain('oct 26: 283.798 sats')
    expect(screen.getAllByText(/Yadio, precio actual/).length).toBeGreaterThan(0)
  })

  test('opens the trust page from the header, and the refresh button re-reads the index', async () => {
    const { App } = await import('~/app')
    render(<App />)
    await waitFor(() =>
      expect(screen.getByText('Antes del plan · noviembre 2026')).toBeTruthy(),
    )

    const before = relays.current.queries.length
    fireEvent.click(screen.getByRole('button', { name: 'Volver a leer los datos' }))
    await waitFor(() => expect(relays.current.queries.length).toBeGreaterThan(before))

    location.hash = '#/confianza'
    window.dispatchEvent(new HashChangeEvent('hashchange'))
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Verificación'),
    )
    expect(screen.getByRole('link', { name: 'Tablero' })).toBeTruthy()
  })

  test('a tab coming back re-reads the index at once', async () => {
    const { App } = await import('~/app')
    render(<App />)
    await waitFor(() =>
      expect(screen.getByText('Antes del plan · noviembre 2026')).toBeTruthy(),
    )
    const before = relays.current.queries.length

    document.dispatchEvent(new Event('visibilitychange'))

    await waitFor(() => expect(relays.current.queries.length).toBeGreaterThan(before))
  })
})

describe('routeOf', () => {
  test('reads the two routes, and opens the board for anything else', async () => {
    const { routeOf } = await import('~/router')
    expect(routeOf('#/confianza')).toBe('confianza')
    expect(routeOf('#/Confianza/')).toBe('confianza')
    expect(routeOf('#/')).toBe('tablero')
    expect(routeOf('#/whatever')).toBe('tablero')
    expect(routeOf('')).toBe('tablero')
  })
})
