import { useState, type KeyboardEvent, type PointerEvent } from 'react'
import { formatValue } from '@/lib/format'
import type { Frame } from '@/features/inlet/shared/frame'
import { InletField } from '@/features/inlet/shared/InletField'
import type { Chain, ShadeProperty } from '@/features/inlet/shared/types'
import { cornerFromPointer, nudgeCorner, wallAngleBefore } from './corner'
import type { InletGeometry } from './geometry'
import type { Ramp } from './model'

interface RampFieldProps {
  readonly label: string
  readonly geometry: InletGeometry
  readonly chain: Chain
  readonly ramps: readonly Ramp[]
  readonly property: ShadeProperty
  readonly domain: readonly [number, number]
  readonly selected: number | null
  readonly interactive: boolean
  readonly maxHeight?: number
  readonly onSelectShock?: (shock: number) => void
  readonly onCorner?: (index0: number, ramp: Ramp) => void
  readonly stale?: boolean
}

/** Ramp-series drawing: the shared inlet field plus a draggable slider at each ramp corner. */
export function RampField({
  label,
  geometry: g,
  chain,
  ramps,
  property,
  domain,
  selected,
  interactive,
  maxHeight,
  onSelectShock,
  onCorner,
  stale,
}: RampFieldProps) {
  const [dragging, setDragging] = useState<number | null>(null)
  const stopKind = chain.shocks.at(-1)?.kind

  function cornerPointer(e: PointerEvent<SVGCircleElement>, f: Frame, index0: number) {
    const svg = e.currentTarget.ownerSVGElement
    const previous = g.corners[index0]
    if (svg === null || previous === undefined || onCorner === undefined) return
    const box = svg.getBoundingClientRect()
    const point = f.toModel(e.clientX - box.left, e.clientY - box.top)
    onCorner(index0, cornerFromPointer(previous, wallAngleBefore(ramps, index0), point))
  }

  function cornerKey(e: KeyboardEvent<SVGCircleElement>, index0: number) {
    const ramp = ramps[index0]
    if (ramp === undefined || onCorner === undefined) return
    const next = nudgeCorner(ramp, e.key, e.shiftKey)
    if (next === null) return
    e.preventDefault()
    onCorner(index0, next)
  }

  return (
    <InletField
      label={label}
      bounds={g.bounds}
      lowerWall={[{ x: g.bounds.x0, y: 0 }, ...g.corners]}
      regions={g.regions}
      chain={chain}
      shocks={g.shocks.map((s) => ({ index: s.index, from: s.from, to: s.to }))}
      clipX={g.conflict === null ? null : g.conflict.at.x}
      conflictAt={g.conflict === null ? null : g.conflict.at}
      stop={g.detachedCorner === null ? null : { at: g.detachedCorner, text: stopKind === 'subsonic' ? 'subsonic' : 'detached' }}
      property={property}
      domain={domain}
      selected={selected}
      interactive={interactive}
      {...(onSelectShock === undefined ? {} : { onSelectShock })}
      {...(maxHeight === undefined ? {} : { maxHeight })}
      {...(stale === undefined ? {} : { stale })}
      dragging={dragging !== null}
      handles={
        interactive && onCorner !== undefined
          ? (f) =>
              ramps.map((ramp, i) => {
                const c = g.corners[i + 1]
                if (c === undefined) return null
                return (
                  <circle
                    key={i}
                    cx={f.toX(c.x)}
                    cy={f.toY(c.y)}
                    r={7}
                    role="slider"
                    tabIndex={0}
                    aria-label={`Ramp ${i + 1} corner`}
                    aria-valuemin={0}
                    aria-valuemax={45}
                    aria-valuenow={ramp.thetaDeg}
                    aria-valuetext={`Ramp ${i + 1}: ${formatValue(ramp.thetaDeg, 4)}°, length ${formatValue(ramp.length, 3)}`}
                    className="glide cursor-grab fill-panel stroke-up outline-none [stroke-width:2] focus-visible:stroke-[var(--ring)] focus-visible:[stroke-width:3]"
                    onPointerDown={(e) => {
                      if (e.button !== 0) return
                      e.currentTarget.setPointerCapture(e.pointerId)
                      setDragging(i)
                    }}
                    onPointerMove={(e) => {
                      if (dragging === i) cornerPointer(e, f, i)
                    }}
                    onPointerUp={(e) => {
                      if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
                      setDragging(null)
                    }}
                    onPointerCancel={() => setDragging(null)}
                    onKeyDown={(e) => cornerKey(e, i)}
                  />
                )
              })
          : undefined
      }
    />
  )
}
