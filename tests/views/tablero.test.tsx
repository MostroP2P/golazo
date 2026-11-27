import { describe, expect, test } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { Tablero } from '~/views/Tablero'
import type { DocState } from '~/store/store'
import type { Payload } from '~/nostr/documents'
import { appView, snapshot } from '../helpers/app'
import { series } from '../helpers/sources'

describe('the board view, from the real snapshot', () => {
  test('answers the four questions: state, accumulated, projection, distance to the goal', () => {
    // Act
    render(<Tablero app={appView()} />)

    // Assert
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'Antes del plan · noviembre 2026',
    )
    expect(screen.getAllByText(/355\.908/).length).toBeGreaterThan(0)
    expect(screen.getByText(/Avance desde la base a la meta final/)).toBeTruthy()
    expect(screen.getByText(/Primera meta: 360\.000 sats/)).toBeTruthy()
    expect(screen.getByText('Órdenes completadas por día')).toBeTruthy()
  })

  test('names the price behind every USD figure', () => {
    render(<Tablero app={appView()} />)
    expect(screen.getAllByText(/Yadio, precio actual/).length).toBeGreaterThan(0)
  })

  test('the month table has the base and twelve plan months, with headers', () => {
    render(<Tablero app={appView()} />)
    const table = screen.getByRole('table')
    expect(table.querySelectorAll('tbody tr')).toHaveLength(13)
    expect(screen.getByRole('columnheader', { name: 'Meta (USD ref.)' })).toBeTruthy()
    expect(screen.getByText('Base (sep–nov 2026)')).toBeTruthy()
  })

  test('shows the quarter closes as pending before the plan', () => {
    render(<Tablero app={appView()} />)
    expect(screen.getAllByText('Pendiente')).toHaveLength(4)
  })

  test('warns when the index is more than six hours old', () => {
    const createdAt = Math.floor(Date.now() / 1000) - 7 * 3600
    render(<Tablero app={appView({ createdAt })} />)
    expect(screen.getByText(/Datos con 7 h de antigüedad/)).toBeTruthy()
  })

  test('raises the alarm past 24 hours, on the projection itself', () => {
    const createdAt = Math.floor(Date.now() / 1000) - 30 * 3600
    render(<Tablero app={appView({ createdAt })} />)
    expect(screen.getByText(/Alarma: los datos tienen 30 h/)).toBeTruthy()
  })

  test('says when every price source failed', () => {
    render(
      <Tablero
        app={appView({ prices: { closed: new Map(), current: { status: 'failed' } } })}
      />,
    )
    expect(screen.getByText(/Precio de BTC no disponible/)).toBeTruthy()
  })
})

describe('the board during the plan', () => {
  function withDevFees(
    rows: [string, number | null, number][],
    extra: Record<string, DocState> = {},
  ) {
    const snap = snapshot()
    const payload: Payload = {
      ...series(['total_sats', 'coverage'], rows),
      columns: [
        { name: 'date', unit: 'date' },
        { name: 'total_sats', unit: 'sats' },
        { name: 'coverage', unit: 'ratio' },
      ],
    }
    const live = snap.documents.get('series:dev-fees:monthly:2026')!
    const documents = new Map(snap.documents)
    if (live.status === 'live') {
      documents.set('series:dev-fees:monthly:2027', {
        ...live,
        envelope: { ...live.envelope, payload },
      })
    }
    for (const [d, state] of Object.entries(extra)) documents.set(d, state)
    return documents
  }

  test('a red month pair raises the review banner', () => {
    const documents = withDevFees([
      ['2027-01', 100_000, 1],
      ['2027-02', 100_000, 1],
    ])
    // Every price source failed, so the reference stands in and the lights are final.
    const prices = {
      closed: new Map(
        ['2026-12', '2027-01', '2027-02'].map((m) => [m, { status: 'failed' as const }]),
      ),
      current: { status: 'failed' as const },
    }
    render(
      <Tablero
        app={appView({ now: Date.parse('2027-03-10T00:00:00Z'), documents, prices })}
      />,
    )
    expect(screen.getByRole('alert').textContent).toContain(
      'Dos meses seguidos bajo el piso',
    )
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'Mes 4 del plan · marzo 2027',
    )
  })

  test('a month in course is labelled projected; partial coverage says so', () => {
    const documents = withDevFees([['2027-02', 300_000, 0.9]])
    render(
      <Tablero app={appView({ now: Date.parse('2027-02-20T00:00:00Z'), documents })} />,
    )
    expect(screen.getAllByText(/proyectado/).length).toBeGreaterThan(0)
    expect(screen.getByText(/Cobertura parcial de pagos: 90,0 %/)).toBeTruthy()
  })

  test('an unverified series shows why and no figure', () => {
    const documents = withDevFees([], {
      'series:dev-fees:monthly:2027': { status: 'unverified', reason: 'hash' },
    })
    render(
      <Tablero app={appView({ now: Date.parse('2027-02-20T00:00:00Z'), documents })} />,
    )
    expect(
      screen.getAllByText('No verificado (el hash no coincide con el índice)').length,
    ).toBeGreaterThan(0)
  })

  test('a missing series says no relay delivered it', () => {
    const documents = withDevFees([], {
      'series:dev-fees:monthly:2027': { status: 'unavailable' },
    })
    render(
      <Tablero app={appView({ now: Date.parse('2027-02-20T00:00:00Z'), documents })} />,
    )
    expect(
      screen.getAllByText(
        'No disponible: ningún relay entregó series:dev-fees:monthly:2027',
      ).length,
    ).toBeGreaterThan(0)
  })

  test('a restated closed month carries the notice', () => {
    const documents = withDevFees([['2027-01', 450_000, 1]])
    const before: Payload = {
      ...series(['total_sats'], [['2027-01', 400_000]]),
    }
    const restated = new Map([
      [
        'series:dev-fees:monthly:2027',
        { because: 'backfill', fromRevision: 1, toRevision: 2, previous: before },
      ],
    ])
    render(
      <Tablero
        app={appView({ now: Date.parse('2027-02-01T00:00:00Z'), documents, restated })}
      />,
    )
    expect(screen.getAllByTitle('Re-calculado: backfill').length).toBeGreaterThan(0)
  })

  test('after the plan the card shows the result', () => {
    render(<Tablero app={appView({ now: Date.parse('2028-01-10T00:00:00Z') })} />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'Cierre del plan · noviembre 2027',
    )
  })
})

describe('the board’s empty and error states (SPEC 6.3)', () => {
  test('loading: skeletons and one accessible message', () => {
    render(<Tablero app={{ ...appView(), boot: { status: 'loading' }, board: null }} />)
    expect(screen.getByRole('status').textContent).toBe('Cargando datos de bestiario')
  })

  test('no verified index: an error, a link to the trust page, and no figure', () => {
    render(
      <Tablero
        app={{ ...appView(), boot: { status: 'failed', reason: 'timeout' }, board: null }}
      />,
    )
    expect(screen.getByRole('alert').textContent).toContain(
      'No se pudo obtener un índice verificado',
    )
    expect(screen.getByRole('link', { name: 'Verificación' }).getAttribute('href')).toBe(
      '#/confianza',
    )
    expect(screen.queryByText(/sats/)).toBeNull()
  })

  test('invalid plan: the validation errors and no light', () => {
    render(
      <Tablero
        app={{
          ...appView(),
          plan: { ok: false, errors: ['months[4]: pisoSats must be below metaSats'] },
        }}
      />,
    )
    expect(screen.getByText('months[4]: pisoSats must be below metaSats')).toBeTruthy()
    expect(screen.queryByText('En meta')).toBeNull()
  })
})
