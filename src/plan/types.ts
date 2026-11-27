/**
 * The plan's shape, SPEC 2. USD targets are never stored: they are derived
 * from sats and the fixed reference price (SPEC 5.3).
 */
export type Quarter = 'T1' | 'T2' | 'T3' | 'T4'

export type PlanMonth = {
  readonly n: number
  /** `YYYY-MM`, UTC. */
  readonly month: string
  readonly metaSats: number
  readonly pisoSats: number
  readonly completedPerDay: number
  readonly completionRate: number
  readonly ticketSats: number
  readonly createdPerMonth: number
  readonly activeNodes: number
  readonly quarterClose?: Quarter
}

export type PlanBase = {
  readonly period: { readonly from: string; readonly until: string }
  readonly devFeeSats: number
  readonly completedPerDay: number
  readonly completionRate: number
  readonly ticketSats: number
  readonly createdPerMonth: number
  readonly activeNodes: number
}

export type Plan = {
  readonly version: 1
  readonly plan: string
  readonly referencePriceUsd: number
  readonly base: PlanBase
  /** Months before the plan, shown without colour. */
  readonly history: readonly string[]
  readonly months: readonly PlanMonth[]
  /** Prices the team froze for closed months, `YYYY-MM` → USD/BTC. */
  readonly monthlyPriceUsd: Readonly<Record<string, number>>
}

export type PlanResult =
  | { readonly ok: true; readonly plan: Plan }
  | { readonly ok: false; readonly errors: readonly string[] }
