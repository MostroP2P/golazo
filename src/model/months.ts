/**
 * Each month's state and the value it is judged on, SPEC 5.1–5.2.
 *
 * `now` is always the archive's `coverage.last_event_at`, never the reader's
 * clock: a projection is only as fresh as the data under it.
 */
import type { Plan, PlanMonth } from '~/plan/types'
import {
  daysElapsed,
  daysInMonth,
  monthEnd,
  monthOf,
  monthRange,
  monthStart,
} from './calendar'

export type MonthState = 'previo' | 'cerrado' | 'en-curso' | 'futuro'

export type Phase = 'closed' | 'current' | 'future'

/** Below this many days a month is too young to project (SPEC 5.2). */
export const MIN_PROJECTION_DAYS = 3

export function phaseOf(month: string, now: number): Phase {
  if (now >= monthEnd(month)) return 'closed'
  if (now >= monthStart(month)) return 'current'
  return 'future'
}

export function planMonth(plan: Plan, month: string): PlanMonth | undefined {
  return plan.months.find((m) => m.month === month)
}

/** SPEC 5.1. Null for a month that is neither history nor plan. */
export function monthState(plan: Plan, month: string, now: number): MonthState | null {
  if (plan.history.includes(month)) return 'previo'
  if (!planMonth(plan, month)) return null
  const phase = phaseOf(month, now)
  if (phase === 'closed') return 'cerrado'
  return phase === 'current' ? 'en-curso' : 'futuro'
}

/**
 * The plan month in course, or null before the plan starts and after it ends.
 */
export function currentPlanMonth(plan: Plan, now: number): PlanMonth | null {
  return planMonth(plan, monthOf(now)) ?? null
}

export type Evaluation =
  | { readonly kind: 'future' }
  | { readonly kind: 'absent' }
  | { readonly kind: 'insufficient'; readonly accumulated: number; readonly days: number }
  | { readonly kind: 'closed'; readonly value: number }
  | {
      readonly kind: 'projected'
      readonly value: number
      readonly accumulated: number
      readonly days: number
    }

/** V for a month, from the real accumulated fee (`null` when absent). */
export function evaluate(real: number | null, month: string, now: number): Evaluation {
  const phase = phaseOf(month, now)
  if (phase === 'future') return { kind: 'future' }
  if (real === null) return { kind: 'absent' }
  if (phase === 'closed') return { kind: 'closed', value: real }
  const days = daysElapsed(month, now)
  if (days < MIN_PROJECTION_DAYS) return { kind: 'insufficient', accumulated: real, days }
  return {
    kind: 'projected',
    value: (real * daysInMonth(month)) / days,
    accumulated: real,
    days,
  }
}

/** V itself, or null when there is nothing to judge. */
export function judged(evaluation: Evaluation): number | null {
  return evaluation.kind === 'closed' || evaluation.kind === 'projected'
    ? evaluation.value
    : null
}

/**
 * The documents Golazo reads (SPEC 4): the yearly series for 2026 and 2027,
 * the daily series of every month from the first history month to the month of
 * `now` (capped at the plan's last), and the 30-day summary.
 */
export function neededDocuments(plan: Plan, now: number): string[] {
  const first = plan.history[0] ?? plan.months[0]!.month
  const last = plan.months[plan.months.length - 1]!.month
  const nowMonth = monthOf(now)
  const until = nowMonth < last ? nowMonth : last
  const years = [...new Set(monthRange(first, last).map((m) => m.slice(0, 4)))]
  const yearly = ['dev-fees', 'orders', 'volume'].flatMap((report) =>
    years.map((year) => `series:${report}:monthly:${year}`),
  )
  const daily = monthRange(first, until).flatMap((month) => [
    `series:dev-fees:daily:${month}`,
    `series:orders:daily:${month}`,
  ])
  return [...yearly, ...daily, 'summary:30d']
}
