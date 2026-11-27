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
  const coverage = Date.parse(state.coverage)
  return Number.isFinite(coverage)
    ? { status: 'ok', d, payload: state.envelope.payload, coverage }
    : { status: 'ok', d, payload: state.envelope.payload }
}

export function restatementsOf(
  restated: ReadonlyMap<string, Restated>,
): ReadonlyMap<string, Restatement> {
  return new Map(
    [...restated].map(([d, r]) => [d, { because: r.because, previous: r.previous }]),
  )
}
