/**
 * Progress from the base toward the final target (SPEC 5.8), with the ×5
 * floor and the ×10 target marked. The bar starts empty at the base.
 */
import { t } from '~/i18n'
import { formatMillions, formatPercent, formatSats } from '~/model/format'

type Props = {
  /** `(V − base) / (final − base)`, or null when V is absent. */
  readonly progress: number | null
  /** Where the ×5 floor sits on the same scale. */
  readonly floorAt: number
  readonly base: number
  readonly target: number
  readonly finalUsd: string
}

const percentOf = (share: number) => `${Math.min(100, Math.max(0, share * 100))}%`

export function Goal({ progress, floorAt, base, target, finalUsd }: Props) {
  const label = t.progressFinal(formatPercent(progress), formatMillions(target))
  return (
    <div class="goal">
      <div class="goal__label">
        <span>
          <strong>{label}</strong>
        </span>
        <span>{t.finalTargetUsd(finalUsd)}</span>
      </div>
      <div
        class="goal__track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress === null ? undefined : Math.round(progress * 1000) / 10}
      >
        <div class="goal__fill" style={{ width: percentOf(progress ?? 0) }} />
        <span
          class="goal__mark"
          style={{ left: percentOf(floorAt) }}
          aria-hidden="true"
        />
        <span
          class="goal__mark"
          style={{ left: 'calc(100% - 2px)' }}
          aria-hidden="true"
        />
      </div>
      <div class="goal__marks" aria-hidden="true">
        <span style={{ left: '0%', transform: 'none' }}>
          {t.markBase(formatSats(base))}
        </span>
        <span style={{ left: percentOf(floorAt) }}>{t.markFloor}</span>
        <span style={{ left: '100%' }}>{t.markTarget}</span>
      </div>
    </div>
  )
}
