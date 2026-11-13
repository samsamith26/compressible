import { useId, type ReactNode } from 'react'
import { PORTHOLE } from './shade'

/**
 * The round, always-dark test-section window. Children draw in the 200 × 200
 * box and are clipped to the glass.
 */
export function Porthole({ label, description, children }: { label: string; description: string; children: ReactNode }) {
  const id = useId()
  const clip = `${id}-clip`
  const glass = `${id}-glass`
  const descId = `${id}-desc`
  const { size, cx, cy, r } = PORTHOLE
  const bolts = Array.from({ length: 12 }, (_, i) => (i * Math.PI) / 6)

  return (
    <figure className="m-0 w-full max-w-[380px]">
      <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label} aria-describedby={descId} className="block w-full">
        <defs>
          <clipPath id={clip}>
            <circle cx={cx} cy={cy} r={r} />
          </clipPath>
          <radialGradient id={glass} cx="40%" cy="35%" r="75%">
            <stop offset="0%" stopColor="#1a2430" />
            <stop offset="70%" stopColor="#0b1118" />
            <stop offset="100%" stopColor="#05080c" />
          </radialGradient>
        </defs>
        <circle cx={cx} cy={cy} r={r + 6} fill="#2b3640" />
        {bolts.map((a) => (
          <circle key={a} cx={cx + (r + 3) * Math.cos(a)} cy={cy + (r + 3) * Math.sin(a)} r={1.4} fill="#56636f" />
        ))}
        <circle cx={cx} cy={cy} r={r} fill={`url(#${glass})`} />
        <g clipPath={`url(#${clip})`}>{children}</g>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#070b10" strokeWidth={2} />
      </svg>
      <figcaption id={descId} className="mt-2 text-sm text-ink-2">
        {description}
      </figcaption>
    </figure>
  )
}
