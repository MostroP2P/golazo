/**
 * The shape of a catalogue (SPEC 6.4). `en.ts` is the source and `es.ts` its
 * translation; another locale is another object of this type.
 */
export type Strings = {
  readonly appName: string
  readonly planName: string
  readonly connection: Record<'live' | 'cached' | 'offline' | 'connecting', string>
  readonly dataAt: (when: string) => string
  readonly refresh: string
  readonly trustLink: string
  readonly boardLink: string
  readonly staleWarning: (hours: number) => string
  readonly staleAlarm: (hours: number) => string
  readonly loading: string
  readonly bootFailed: string
  readonly bootFailedReason: (reason: string) => string
  readonly invalidPlan: string
  readonly unavailable: (d: string) => string
  readonly unverified: (reason: string) => string
  readonly failure: Record<string, string>
  readonly light: Record<'verde' | 'amarillo' | 'rojo' | 'sin-datos', string>
  readonly insufficient: string
  readonly projected: string
  readonly eyebrowResult: string
  readonly eyebrowLive: string
  readonly accumulatedLabel: string
  readonly ofTarget: string
  readonly planMonth: (n: number, month: string) => string
  readonly beforePlan: (month: string) => string
  readonly afterPlan: string
  readonly accumulatedIn: (sats: string, days: string, total: number) => string
  readonly closedWith: (sats: string) => string
  readonly projection: string
  readonly target: string
  readonly floor: string
  readonly orUsd: (usd: string) => string
  readonly vsBase: (change: string, base: string) => string
  readonly firstTarget: (sats: string, usd: string) => string
  readonly progressFinal: (pct: string, final: string) => string
  readonly finalTargetUsd: (usd: string) => string
  readonly markBase: (sats: string) => string
  readonly markFloor: string
  readonly markTarget: string
  readonly year: string
  readonly closedLabel: string
  readonly perMonth: string
  readonly closedOnTarget: (green: number, total: number) => string
  readonly growthVs: (month: string) => string
  readonly growthNeeded: (pct: string) => string
  readonly requiredRate: string
  readonly accumulated: string
  readonly accumulatedOf: (actual: string, target: string) => string
  readonly accumulatedAnnual: (annual: string) => string
  readonly accumulatedMissing: (months: string) => string
  readonly reviewBanner: string
  readonly leversTitle: string
  readonly levers: Record<'perDay' | 'rate' | 'ticket' | 'nodes', string>
  readonly leverBase: (value: string) => string
  readonly planStartsOn: string
  readonly leverTarget: (value: string) => string
  readonly leverFinal: (value: string) => string
  readonly onTarget: string
  readonly belowTarget: string
  readonly noHistory: string
  readonly annualChart: string
  readonly annualChartDesc: string
  readonly real: string
  readonly projectedLegend: string
  readonly planStarts: string
  readonly today: string
  readonly paceChart: (month: string) => string
  readonly paceChartDesc: string
  readonly paceReal: string
  readonly paceTarget: string
  readonly paceFloor: string
  readonly day: (n: number) => string
  readonly table: string
  readonly columns: readonly string[]
  readonly baseRow: string
  readonly proj: string
  readonly tagRestated: string
  readonly tagCoverage: string
  readonly paceBase: (sats: string) => string
  readonly quarters: string
  readonly quarterPending: string
  readonly priceSource: Record<string, string>
  readonly priceUsed: (price: string, source: string) => string
  readonly priceFallback: string
  readonly partialCoverage: (pct: string) => string
  readonly restated: (because: string) => string
  readonly derivedDaily: string
  readonly footerProof: string
  readonly footerPlan: string
  readonly footerSource: string
  readonly language: string
  readonly trust: {
    readonly title: string
    readonly intro: string
    readonly publisher: string
    readonly relays: string
    readonly relayStatus: Record<'connecting' | 'live' | 'silent' | 'failed', string>
    readonly newest: string
    readonly index: string
    readonly snapshot: string
    readonly signedAt: string
    readonly coverage: string
    readonly documents: string
    readonly docColumns: readonly string[]
    readonly docStatus: Record<
      'loading' | 'live' | 'cached' | 'unavailable' | 'unverified',
      string
    >
    readonly addRelay: string
    readonly add: string
    readonly remove: (url: string) => string
    readonly resetRelays: string
    readonly badRelay: string
    readonly customNote: string
    readonly restatedTitle: string
  }
}
