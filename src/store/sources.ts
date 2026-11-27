/**
 * The store's document states, as the model's sources. The one seam between
 * what arrived over the wire and what the model may read.
 */
import type { Source } from '~/model/source'
import type { Restatement } from '~/model/rows'
import type { DocState, Restated } from './store'

export function sourceOf(documents: ReadonlyMap<string, DocState>, d: string): Source {
  const state = documents.get(d)
  if (!state || state.status === 'loading') return { status: 'loading', d }
  if (state.status === 'unavailable') return { status: 'unavailable', d }
  if (state.status === 'unverified')
    return { status: 'unverified', d, reason: state.reason }
  return { status: 'ok', d, payload: state.envelope.payload }
}

/**
 * The instant the board is computed at: the archive's `coverage.last_event_at`,
 * but no later than the oldest coverage among the documents on screen. A
 * document kept after a newer index moved its hash only knows the time up to
 * its own index, and projecting its figures over time it never saw would
 * understate them.
 */
export function dataNow(
  documents: ReadonlyMap<string, DocState>,
  needed: readonly string[],
  indexCoverage: string,
): number {
  const times = needed.flatMap((d) => {
    const state = documents.get(d)
    return state && (state.status === 'live' || state.status === 'cached')
      ? [Date.parse(state.coverage)]
      : []
  })
  return Math.min(Date.parse(indexCoverage), ...times.filter(Number.isFinite))
}

export function restatementsOf(
  restated: ReadonlyMap<string, Restated>,
): ReadonlyMap<string, Restatement> {
  return new Map(
    [...restated].map(([d, r]) => [d, { because: r.because, previous: r.previous }]),
  )
}
