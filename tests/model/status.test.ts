import { describe, expect, test } from 'vitest'
import { satsToUsd, trafficLight } from '~/model/status'

const REF = 59_665
const FEBRUARY = { metaSats: 528_000, pisoSats: 444_000, referencePriceUsd: REF }
const NOVEMBER = { metaSats: 2_970_000, pisoSats: 1_485_000 }

describe('USD targets at the reference price (SPEC 5.3)', () => {
  test('February 2027: target 315,03 USD and floor 264,91 USD', () => {
    expect(satsToUsd(FEBRUARY.metaSats, REF)).toBeCloseTo(315.03, 2)
    expect(satsToUsd(FEBRUARY.pisoSats, REF)).toBeCloseTo(264.91, 2)
  })

  test('November 2027: target 1.772,05 USD and floor 886,03 USD', () => {
    expect(satsToUsd(NOVEMBER.metaSats, REF)).toBeCloseTo(1772.05, 2)
    expect(satsToUsd(NOVEMBER.pisoSats, REF)).toBeCloseTo(886.03, 2)
  })
})

describe('trafficLight, the seven cases of SPEC 5.6', () => {
  test.each([
    ['A: sats at or above target', 540_000, 60_000, 'verde'],
    ['B: sats below target, USD above it because BTC rose', 470_000, 80_000, 'verde'],
    ['C: neither measure reaches target; sats above floor', 470_000, 60_000, 'amarillo'],
    ['D: sats below floor, USD above the floor', 400_000, 70_000, 'amarillo'],
    ['E: below the floor in both measures', 400_000, 55_000, 'rojo'],
    ['F: sats exactly on target; USD does not matter', 528_000, 40_000, 'verde'],
    ['G: absent value is never red', null, 60_000, 'sin-datos'],
  ] as const)('%s', (_, value, price, expected) => {
    expect(trafficLight(value, price, FEBRUARY)).toBe(expected)
  })

  test('matching the floor exactly is above the floor', () => {
    expect(trafficLight(444_000, 1, FEBRUARY)).toBe('amarillo')
  })
})
