/** The real plan, validated, for tests that need one. */
import raw from '../../config/plan-2027.json'
import { validatePlan } from '~/plan/validate'
import type { Plan } from '~/plan/types'

export function realPlan(): Plan {
  const result = validatePlan(raw)
  if (!result.ok) throw new Error(result.errors.join('; '))
  return result.plan
}

/** A deep, mutable copy of the raw plan JSON, for tests that break it. */
export function rawPlan(): Record<string, unknown> & {
  months: Record<string, unknown>[]
  base: Record<string, unknown>
  history: unknown
  monthlyPriceUsd: unknown
} {
  return structuredClone(raw)
}

export const at = (iso: string) => Date.parse(iso)
