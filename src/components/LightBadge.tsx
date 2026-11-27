/** The traffic light as text, icon and colour together (SPEC 5.5). */
import { t } from '~/i18n'
import type { Light } from '~/model/status'
import { LightIcon } from './Icons'

type Props = {
  readonly light: Light | null
  readonly projected?: boolean
  readonly insufficient?: boolean
  readonly size?: 'sm' | 'md' | 'lg'
}

export function LightBadge({
  light,
  projected = false,
  insufficient = false,
  size = 'md',
}: Props) {
  const label = insufficient ? t.insufficient : light ? t.light[light] : null
  if (label === null) return null
  const kind = insufficient || !light ? 'none' : light
  return (
    <span class={`light light--${kind} light--${size}`}>
      <LightIcon light={kind} size={size === 'lg' ? 20 : 15} />
      {label}
      {projected && light && !insufficient ? (
        <span class="light__tag">· {t.projected}</span>
      ) : null}
    </span>
  )
}
