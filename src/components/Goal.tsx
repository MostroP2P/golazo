/** Progress toward the final target, with the ×5 floor and ×10 target marked. */
import { t } from '~/i18n'
import { formatMillions, formatPercent } from '~/model/format'

type Props = {
  readonly value: number | null
  readonly floor: number
  readonly target: number
  readonly finalUsd: string
}

export function Goal({ value, floor, target, finalUsd }: Props) {
  const share = value === null ? null : value / target
  const width = `${Math.min(100, Math.max(0, (share ?? 0) * 100))}%`
  const floorAt = `${(floor / target) * 100}%`
  return (
    <div class="goal">
      <div class="goal__label">
        <span>
          <strong>{t.progressFinal(formatPercent(share), formatMillions(target))}</strong>
        </span>
        <span>{t.finalTargetUsd(finalUsd)}</span>
      </div>
      <div
        class="goal__track"
        role="progressbar"
        aria-label={t.progressFinal(formatPercent(share), formatMillions(target))}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={share === null ? undefined : Math.round(share * 1000) / 10}
      >
        <div class="goal__fill" style={{ width }} />
        <span class="goal__mark" style={{ left: floorAt }} aria-hidden="true" />
        <span
          class="goal__mark"
          style={{ left: 'calc(100% - 2px)' }}
          aria-hidden="true"
        />
      </div>
      <div class="goal__marks" aria-hidden="true">
        <span style={{ left: floorAt }}>{t.markFloor}</span>
        <span style={{ left: '100%' }}>{t.markTarget}</span>
      </div>
    </div>
  )
}
