/** The four levers (SPEC 5.7, 6.1 item 4): which one is failing. */
import { t } from '~/i18n'
import type { Board } from '~/model/board'
import type { Plan } from '~/plan/types'
import { formatDecimal, formatPercent, formatSats, formatUsd } from '~/model/format'
import { onTarget } from '~/model/indicators'
import { valueOf, type Datum } from '~/model/source'
import { problemText } from './Problem'
import { LightIcon } from './Icons'

type LeverView = {
  readonly key: keyof typeof t.levers
  readonly value: string
  readonly unit?: string
  readonly sub?: string
  readonly target: string
  readonly final: string
  readonly ok: boolean | null
  readonly datum: Datum
}

function Lever({ lever }: { readonly lever: LeverView }) {
  const problem = problemText(lever.datum)
  return (
    <li class="glass lever">
      <p class="lever__name">{t.levers[lever.key]}</p>
      {problem ? (
        <p class="problem small">{problem}</p>
      ) : (
        <p class="lever__value">
          {lever.value}
          {lever.unit ? <span class="lever__unit">{lever.unit}</span> : null}
        </p>
      )}
      {lever.sub ? <p class="lever__targets">{lever.sub}</p> : null}
      <p class="lever__targets">
        {lever.target} · {lever.final}
      </p>
      <div class="lever__state">
        {lever.ok === null ? (
          <span class="light light--none light--sm">
            <LightIcon light="none" size={13} />
            {t.light['sin-datos']}
          </span>
        ) : (
          <span class={`light light--sm light--${lever.ok ? 'verde' : 'amarillo'}`}>
            <LightIcon light={lever.ok ? 'verde' : 'amarillo'} size={13} />
            {lever.ok ? t.onTarget : t.belowTarget}
          </span>
        )}
      </div>
    </li>
  )
}

export function Levers({ board, plan }: { readonly board: Board; readonly plan: Plan }) {
  const row = board.current
  const goal = row.target ?? plan.base
  const goalLabel = row.target ? t.leverTarget : t.leverBase
  const final = plan.months[plan.months.length - 1]!
  const nodesNow = row.phase === 'current'
  const nodes = nodesNow ? valueOf(board.activeNodes) : null
  const levers: LeverView[] = [
    {
      key: 'perDay',
      value: formatDecimal(row.perDay.value),
      target: goalLabel(formatDecimal(goal.completedPerDay)),
      final: t.leverFinal(formatDecimal(final.completedPerDay)),
      ok: row.perDay.ok,
      datum: row.perDay.datum,
    },
    {
      key: 'rate',
      value: formatPercent(row.rate.value),
      target: goalLabel(formatPercent(goal.completionRate)),
      final: t.leverFinal(formatPercent(final.completionRate)),
      ok: row.rate.ok,
      datum: row.rate.datum,
    },
    {
      key: 'ticket',
      value: formatSats(row.ticket.value),
      unit: 'sats',
      ...(row.ticketUsd !== null ? { sub: `≈ ${formatUsd(row.ticketUsd)} USD` } : {}),
      target: goalLabel(formatSats(goal.ticketSats)),
      final: t.leverFinal(formatSats(final.ticketSats)),
      ok: row.ticket.ok,
      datum: row.ticket.datum,
    },
    {
      key: 'nodes',
      value: nodesNow ? formatSats(nodes) : '—',
      ...(nodesNow ? {} : { sub: t.noHistory }),
      target: goalLabel(String(goal.activeNodes)),
      final: t.leverFinal(String(final.activeNodes)),
      ok: onTarget(nodes, goal.activeNodes),
      datum: nodesNow ? board.activeNodes : { kind: 'absent' },
    },
  ]
  return (
    <section aria-labelledby="levers-title">
      <h2 class="visually-hidden" id="levers-title">
        {t.leversTitle}
      </h2>
      <ul class="levers">
        {levers.map((lever) => (
          <Lever key={lever.key} lever={lever} />
        ))}
      </ul>
    </section>
  )
}
