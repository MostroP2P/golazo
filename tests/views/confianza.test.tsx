import { beforeEach, describe, expect, test, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/preact'
import { Confianza } from '~/views/Confianza'
import { DEFAULT_RELAYS } from '~/config'
import { appView } from '../helpers/app'

beforeEach(() => localStorage.clear())

describe('the trust page (SPEC 6.2)', () => {
  test('names the publisher as an npub derived from the configured key', () => {
    render(<Confianza app={appView()} onRelaysChange={() => {}} />)
    expect(screen.getByText(/^npub1/).textContent).toMatch(/^npub1[0-9a-z]{58}$/)
  })

  test('lists the relays, the index snapshot and every document with its state', () => {
    // Arrange
    const app = appView()
    const documents = new Map(app.documents)
    documents.set('series:dev-fees:monthly:2027', { status: 'unavailable' })
    documents.set('summary:30d', { status: 'unverified', reason: 'signature' })

    // Act
    render(<Confianza app={{ ...app, documents }} onRelaysChange={() => {}} />)

    // Assert
    for (const url of DEFAULT_RELAYS) expect(screen.getByText(url)).toBeTruthy()
    expect(screen.getByText(/Snapshot 20261127T/)).toBeTruthy()
    expect(screen.getByText('series:dev-fees:monthly:2026')).toBeTruthy()
    expect(screen.getByText('no disponible')).toBeTruthy()
    expect(screen.getByText('no verificado (firma inválida)')).toBeTruthy()
    expect(screen.getAllByText('verificado').length).toBeGreaterThan(5)
  })

  test('shows restatements seen in this session', () => {
    const restated = new Map([
      [
        'summary:30d',
        { because: 'backfill', fromRevision: 4, toRevision: 5, previous: {} as never },
      ],
    ])
    render(<Confianza app={appView({ restated })} onRelaysChange={() => {}} />)
    expect(screen.getByText(/4 → 5 \(backfill\)/)).toBeTruthy()
  })

  test('says when the index failed, or is still loading', () => {
    const { rerender } = render(
      <Confianza
        app={{ ...appView(), boot: { status: 'failed', reason: 'timeout' } }}
        onRelaysChange={() => {}}
      />,
    )
    expect(screen.getByText('ningún relay respondió a tiempo')).toBeTruthy()
    rerender(
      <Confianza
        app={{ ...appView(), boot: { status: 'loading' } }}
        onRelaysChange={() => {}}
      />,
    )
    expect(screen.getAllByText('cargando').length).toBeGreaterThan(0)
  })

  test('adds a relay, refuses a bad one, removes one and resets to the defaults', () => {
    // Arrange
    const changed = vi.fn()
    render(<Confianza app={appView()} onRelaysChange={changed} />)
    const input = screen.getByLabelText('Agregar relay')

    // A bad address is refused with a message.
    fireEvent.input(input, { target: { value: 'https://nope' } })
    fireEvent.submit(input.closest('form')!)
    expect(screen.getByText('Escribí una dirección wss:// válida.')).toBeTruthy()
    expect(changed).not.toHaveBeenCalled()

    // A good one is saved.
    fireEvent.input(input, { target: { value: 'wss://relay.example' } })
    fireEvent.submit(input.closest('form')!)
    expect(JSON.parse(localStorage.getItem('golazo:relays')!)).toContain(
      'wss://relay.example',
    )
    expect(changed).toHaveBeenCalledTimes(1)

    // Removing one saves the rest.
    fireEvent.click(screen.getByRole('button', { name: 'Quitar wss://nos.lol' }))
    expect(JSON.parse(localStorage.getItem('golazo:relays')!)).not.toContain(
      'wss://nos.lol',
    )
  })

  test('a custom list can go back to the defaults', () => {
    localStorage.setItem('golazo:relays', JSON.stringify(['wss://relay.example']))
    const changed = vi.fn()
    render(<Confianza app={appView()} onRelaysChange={changed} />)
    expect(screen.getByText(/Usás una lista propia de relays/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /^Quitar/ })).toBeNull()

    fireEvent.click(
      screen.getByRole('button', { name: 'Volver a los relays por defecto' }),
    )

    expect(localStorage.getItem('golazo:relays')).toBeNull()
    expect(changed).toHaveBeenCalled()
  })
})

describe('the language picker', () => {
  test('stores the chosen locale and asks for a reload', async () => {
    const { LanguagePicker } = await import('~/components/LanguagePicker')
    const changed = vi.fn()
    render(<LanguagePicker onChange={changed} />)
    fireEvent.change(screen.getByLabelText('Idioma'), { target: { value: 'en' } })
    expect(localStorage.getItem('golazo:locale')).toBe('en')
    expect(changed).toHaveBeenCalled()
    localStorage.setItem('golazo:locale', 'es')
  })
})
