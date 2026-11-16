import { useState, type KeyboardEvent, type PointerEvent } from 'react'
import { formatValue } from '@/lib/format'
import type { Frame } from '@/features/inlet/shared/frame'
import { InletField } from '@/features/inlet/shared/InletField'
import type { Chain, Pt, ShadeProperty } from '@/features/inlet/shared/types'
import { heightFromPointer, lengthFromPointer, LIMITS, nudgeReflect, thetaFromPointer, type ReflectGeometry, type ReflectHandle } from './geometry'
import type { ReflectInput } from './model'

interface ReflectFieldProps {
  readonly geometry: ReflectGeometry
  readonly chain: Chain
  readonly input: ReflectInput
  readonly property: ShadeProperty
  readonly domain: readonly [number, number]
  readonly selected: number
  readonly onSelectShock: (shock: number) => void
  readonly onTheta: (v: number) => void
  readonly onHeight: (v: number) => void
  readonly onLength: (v: number) => void
  readonly stale: boolean
}

const HANDLES: Readonly<Record<ReflectHandle, { readonly name: string; readonly unit: string }>> = {
  theta: { name: 'Ramp angle handle', unit: '°' },
  height: { name: 'Cowl height handle', unit: '' },
  length: { name: 'Channel end handle', unit: '' },
}

/**
 * Reflecting-shock drawing: the shared inlet field plus three handles: a point on the ramp sets θ,
 * the cowl's leading edge sets H, and the cowl's end sets L. The scale is frozen while dragging so
 * the drawing doesn't rescale under the pointer.
 */
export function ReflectField({ geometry: g, chain, input, property, domain, selected, onSelectShock, onTheta, onHeight, onLength, stale }: ReflectFieldProps) {
  const [dragging, setDragging] = useState<ReflectHandle | null>(null)
  const [frozen, setFrozen] = useState<ReflectGeometry['bounds'] | null>(null)
  const tan = Math.tan((input.thetaDeg * Math.PI) / 180)
  const x1 = g.bounds.x1
  const at: Readonly<Record<ReflectHandle, Pt>> = {
    theta: { x: 0.9 * x1, y: 0.9 * x1 * tan },
    height: { x: 0, y: input.height },
    length: { x: x1, y: input.height },
  }
  // The channel ends where the walls meet if that comes first, so the end handle works on that length.
  const value: Readonly<Record<ReflectHandle, number>> = { theta: input.thetaDeg, height: input.height, length: x1 }
  const set: Readonly<Record<ReflectHandle, (v: number) => void>> = { theta: onTheta, height: onHeight, length: onLength }

  function fromPointer(e: PointerEvent<SVGCircleElement>, f: Frame, which: ReflectHandle) {
    const svg = e.currentTarget.ownerSVGElement
    if (svg === null) return
    const box = svg.getBoundingClientRect()
    const p = f.toModel(e.clientX - box.left, e.clientY - box.top)
    set[which](which === 'theta' ? thetaFromPointer(p) : which === 'height' ? heightFromPointer(p) : lengthFromPointer(p))
  }

  function onKeyDown(e: KeyboardEvent<SVGCircleElement>, which: ReflectHandle) {
    const next = nudgeReflect(which, value[which], e.key, e.shiftKey)
    if (next === null) return
    e.preventDefault()
    set[which](next)
  }

  return (
    <InletField
      label="Reflecting-shock flow field"
      bounds={g.bounds}
      frozenBounds={frozen}
      lowerWall={g.lowerWall}
      upperWall={g.upperWall}
      regions={g.regions}
      chain={chain}
      shocks={g.shocks}
      clipX={null}
      conflictAt={null}
      stop={g.stop}
      property={property}
      domain={domain}
      selected={selected}
      interactive
      onSelectShock={onSelectShock}
      stale={stale}
      dragging={dragging !== null}
      handles={(f) =>
        (['theta', 'height', 'length'] satisfies ReflectHandle[]).map((which) => (
              <circle
                key={which}
                cx={f.toX(at[which].x)}
                cy={f.toY(at[which].y)}
                r={7}
                role="slider"
                tabIndex={0}
                aria-label={HANDLES[which].name}
                aria-valuemin={Math.min(LIMITS[which].min, value[which])}
                aria-valuemax={LIMITS[which].max}
                aria-valuenow={value[which]}
                aria-valuetext={`${formatValue(value[which], 4)}${HANDLES[which].unit}`}
                className="glide cursor-grab fill-panel stroke-up outline-none [stroke-width:2] focus-visible:stroke-[var(--ring)] focus-visible:[stroke-width:3]"
                onPointerDown={(e) => {
                  if (e.button !== 0) return
                  e.currentTarget.setPointerCapture(e.pointerId)
                  setFrozen(g.bounds)
                  setDragging(which)
                }}
                onPointerMove={(e) => {
                  if (dragging === which) fromPointer(e, f, which)
                }}
                onPointerUp={(e) => {
                  if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
                  setDragging(null)
                  setFrozen(null)
                }}
                onPointerCancel={() => {
                  setDragging(null)
                  setFrozen(null)
                }}
                onKeyDown={(e) => onKeyDown(e, which)}
              />
            ))
      }
    />
  )
}
