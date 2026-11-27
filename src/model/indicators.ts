/**
 * Supporting metrics and the year's indicators, SPEC 5.7–5.8. Pure: every
 * input is a figure already read (or `null` for absence) and `now`.
 */
import type { Plan } from '~/plan/types'
import { daysElapsed, daysInMonth } from './calendar'
import type { Light } from './status'
import type { Phase } from './months'

/** The monthly growth the ×10 curve needs (1.212^12 ≈ 10). */
export const REQUIRED_GROWTH = 0.212

/** Completed orders per day: a closed month over its days, a current one over elapsed. */
export function completedPerDay(
  completed: number | null,
  month: string,
  phase: Phase,
  now: number,
): number | null {
  if (completed === null || phase === 'future') return null
  const days = phase === 'closed' ? daysInMonth(month) : daysElapsed(month, now)
  return days > 0 ? completed / days : null
}

/** `completed / created`; absent when nothing was created. */
export function completionRate(
  completed: number | null,
  created: number | null,
): number | null {
  if (completed === null || created === null || created === 0) return null
  return completed / created
}

/** "More is better" (SPEC 5.7). Absent when either side is. */
export function onTarget(value: number | null, target: number | null): boolean | null {
  if (value === null || target === null) return null
  return value >= target
}

export function finalTarget(plan: Plan): number {
  return plan.months[plan.months.length - 1]!.metaSats
}

/**
 * How far the monthly fee has travelled from the base toward the final
 * target: `(V − base) / (final − base)`. 0 at the base, 1 on the ×10 target,
 * negative below the base. Measuring from zero instead would start the bar a
 * tenth full before anything had grown.
 */
export function progressToFinal(value: number | null, plan: Plan): number | null {
  const base = plan.base.devFeeSats
  return value === null ? null : (value - base) / (finalTarget(plan) - base)
}

/** `V(m) / real(m−1) − 1`. */
export function growth(value: number | null, previous: number | null): number | null {
  if (value === null || previous === null || previous <= 0) return null
  return value / previous - 1
}

/**
 * `(final / V)^(1 / (12 − n)) − 1`: the monthly growth still needed. Hidden in
 * the last month, where no months are left to grow in.
 */
export function requiredRate(value: number | null, n: number, plan: Plan): number | null {
  const remaining = plan.months.length - n
  if (value === null || value <= 0 || remaining <= 0) return null
  return (finalTarget(plan) / value) ** (1 / remaining) - 1
}

export function annualTarget(plan: Plan): number {
  return plan.months.reduce((sum, month) => sum + month.metaSats, 0)
}

export type Accumulated = {
  /** Real fee of plan months so far; the current month as accumulated, not projected. */
  readonly actual: number
  /** Targets of closed months plus the current month's target pro rata. */
  readonly target: number
  readonly annual: number
  /** Plan months so far whose fee is absent: the sum is a lower bound. */
  readonly missing: readonly string[]
}

/**
 * SPEC 5.8. `reals` maps a month to its accumulated real fee, `null` when
 * absent. A month that has not started contributes nothing to either side.
 */
export function accumulated(
  plan: Plan,
  reals: ReadonlyMap<string, number | null>,
  now: number,
  phaseOf: (month: string) => Phase,
): Accumulated {
  let actual = 0
  let target = 0
  const missing: string[] = []
  for (const month of plan.months) {
    const phase = phaseOf(month.month)
    if (phase === 'future') continue
    const real = reals.get(month.month) ?? null
    if (real === null) missing.push(month.month)
    else actual += real
    target +=
      phase === 'closed'
        ? month.metaSats
        : (month.metaSats * daysElapsed(month.month, now)) / daysInMonth(month.month)
  }
  return { actual, target, annual: annualTarget(plan), missing }
}

/** Closed months in green over all closed months. */
export function closedOnTarget(lights: readonly Light[]): {
  green: number
  total: number
} {
  return { green: lights.filter((l) => l === 'verde').length, total: lights.length }
}

/** Two closed months in a row below the floor: the plan must be reviewed. */
export function reviewAlert(closedLights: readonly Light[]): boolean {
  const lastTwo = closedLights.slice(-2)
  return lastTwo.length === 2 && lastTwo.every((light) => light === 'rojo')
}
