import { describe, expect, test } from 'vitest'
import { linear, linePath, niceTicks } from '~/charts/scale'
import { annualGeometry, type Frame } from '~/charts/annual'
import { paceGeometry } from '~/charts/pace'
import { buildBoard } from '~/model/board'
import { at, realPlan } from '../helpers/plan'
import { fixturePayloads, sourcesFrom } from '../helpers/sources'

const plan = realPlan()
const FRAME: Frame = { width: 760, height: 320, top: 20, right: 10, bottom: 30, left: 50 }
const board = (now: string) =>
  buildBoard({
    plan,
    now: at(now),
    source: sourcesFrom(fixturePayloads()),
    prices: { closed: new Map(), current: { status: 'failed' } },
    restated: new Map(),
  })

describe('scale', () => {
  test('maps a domain onto a range, inverted for SVG y', () => {
    const y = linear([0, 100], [300, 0])
    expect(y(0)).toBe(300)
    expect(y(50)).toBe(150)
  })

  test('survives an empty domain', () => {
    expect(linear([5, 5], [0, 10])(5)).toBe(0)
  })

  test('rounds the top up to a nice step', () => {
    expect(niceTicks(2_970_000)).toEqual({
      top: 3_000_000,
      ticks: [0, 1_000_000, 2_000_000, 3_000_000],
    })
    expect(niceTicks(0)).toEqual({ top: 1, ticks: [0, 1] })
  })

  test('draws a path that lifts the pen over gaps', () => {
    expect(
      linePath([
        { x: 0, y: 0 },
        { x: 1, y: null },
        { x: 2, y: 2 },
        { x: 3, y: 3 },
      ]),
    ).toBe('M0.0,0.0M2.0,2.0L3.0,3.0')
  })
})

describe('annualGeometry', () => {
  const g = annualGeometry(board('2026-11-27T18:37:00Z'), plan, FRAME)

  test('one bar per month from September 2026, starting at zero', () => {
    expect(g.bars).toHaveLength(15)
    expect(g.ticks[0]!.value).toBe(0)
    expect(g.bars[0]!.real).toBe(238_433)
  })

  test('November shows its projection stacked above what it has accumulated', () => {
    const november = g.bars.find((b) => b.month === '2026-11')!
    expect(november.projection).toBeGreaterThan(november.real!)
    expect(november.projectionHeight).toBeGreaterThan(0)
  })

  test('future months have no bar height', () => {
    expect(g.bars.at(-1)!.realHeight).toBe(0)
  })

  test('target and floor start at the base and have twelve points each, quarters larger', () => {
    expect(g.meta).toHaveLength(13)
    expect(g.meta[0]).toMatchObject({ month: 'base', value: 297_000 })
    expect(g.piso).toHaveLength(13)
    expect(g.meta.filter((p) => p.quarter).map((p) => p.month)).toEqual([
      '2027-02',
      '2027-05',
      '2027-08',
      '2027-11',
    ])
    expect(g.metaPath.startsWith('M')).toBe(true)
  })

  test('marks where the plan starts and where today is', () => {
    expect(g.planX).toBeGreaterThan(g.bars[2]!.center)
    expect(g.todayX).toBe(g.bars[2]!.center)
  })

  test('has no "today" once the plan is over', () => {
    expect(annualGeometry(board('2028-01-05T00:00:00Z'), plan, FRAME).todayX).toBeNull()
  })

  test('without history the lines start at the first plan month', () => {
    const b = buildBoard({
      plan: { ...plan, history: [] },
      now: at('2026-12-10T00:00:00Z'),
      source: sourcesFrom(fixturePayloads()),
      prices: { closed: new Map(), current: { status: 'failed' } },
      restated: new Map(),
    })
    const geometry = annualGeometry(b, { ...plan, history: [] }, FRAME)
    expect(geometry.meta).toHaveLength(12)
    expect(geometry.planX).toBe(FRAME.left)
  })
})

describe('paceGeometry', () => {
  test('draws November up to day 27, against the base when there is no target', () => {
    const b = board('2026-11-27T18:37:00Z')
    const g = paceGeometry(b.pace, FRAME, 297_000)
    expect(g.last?.day).toBe(27)
    expect(g.pisoPath).toBe('')
    expect(g.metaPath).toMatch(/^M50,290L750,/)
    expect(g.dayTicks.map((t) => t.day)).toEqual([1, 5, 10, 15, 20, 25, 30])
  })

  test('with a target and floor, both are drawn; with no data, no last point', () => {
    const g = paceGeometry(
      {
        month: '2027-02',
        days: 28,
        points: [{ day: 1, cumulative: null }],
        metaSats: 528_000,
        pisoSats: 444_000,
        datum: null,
      },
      FRAME,
      297_000,
    )
    expect(g.last).toBeNull()
    expect(g.pisoPath).not.toBe('')
    expect(g.dayTicks.at(-1)!.day).toBe(28)
  })
})
