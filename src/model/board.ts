/**
 * The whole board, SPEC 5.8 and 6.1: every month's row, the month the card
 * shows, the year's indicators and the pace of the month in course.
 */
import type { Plan } from '~/plan/types'
import { addMonths, DAY_MS, daysInMonth, daysOf, monthOf, monthStart } from './calendar'
import {
  accumulated,
  closedOnTarget,
  growth,
  progressToFinal,
  requiredRate,
  reviewAlert,
  type Accumulated,
} from './indicators'
import { judged, phaseOf } from './months'
import { buildRow, devFeesDaily, type BoardInput, type MonthRow } from './rows'
import { metricValue, seriesCell, valueOf, type Datum } from './source'
import type { Light } from './status'

/** Where `now` falls relative to the plan. */
export type Stage = 'before' | 'during' | 'after'

export type QuarterMark = {
  readonly quarter: string
  readonly month: string
  readonly light: Light | null
  readonly closed: boolean
}

export type PacePoint = { readonly day: number; readonly cumulative: number | null }

export type Pace = {
  readonly month: string
  readonly days: number
  readonly points: readonly PacePoint[]
  readonly metaSats: number | null
  readonly pisoSats: number | null
  /** Why the daily series could not be drawn, when it could not. */
  readonly datum: Datum | null
}

export type YearSummary = {
  readonly closedOnTarget: { readonly green: number; readonly total: number }
  readonly previousMonth: string
  readonly growth: number | null
  readonly requiredRate: number | null
  readonly progress: number | null
  readonly accumulated: Accumulated
  readonly reviewAlert: boolean
  readonly quarters: readonly QuarterMark[]
}

export type Board = {
  readonly stage: Stage
  readonly rows: readonly MonthRow[]
  readonly current: MonthRow
  /** The plan month number of the card, 0 before the plan. */
  readonly n: number
  readonly year: YearSummary
  readonly activeNodes: Datum
  readonly pace: Pace
}

function stageOf(plan: Plan, now: number): Stage {
  const first = plan.months[0]!.month
  const last = plan.months[plan.months.length - 1]!.month
  if (phaseOf(first, now) === 'future') return 'before'
  return phaseOf(last, now) === 'closed' ? 'after' : 'during'
}

/** The month the card shows: the month in course, clamped to the plan's span. */
function cardMonth(plan: Plan, now: number, stage: Stage): string {
  if (stage === 'after') return plan.months[plan.months.length - 1]!.month
  const month = monthOf(now)
  const first = plan.history[0] ?? plan.months[0]!.month
  return month < first ? first : month
}

function pace(input: BoardInput, row: MonthRow): Pace {
  const source = input.source(devFeesDaily(row.month))
  const elapsed = Math.min(
    daysInMonth(row.month),
    Math.floor((input.now - monthStart(row.month)) / DAY_MS) + 1,
  )
  let running = 0
  const points = daysOf(row.month)
    .slice(0, Math.max(0, elapsed))
    .map((day, i) => {
      const value = valueOf(seriesCell(source, day, 'total_sats'))
      if (value === null) return { day: i + 1, cumulative: null }
      running += value
      return { day: i + 1, cumulative: running }
    })
  return {
    month: row.month,
    days: daysInMonth(row.month),
    points,
    metaSats: row.target?.metaSats ?? null,
    pisoSats: row.target?.pisoSats ?? null,
    datum: source.status === 'ok' ? null : seriesCell(source, row.month, 'total_sats'),
  }
}

function quarters(rows: readonly MonthRow[]): QuarterMark[] {
  return rows.flatMap((row) =>
    row.target?.quarterClose
      ? [
          {
            quarter: row.target.quarterClose,
            month: row.month,
            light: row.light,
            closed: row.phase === 'closed',
          },
        ]
      : [],
  )
}

function yearSummary(input: BoardInput, rows: readonly MonthRow[], current: MonthRow) {
  const { plan, now } = input
  const planRows = rows.filter((row) => row.target !== null)
  const closedLights = planRows
    .filter((row) => row.state === 'cerrado')
    // A closed month whose price is still on its way has no light yet; it
    // counts as no data until it does, so a pending price never raises the
    // review alert.
    .map((row) => row.light ?? 'sin-datos')
  const previousMonth = addMonths(current.month, -1)
  const previous = rows.find((row) => row.month === previousMonth)
  const value = judged(current.evaluation)
  const reals = new Map(planRows.map((row) => [row.month, valueOf(row.real)]))
  return {
    closedOnTarget: closedOnTarget(closedLights),
    previousMonth,
    growth: growth(value, previous ? valueOf(previous.real) : null),
    requiredRate: requiredRate(value, current.target?.n ?? 0, plan),
    progress: progressToFinal(value, plan),
    accumulated: accumulated(plan, reals, now, (month) => phaseOf(month, now)),
    reviewAlert: reviewAlert(closedLights),
    quarters: quarters(planRows),
  }
}

export function buildBoard(input: BoardInput): Board {
  const { plan, now } = input
  const stage = stageOf(plan, now)
  const months = [...plan.history, ...plan.months.map((m) => m.month)]
  const rows = months.map((month) => buildRow(input, month))
  const shown = cardMonth(plan, now, stage)
  // `cardMonth` is clamped to the span the rows cover.
  const current = rows.find((row) => row.month === shown)!
  return {
    stage,
    rows,
    current,
    n: current.target?.n ?? 0,
    year: yearSummary(input, rows, current),
    activeNodes: metricValue(input.source('summary:30d'), 'summary.active_instances'),
    pace: pace(input, current),
  }
}
