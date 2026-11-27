/** Month by month, with the base (SPEC 6.1 item 7). A real table, with headers. */
import { t } from '~/i18n'
import type { Board } from '~/model/board'
import type { Plan } from '~/plan/types'
import type { MonthRow } from '~/model/rows'
import {
  formatDecimal,
  formatMonthLong,
  formatPercent,
  formatSats,
  formatUsd,
} from '~/model/format'
import { judged } from '~/model/months'
import { valueOf } from '~/model/source'
import { satsToUsd } from '~/model/status'
import { LightBadge } from './LightBadge'
import { priceLabel } from './price'

function Cmp({ value, ok }: { readonly value: string; readonly ok: boolean | null }) {
  return <span class={ok === null ? '' : ok ? 'cmp-ok' : 'cmp-bad'}>{value}</span>
}

function realCell(row: MonthRow) {
  const value =
    row.evaluation.kind === 'projected' ? row.evaluation.value : valueOf(row.real)
  return (
    <>
      {formatSats(value)}
      {row.evaluation.kind === 'projected' ? <span class="tag">{t.proj}</span> : null}
      {row.restated ? (
        <span class="tag tag--warn" title={t.restated(row.restated)}>
          {t.tagRestated}
        </span>
      ) : null}
      {row.partialCoverage ? (
        <span
          class="tag tag--warn"
          title={t.partialCoverage(formatPercent(row.coverage))}
        >
          {t.tagCoverage}
        </span>
      ) : null}
    </>
  )
}

function PlanRow({ row }: { readonly row: MonthRow }) {
  const target = row.target!
  const future = row.phase === 'future'
  const cls = row.phase === 'current' ? 'is-current' : future ? 'is-future' : ''
  return (
    <tr class={cls} aria-current={row.phase === 'current' ? 'date' : undefined}>
      <th scope="row">
        {target.n}. {formatMonthLong(row.month)}
      </th>
      <td class="num">{formatSats(target.metaSats)}</td>
      <td class="num">{formatUsd(row.metaUsd)}</td>
      <td class="num">{formatSats(target.pisoSats)}</td>
      <td class="num">{future ? '' : realCell(row)}</td>
      <td class="small">{future || !row.price ? '' : priceLabel(row.price)}</td>
      <td class="num">{future ? '' : formatUsd(row.realUsd)}</td>
      <td class="num">{future ? '' : formatPercent(row.shareOfMeta)}</td>
      <td class="num">
        {future ? (
          formatDecimal(target.completedPerDay)
        ) : (
          <>
            <Cmp value={formatDecimal(row.perDay.value)} ok={row.perDay.ok} /> /{' '}
            {formatDecimal(target.completedPerDay)}
          </>
        )}
      </td>
      <td class="num">
        {future ? (
          formatPercent(target.completionRate)
        ) : (
          <>
            <Cmp value={formatPercent(row.rate.value)} ok={row.rate.ok} /> /{' '}
            {formatPercent(target.completionRate)}
          </>
        )}
      </td>
      <td class="num">
        {future ? (
          formatSats(target.ticketSats)
        ) : (
          <>
            <Cmp value={formatSats(row.ticket.value)} ok={row.ticket.ok} /> /{' '}
            {formatSats(target.ticketSats)}
          </>
        )}
      </td>
      <td>
        {future ? null : (
          <LightBadge
            light={row.light}
            projected={row.phase === 'current'}
            insufficient={row.evaluation.kind === 'insufficient'}
            size="sm"
          />
        )}
      </td>
    </tr>
  )
}

export function MonthTable({
  board,
  plan,
}: {
  readonly board: Board
  readonly plan: Plan
}) {
  const base = plan.base
  const ref = plan.referencePriceUsd
  const current = board.current
  return (
    <section class="glass card" aria-labelledby="table-title">
      <h2 class="section-title" id="table-title">
        {t.table}
      </h2>
      <p class="section-desc">
        {board.stage === 'before'
          ? `${formatMonthLong(current.month)}: ${formatSats(judged(current.evaluation))} sats ${current.evaluation.kind === 'projected' ? t.proj : ''}`
          : ''}
      </p>
      <div class="table-wrap" tabIndex={0} role="region" aria-labelledby="table-title">
        <table>
          <thead>
            <tr>
              {t.columns.map((column) => (
                <th key={column} scope="col">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr class="is-base">
              <th scope="row">{t.baseRow}</th>
              <td class="num">{formatSats(base.devFeeSats)}</td>
              <td class="num">{formatUsd(satsToUsd(base.devFeeSats, ref))}</td>
              <td class="num">—</td>
              <td class="num">{formatSats(base.devFeeSats)}</td>
              <td class="small">{priceLabel({ usd: ref, source: 'reference' })}</td>
              <td class="num">{formatUsd(satsToUsd(base.devFeeSats, ref))}</td>
              <td class="num">—</td>
              <td class="num">{formatDecimal(base.completedPerDay)}</td>
              <td class="num">{formatPercent(base.completionRate)}</td>
              <td class="num">{formatSats(base.ticketSats)}</td>
              <td />
            </tr>
            {board.rows
              .filter((row) => row.target !== null)
              .map((row) => (
                <PlanRow key={row.month} row={row} />
              ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
