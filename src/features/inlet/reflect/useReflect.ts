import { useMemo } from 'react'
import { thetaFromBetaDeg } from '@/physics'
import { useGamma } from '@/hooks/useGamma'
import { useLastOk } from '@/hooks/useLastOk'
import { useSearchParams } from '@/hooks/useSearchParams'
import { fieldError, type FieldError } from '@/lib/fields'
import { toQueryNumber } from '@/lib/format'
import { readEnum } from '@/lib/query'
import { clampSelection } from '@/features/inlet/ramps/model'
import { SHADE_PROPERTIES, type ShadeProperty } from '@/features/inlet/shared/types'
import { LIMITS } from './geometry'
import { REFLECT_DEFAULTS, solveReflectText, type ReflectField, type ReflectState } from './text'

const KEY = { m1: 'rf.m', theta: 'rf.t', height: 'rf.h', length: 'rf.l', selected: 'rf.sel', property: 'rf.prop' } as const

function defaultState(): ReflectState {
  const r = solveReflectText(REFLECT_DEFAULTS)
  if (!r.ok) throw new Error(`Invariant failed: ${r.message}`)
  return r.value
}

const DEFAULT_STATE = defaultState()

export interface ReflectInlet {
  readonly gamma: ReturnType<typeof useGamma>
  readonly m1Text: string
  readonly thetaText: string
  readonly heightText: string
  readonly lengthText: string
  /** Last valid state; shown dimmed while `error` is set. */
  readonly solution: ReflectState
  readonly error: FieldError<ReflectField> | null
  readonly property: ShadeProperty
  readonly selected: number
  readonly setM1Text: (t: string) => void
  readonly setThetaText: (t: string) => void
  readonly setHeightText: (t: string) => void
  readonly setLengthText: (t: string) => void
  /** Values from a handle (drag or keys), stored to four significant figures. */
  readonly setTheta: (v: number) => void
  readonly setHeight: (v: number) => void
  readonly setLength: (v: number) => void
  /** A β picked on the θ-β-M chart for shock `index0`, applied as the ramp angle. */
  readonly setThetaFromBeta: (index0: number, betaDeg: number) => void
  readonly setProperty: (p: ShadeProperty) => void
  readonly select: (shock: number) => void
}

export function useReflect(): ReflectInlet {
  const [params, update] = useSearchParams()
  const gamma = useGamma()
  const m1Text = params.get(KEY.m1) ?? REFLECT_DEFAULTS.m1
  const thetaText = params.get(KEY.theta) ?? REFLECT_DEFAULTS.theta
  const heightText = params.get(KEY.height) ?? REFLECT_DEFAULTS.height
  const lengthText = params.get(KEY.length) ?? REFLECT_DEFAULTS.length

  const result = useMemo(
    () => solveReflectText({ gamma: gamma.text, m1: m1Text, theta: thetaText, height: heightText, length: lengthText }),
    [gamma.text, m1Text, thetaText, heightText, lengthText],
  )
  const solution = useLastOk(result, DEFAULT_STATE)
  const shocks = solution.solution.chain.shocks
  const write = (key: string) => (v: number) => update({ [key]: toQueryNumber(v, 4) })

  return {
    gamma,
    m1Text,
    thetaText,
    heightText,
    lengthText,
    solution,
    error: fieldError(result),
    property: readEnum(params, KEY.property, SHADE_PROPERTIES, 'p0'),
    selected: clampSelection(Number(params.get(KEY.selected) ?? '1'), shocks.length),
    setM1Text: (t) => update({ [KEY.m1]: t }),
    setThetaText: (t) => update({ [KEY.theta]: t }),
    setHeightText: (t) => update({ [KEY.height]: t }),
    setLengthText: (t) => update({ [KEY.length]: t }),
    setTheta: write(KEY.theta),
    setHeight: write(KEY.height),
    setLength: write(KEY.length),
    setThetaFromBeta: (i, betaDeg) => {
      // Only shock 1 maps cleanly to θ: a later shock's incoming Mach depends on θ itself.
      if (i !== 0) return
      const shock = shocks[i]
      if (shock === undefined || shock.kind === 'subsonic') return
      const theta = thetaFromBetaDeg(shock.upstreamMach, betaDeg, solution.gamma)
      const clamped = Math.min(Math.max(theta, LIMITS.theta.min), shock.max.thetaMaxDeg, LIMITS.theta.max)
      update({ [KEY.theta]: toQueryNumber(clamped, 4) })
    },
    setProperty: (p) => update({ [KEY.property]: p }),
    select: (shock) => update({ [KEY.selected]: String(shock) }),
  }
}
