/**
 * The TunaMusicPlayer mark.
 *
 * Geometry is kept identical to `scripts/logos.mjs` (which rasterises
 * build/icon.png for packaging) so the in-app logo and the app icon never
 * drift apart. The plate gradient reads the live theme variables, so the
 * sidebar mark recolours along with the rest of the UI — the packaged icon
 * stays on the default Aqua palette since it can't be dynamic.
 */

const TUNA_BODY = `M90,256
  C118,190 182,156 258,156
  C296,156 322,168 342,186
  L422,142
  L406,256
  L422,370
  L342,326
  C322,344 296,356 258,356
  C182,356 118,322 90,256 Z`

interface Props {
  size?: number
  /** Unique gradient id, needed when more than one logo is on the page. */
  id?: string
}

export function Logo({ size = 26, id = 'tuna-logo' }: Props): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-label="TunaMusicPlayer">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--accent)' }} />
          <stop offset="1" style={{ stopColor: 'var(--accent-2)' }} />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="114" fill={`url(#${id})`} />
      <path d={TUNA_BODY} fill="#0b0d10" opacity="0.92" />
      <circle cx="152" cy="224" r="17" style={{ fill: 'var(--accent)' }} />
    </svg>
  )
}
