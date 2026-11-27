/**
 * One month, assembled: its targets, its real fee, the value it is judged on,
 * the price that value is converted at, its light and its levers. A pure
 * function of the verified documents, the plan, the prices and `now`.
 */
import type { Payload } from '~/nostr/documents'
import type { Plan, PlanMonth } from '~/plan/types'
import { choosePrice, type KnownPrices, type PriceQuote } from '~/price/choose'
import { daysOf } from './calendar'
import { completedPerDay, completionRate, onTarget } from './indicators'
import {
  evaluate,
  judged,
  monthState,
  phaseOf,
  planMonth,
  type Evaluation,
  type MonthState,
  type Phase,
} from './months'
import { asOf, seriesCell, valueOf, type Datum, type Source } from './source'
import {
  satsToUsd,
  trafficLight,
  type Light,
  type Targets as LightTargets,
} from './status'

/** Below this share of payments seen, a month carries a coverage notice (SPEC 4). */
export const COVERAGE_THRESHOLD = 0.95

export type Restatement = { readonly because: string; readonly previous: Payload }

export type BoardInput = {
  readonly plan: Plan
  readonly now: number
  readonly source: (d: string) => Source
  readonly prices: KnownPrices
  /** By `d`: the payload a reader saw before the revision went up. */
  readonly restated: ReadonlyMap<string, Restatement>
}

export type Lever = {
  readonly value: number | null
  readonly target: number | null
  readonly ok: boolean | null
  /** The figure behind `value`, kept so a blocked document can say why. */
  readonly datum: Datum
}

export type MonthRow = {
  readonly month: string
  readonly state: MonthState
  readonly phase: Phase
  readonly target: PlanMonth | null
  readonly metaUsd: number | null
  readonly pisoUsd: number | null
  /** The accumulated real fee. */
  readonly real: Datum
  readonly derivedFromDaily: boolean
  readonly coverage: number | null
  readonly partialCoverage: boolean
  readonly evaluation: Evaluation
  readonly price: PriceQuote | null
  readonly realUsd: number | null
  /** Null for months without colour: history and future. */
  readonly light: Light | null
  readonly shareOfMeta: number | null
  readonly perDay: Lever
  readonly rate: Lever
  readonly ticket: Lever
  readonly ticketUsd: number | null
  readonly restated: string | null
  /**
   * The month is over by the archive's clock but its fee document only
   * reaches into it: the figure is still a projection, not the month's
   * result, and it does not count among closed months until closing data
   * arrives.
   */
  readonly provisional: boolean
}

export const yearOf = (month: string) => month.slice(0, 4)
export const devFeesMonthly = (month: string) =>
  `series:dev-fees:monthly:${yearOf(month)}`
export const devFeesDaily = (month: string) => `series:dev-fees:daily:${month}`
const ordersMonthly = (month: string) => `series:orders:monthly:${yearOf(month)}`
const volumeMonthly = (month: string) => `series:volume:monthly:${yearOf(month)}`

/**
 * SPEC 4: a closed month whose monthly series is missing may be summed from
 * its daily series, but only when every day is present.
 */
function realFee(
  input: BoardInput,
  month: string,
  phase: Phase,
): { real: Datum; derived: boolean } {
  const monthly = seriesCell(input.source(devFeesMonthly(month)), month, 'total_sats')
  const missing = monthly.kind === 'blocked' && monthly.status === 'unavailable'
  if (!missing || phase !== 'closed') return { real: monthly, derived: false }
  const daily = input.source(devFeesDaily(month))
  const days = daysOf(month).map((day) => valueOf(seriesCell(daily, day, 'total_sats')))
  const present = days.filter((value): value is number => value !== null)
  if (present.length < days.length) return { real: monthly, derived: false }
  const total = present.reduce((sum, value) => sum + value, 0)
  return { real: { kind: 'value', value: total }, derived: true }
}

