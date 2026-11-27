/** The board, top to bottom (SPEC 6.1). Reads the app state, never a relay. */
import { t } from '~/i18n'
import type { AppView } from '~/store/useBoard'
import { stalenessOf } from '~/store/connection'
import { AlertIcon } from '~/components/Icons'
import { failureText } from '~/components/Problem'
import { BoardSkeleton } from '~/components/Skeleton'
import { MonthCard } from '~/components/MonthCard'
import { YearCard } from '~/components/YearCard'
import { Levers } from '~/components/Levers'
import { AnnualChart } from '~/components/AnnualChart'
import { PaceChart } from '~/components/PaceChart'
import { MonthTable } from '~/components/MonthTable'
import { Quarters } from '~/components/Quarters'

const HOUR = 3_600_000

export function InvalidPlan({ errors }: { readonly errors: readonly string[] }) {
  return (
    <section class="glass card fatal" role="alert">
      <h1>{t.invalidPlan}</h1>
      <ul>
        {errors.map((error) => (
          <li key={error}>{error}</li>
        ))}
      </ul>
    </section>
  )
}

export function BootFailed({ reason }: { readonly reason: string }) {
  return (
    <section class="glass card fatal" role="alert">
      <h1>{t.bootFailed}</h1>
      <p class="muted">{t.bootFailedReason(failureText(reason))}</p>
      <a class="btn" href="#/confianza">
        {t.trustLink}
      </a>
    </section>
  )
}

export function Tablero({ app }: { readonly app: AppView }) {
  if (!app.plan.ok) return <InvalidPlan errors={app.plan.errors} />
  if (app.boot.status === 'failed') return <BootFailed reason={app.boot.reason} />
  if (app.boot.status === 'loading' || !app.board) return <BoardSkeleton />

  const plan = app.plan.plan
  const board = app.board
  const ageHours = Math.floor((Date.now() - app.boot.createdAt * 1000) / HOUR)
  const staleness = stalenessOf(app.boot.createdAt, Date.now())

  return (
    <div class="stack">
      {staleness === 'warning' ? (
        <p class="notice notice--warn" role="status">
          {t.staleWarning(ageHours)}
        </p>
      ) : null}
      {board.year.reviewAlert ? (
        <p class="banner" role="alert">
          <AlertIcon />
          {t.reviewBanner}
        </p>
      ) : null}
      <div class="hero">
        <MonthCard board={board} plan={plan} staleness={staleness} ageHours={ageHours} />
        <YearCard board={board} />
      </div>
      <Levers board={board} plan={plan} />
      <div class="charts">
        <AnnualChart board={board} plan={plan} />
        <PaceChart board={board} plan={plan} />
      </div>
      <MonthTable board={board} plan={plan} />
      <Quarters board={board} />
    </div>
  )
}
