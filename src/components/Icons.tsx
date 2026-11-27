/** Inline icons: one distinct shape per light, so colour never carries meaning alone. */
import type { Light } from '~/model/status'

type Props = { readonly size?: number }

export function LightIcon({
  light,
  size = 16,
}: Props & { readonly light: Light | 'none' }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 16 16',
    'aria-hidden': true as const,
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': 2,
    'stroke-linecap': 'round' as const,
    'stroke-linejoin': 'round' as const,
  }
  if (light === 'verde') {
    return (
      <svg {...common}>
        <circle cx="8" cy="8" r="7" fill="currentColor" stroke="none" opacity="0.2" />
        <path d="M4.5 8.2l2.4 2.4 4.6-5" />
      </svg>
    )
  }
  if (light === 'amarillo') {
    return (
      <svg {...common}>
        <path
          d="M8 1.8l6.2 6.2L8 14.2 1.8 8z"
          fill="currentColor"
          opacity="0.2"
          stroke="none"
        />
        <path d="M8 1.8l6.2 6.2L8 14.2 1.8 8z" />
        <path d="M5.5 8h5" />
      </svg>
    )
  }
  if (light === 'rojo') {
    return (
      <svg {...common}>
        <path d="M8 14L1.5 3h13z" fill="currentColor" opacity="0.2" stroke="none" />
        <path d="M8 14L1.5 3h13z" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <circle cx="8" cy="8" r="6" stroke-dasharray="2.5 2.5" />
    </svg>
  )
}

export function RefreshIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  )
}

export function AlertIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M12 3l10 18H2z" />
      <path d="M12 10v5M12 18h.01" />
    </svg>
  )
}
