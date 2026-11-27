/**
 * Validation of `config/plan-2027.json`, SPEC 2.
 *
 * The file is edited by hand in pull requests, so every rule the spec names is
 * checked and every failure is reported, not just the first: a reviewer fixing
 * one typo should not discover the next one on the following deploy. An
 * invalid plan renders its errors and no traffic light at all.
 */
import { addMonths, isMonth } from '~/model/calendar'
import type { Plan, PlanBase, PlanMonth, PlanResult } from './types'

type Json = Record<string, unknown>

const PLAN_LENGTH = 12
const QUARTERS = new Set(['T1', 'T2', 'T3', 'T4'])

function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isPositive(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function isPositiveInt(value: unknown): value is number {
  return isPositive(value) && Number.isInteger(value)
}

function isRate(value: unknown): value is number {
  return isPositive(value) && value <= 1
}

const MONTH_NUMBERS = ['completedPerDay', 'ticketSats', 'createdPerMonth', 'activeNodes']

function checkMonth(raw: unknown, index: number, errors: string[]): raw is PlanMonth {
  const where = `months[${index}]`
  if (!isObject(raw)) {
    errors.push(`${where}: not an object`)
    return false
  }
  const before = errors.length
  if (raw['n'] !== index + 1) errors.push(`${where}.n: expected ${index + 1}`)
  if (!isMonth(raw['month'])) errors.push(`${where}.month: expected YYYY-MM`)
  if (!isPositiveInt(raw['metaSats'])) errors.push(`${where}.metaSats: positive integer`)
  if (!isPositiveInt(raw['pisoSats'])) errors.push(`${where}.pisoSats: positive integer`)
  for (const key of MONTH_NUMBERS) {
    if (!isPositive(raw[key])) errors.push(`${where}.${key}: positive number`)
  }
  if (!isRate(raw['completionRate'])) errors.push(`${where}.completionRate: in (0, 1]`)
  const quarter = raw['quarterClose']
  if (quarter !== undefined && !QUARTERS.has(quarter as string)) {
    errors.push(`${where}.quarterClose: one of T1, T2, T3, T4`)
  }
  return errors.length === before
}

/** Rules across months: consecutive, piso < meta, targets increasing. */
function checkSequence(months: readonly PlanMonth[], errors: string[]): void {
  months.forEach((month, i) => {
    if (month.pisoSats >= month.metaSats) {
      errors.push(`months[${i}]: pisoSats must be below metaSats`)
    }
    const previous = months[i - 1]
    if (!previous) return
    if (month.month !== addMonths(previous.month, 1)) {
      errors.push(`months[${i}].month: expected ${addMonths(previous.month, 1)}`)
    }
    if (month.metaSats <= previous.metaSats) {
      errors.push(`months[${i}].metaSats: must grow from the previous month`)
    }
    if (month.pisoSats <= previous.pisoSats) {
      errors.push(`months[${i}].pisoSats: must grow from the previous month`)
    }
  })
}

function checkBase(raw: unknown, errors: string[]): raw is PlanBase {
  if (!isObject(raw)) {
    errors.push('base: not an object')
    return false
  }
  const before = errors.length
  const period = raw['period']
  if (
    !isObject(period) ||
    typeof period['from'] !== 'string' ||
    typeof period['until'] !== 'string'
  ) {
    errors.push('base.period: expected {from, until}')
  }
  for (const key of ['devFeeSats', ...MONTH_NUMBERS]) {
    if (!isPositive(raw[key])) errors.push(`base.${key}: positive number`)
  }
  if (!isRate(raw['completionRate'])) errors.push('base.completionRate: in (0, 1]')
  return errors.length === before
}

function checkHistory(raw: unknown, firstMonth: string | undefined, errors: string[]) {
  if (!Array.isArray(raw) || !raw.every(isMonth)) {
    errors.push('history: expected a list of YYYY-MM')
    return
  }
  raw.forEach((month, i) => {
    const next = raw[i + 1] ?? firstMonth
    if (next !== undefined && addMonths(month, 1) !== next) {
      errors.push(`history[${i}]: months must be consecutive up to the plan`)
    }
  })
}

function checkPrices(raw: unknown, errors: string[]): void {
  if (!isObject(raw)) {
    errors.push('monthlyPriceUsd: expected an object')
    return
  }
  for (const [key, price] of Object.entries(raw)) {
    const where = `monthlyPriceUsd.${key}`
    if (!isMonth(key)) errors.push(`${where}: key must be YYYY-MM`)
    if (!isPositive(price)) errors.push(`${where}: positive number`)
  }
}

export function validatePlan(raw: unknown): PlanResult {
  const errors: string[] = []
  if (!isObject(raw)) return { ok: false, errors: ['plan: not an object'] }

  if (raw['version'] !== 1) errors.push('version: expected 1')
  if (typeof raw['plan'] !== 'string') errors.push('plan: expected a name')
  if (!isPositive(raw['referencePriceUsd'])) {
    errors.push('referencePriceUsd: positive number')
  }
  checkBase(raw['base'], errors)
  checkPrices(raw['monthlyPriceUsd'], errors)

  const months = raw['months']
  if (!Array.isArray(months) || months.length !== PLAN_LENGTH) {
    errors.push(`months: expected exactly ${PLAN_LENGTH} months`)
  } else {
    const valid = months.map((month, i) => checkMonth(month, i, errors))
    if (valid.every(Boolean)) checkSequence(months as PlanMonth[], errors)
  }

  const first = Array.isArray(months)
    ? (months[0] as Json | undefined)?.['month']
    : undefined
  checkHistory(raw['history'], isMonth(first) ? first : undefined, errors)

  return errors.length > 0 ? { ok: false, errors } : { ok: true, plan: raw as Plan }
}
