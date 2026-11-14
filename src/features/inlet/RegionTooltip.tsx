import { regionRows } from './labels'
import type { Region } from './model'

interface RegionTooltipProps {
  readonly region: Region
  readonly pinned: boolean
  /** Anchor in the drawing's pixel space. */
  readonly x: number
  readonly y: number
  readonly containerWidth: number
}

export function RegionTooltip({ region, pinned, x, y, containerWidth }: RegionTooltipProps) {
  const w = 168
  const left = Math.min(Math.max(x - w / 2, 4), Math.max(4, containerWidth - w - 4))
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-10 rounded-md border border-rule bg-panel px-3 py-2 text-xs shadow-sm"
      style={{ left, top: Math.max(4, y - 150), width: w }}
    >
      <p className="mb-1 font-medium text-ink">
        Region {region.index}
        {pinned ? <span className="ml-1 font-normal text-muted">(pinned)</span> : null}
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
        {regionRows(region).map(([name, value]) => (
          <div key={name} className="contents">
            <dt className="text-muted">{name}</dt>
            <dd className="num text-right text-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
