/**
 * Geometry of the annual chart (SPEC 6.1 item 5): real fee per month as bars
 * from September 2026, the month in course with its projection stacked above
 * in a lighter tone, the target and floor lines starting from the base. Pure.
 */
import type { Board } from '~/model/board'
import type { Plan } from '~/plan/types'
import type { MonthRow } from '~/model/rows'
import { valueOf } from '~/model/source'
import { linear, linePath, niceTicks } from './scale'

export type Frame = {
  readonly width: number
  readonly height: number
  readonly top: number
  readonly right: number
  readonly bottom: number
  readonly left: number
}

export type Bar = {
  readonly month: string
  readonly x: number
  readonly width: number
  readonly real: number | null
  readonly realY: number
  readonly realHeight: number
  readonly projection: number | null
  readonly projectionY: number
  readonly projectionHeight: number
  readonly center: number
}

export type LinePoint = {
  readonly month: string
  readonly x: number
  readonly y: number
  readonly value: number
  readonly quarter: boolean
}

export type AnnualGeometry = {
  readonly bars: readonly Bar[]
  readonly meta: readonly LinePoint[]
  readonly piso: readonly LinePoint[]
  readonly metaPath: string
  readonly pisoPath: string
  readonly ticks: readonly { y: number; value: number }[]
  readonly planX: number
  readonly todayX: number | null
  readonly baseline: number
}

function projectionOf(row: MonthRow): number | null {
  return row.evaluation.kind === 'projected' ? row.evaluation.value : null
}

export function annualGeometry(board: Board, plan: Plan, frame: Frame): AnnualGeometry {
  const rows = board.rows
  const slot = (frame.width - frame.left - frame.right) / rows.length
  const xOf = (i: number) => frame.left + slot * i + slot / 2
  const peaks = rows.flatMap((row) => [
    valueOf(row.real) ?? 0,
    projectionOf(row) ?? 0,
    row.target?.metaSats ?? 0,
  ])
  const { top, ticks } = niceTicks(Math.max(plan.base.devFeeSats, ...peaks))
  const y = linear([0, top], [frame.height - frame.bottom, frame.top])
  const baseline = y(0)

  const bars = rows.map((row, i): Bar => {
    const real = valueOf(row.real)
    const projection = projectionOf(row)
    const realY = y(real ?? 0)
    const projectionY = y(Math.max(projection ?? 0, real ?? 0))
    return {
      month: row.month,
      x: xOf(i) - slot * 0.32,
      width: slot * 0.64,
      center: xOf(i),
      real,
      realY,
      realHeight: baseline - realY,
      projection,
      projectionY,
      projectionHeight: realY - projectionY,
    }
  })

  const firstPlan = rows.findIndex((row) => row.target !== null)
  const startIndex = firstPlan - 1
  const start = (value: number): LinePoint[] =>
    startIndex >= 0
      ? [{ month: 'base', x: xOf(startIndex), y: y(value), value, quarter: false }]
      : []
  const line = (pick: (row: MonthRow) => number): LinePoint[] => [
    ...start(plan.base.devFeeSats),
    ...rows.flatMap((row, i) =>
      row.target
        ? [
            {
              month: row.month,
              x: xOf(i),
              y: y(pick(row)),
              value: pick(row),
              quarter: row.target.quarterClose !== undefined,
            },
          ]
        : [],
    ),
  ]
  const meta = line((row) => row.target!.metaSats)
  const piso = line((row) => row.target!.pisoSats)
  const currentIndex = rows.findIndex((row) => row.month === board.current.month)

  return {
    bars,
    meta,
    piso,
    metaPath: linePath(meta),
    pisoPath: linePath(piso),
    ticks: ticks.map((value) => ({ value, y: y(value) })),
    planX: frame.left + slot * Math.max(0, firstPlan),
    todayX: board.stage === 'after' || currentIndex < 0 ? null : xOf(currentIndex),
    baseline,
  }
}