/** SPEC 5.9: a closed month whose figure moved under a higher revision. */
function restatement(input: BoardInput, month: string, phase: Phase, real: Datum) {
  if (phase !== 'closed') return null
  const restated = input.restated.get(devFeesMonthly(month))
  if (!restated) return null
  const before = seriesCell(
    { status: 'ok', d: devFeesMonthly(month), payload: restated.previous },
    month,
    'total_sats',
  )
  return valueOf(before) === valueOf(real) ? null : restated.because
}

function lever(datum: Datum, value: number | null, target: number | null): Lever {
  return { value, target, ok: onTarget(value, target), datum }
}

type Targets = {
  readonly completedPerDay: number
  readonly completionRate: number
  readonly ticketSats: number
}

function levers(input: BoardInput, month: string, targets: Targets) {
  const orders = input.source(ordersMonthly(month))
  const ordersNow = asOf(orders, input.now)
  const completed = seriesCell(orders, month, 'completed')
  const created = seriesCell(orders, month, 'created')
  const ticket = seriesCell(input.source(volumeMonthly(month)), month, 'ticket_avg')
  const done = valueOf(completed)
  return {
    perDay: lever(
      completed,
      completedPerDay(done, month, phaseOf(month, ordersNow), ordersNow),
      targets.completedPerDay,
    ),
    rate: lever(
      completed.kind === 'value' ? created : completed,
      completionRate(done, valueOf(created)),
      targets.completionRate,
    ),
    ticket: lever(ticket, valueOf(ticket), targets.ticketSats),
  }
}

/**
 * The light, or null when it cannot be told yet: too few days to project, or
 * a price still on its way. While the price is pending only green is final —
 * the sats alone can meet the target, but only the real price can decide
 * between yellow and red (SPEC 5.4 allows the reference only once every
 * source has failed).
 */
function lightOf(
  value: number | null,
  evaluation: Evaluation,
  price: PriceQuote,
  targets: LightTargets,
): Light | null {
  if (evaluation.kind === 'insufficient') return null
  const light = trafficLight(value, price.usd, targets)
  return price.source === 'pending' && light !== 'verde' && light !== 'sin-datos'
    ? null
    : light
}

/** The instant the month's fee figures reach: their own document's coverage. */
export function feeNow(input: BoardInput, month: string): number {
  return asOf(input.source(devFeesMonthly(month)), input.now)
}

export function buildRow(input: BoardInput, month: string): MonthRow {
  const { plan, now } = input
  // Rows are built only for history and plan months, which always have a state.
  const state = monthState(plan, month, now)!
  const phase = phaseOf(month, now)
  const target = planMonth(plan, month) ?? null
  const { real, derived } = realFee(input, month, phase)
  // Projected over the days the fee document itself covers.
  const evaluation = evaluate(valueOf(real), month, feeNow(input, month))
  const value = judged(evaluation)
  const price = choosePrice(plan, month, phase, input.prices)
  const ref = plan.referencePriceUsd
  const coverage = valueOf(
    seriesCell(input.source(devFeesMonthly(month)), month, 'coverage'),
  )
  const coloured = target !== null && phase !== 'future'
  const lev = levers(input, month, target ?? plan.base)

  return {
    month,
    state,
    phase,
    target,
    metaUsd: target && satsToUsd(target.metaSats, ref),
    pisoUsd: target && satsToUsd(target.pisoSats, ref),
    real,
    derivedFromDaily: derived,
    coverage,
    partialCoverage: coverage !== null && coverage < COVERAGE_THRESHOLD,
    evaluation,
    price,
    realUsd: value !== null && price ? satsToUsd(value, price.usd) : null,
    light: coloured
      ? lightOf(value, evaluation, price!, { ...target, referencePriceUsd: ref })
      : null,
    shareOfMeta: target && value !== null ? value / target.metaSats : null,
    ...lev,
    ticketUsd:
      lev.ticket.value !== null && price ? satsToUsd(lev.ticket.value, price.usd) : null,
    restated: restatement(input, month, phase, real),
    provisional:
      phase === 'closed' &&
      (evaluation.kind === 'projected' || evaluation.kind === 'insufficient'),
  }
}
