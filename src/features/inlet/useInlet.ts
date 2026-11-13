import { useMemo } from 'react'
import { thetaFromBetaDeg } from '@/physics'
import { useGamma } from '@/hooks/useGamma'
import { useLastOk } from '@/hooks/useLastOk'
import { useSearchParams } from '@/hooks/useSearchParams'
import { fieldError, type FieldError } from '@/lib/fields'
import { toQueryNumber } from '@/lib/format'
import { readEnum } from '@/lib/query'
import {
  addRampTexts,
  clampSelection,
  DEFAULT_LENGTH_TEXTS,
  DEFAULT_THETA_TEXTS,
  parseList,
  removeRampTexts,
  SHADE_PROPERTIES,
  solveInletText,
  type InletField,
  type InletSolution,
  type ShadeProperty,
} from './model'

const KEY_M1 = 'in.m'
const KEY_THETAS = 'in.t'
const KEY_LENGTHS = 'in.l'
const KEY_PROPERTY = 'in.prop'
const KEY_COMPARE = 'in.cmp'
const KEY_SELECTED = 'in.sel'

function defaultSolution(): InletSolution {
  const r = solveInletText({ gamma: '1.4', m1: '3', thetas: DEFAULT_THETA_TEXTS, lengths: DEFAULT_LENGTH_TEXTS })
  if (!r.ok) throw new Error(`Invariant failed: ${r.message}`)
  return r.value
}

const DEFAULT_SOLUTION = defaultSolution()

/** List entries are comma-separated in the URL, so a typed decimal comma is stored as a point. */
function encodeList(items: readonly string[]): string {
  return items.map((t) => t.replace(',', '.')).join(',')
}

function replaceAt(items: readonly string[], index0: number, text: string): string[] {
  return items.map((t, i) => (i === index0 ? text : t))
}

export interface Inlet {
  readonly gamma: ReturnType<typeof useGamma>
  readonly m1Text: string
  readonly thetaTexts: readonly string[]
  readonly lengthTexts: readonly string[]
  /** Last valid solution; shown dimmed while `error` is set. */
  readonly solution: InletSolution
  readonly error: FieldError<InletField> | null
  readonly property: ShadeProperty
  readonly compare: boolean
  /** Selected shock, 1-based, always within the shocks that exist. */
  readonly selected: number
  readonly setM1Text: (text: string) => void
  readonly setThetaText: (index0: number, text: string) => void
  readonly setLengthText: (index0: number, text: string) => void
  readonly addRamp: () => void
  readonly removeRamp: (index0: number) => void
  /** A dragged corner: ramp `index0` gets this angle and length. */
  readonly setCorner: (index0: number, thetaDeg: number, length: number) => void
  /** A β picked on the θ-β-M chart for shock `index0`, applied as that ramp's θ. */
  readonly setThetaFromBeta: (index0: number, betaDeg: number) => void
  readonly setProperty: (p: ShadeProperty) => void
  readonly setCompare: (on: boolean) => void
  readonly select: (shock: number) => void
}

export function useInlet(): Inlet {
  const [params, update] = useSearchParams()
  const gamma = useGamma()
  const m1Text = params.get(KEY_M1) ?? '3'
  const thetaTexts = parseList(params.get(KEY_THETAS), DEFAULT_THETA_TEXTS)
  const lengthTexts = parseList(params.get(KEY_LENGTHS), DEFAULT_LENGTH_TEXTS)
  const thetaKey = thetaTexts.join(',')
  const lengthKey = lengthTexts.join(',')

  const result = useMemo(
    () => solveInletText({ gamma: gamma.text, m1: m1Text, thetas: thetaKey.split(','), lengths: lengthKey.split(',') }),
    [gamma.text, m1Text, thetaKey, lengthKey],
  )
  const solution = useLastOk(result, DEFAULT_SOLUTION)
  const selected = clampSelection(Number(params.get(KEY_SELECTED) ?? '1'), solution.chain.shocks.length)

  const writeLists = (lists: { thetas: readonly string[]; lengths: readonly string[] }) =>
    update({ [KEY_THETAS]: encodeList(lists.thetas), [KEY_LENGTHS]: encodeList(lists.lengths) })

  return {
    gamma,
    m1Text,
    thetaTexts,
    lengthTexts,
    solution,
    error: fieldError(result),
    property: readEnum(params, KEY_PROPERTY, SHADE_PROPERTIES, 'p0'),
    compare: params.get(KEY_COMPARE) !== '0',
    selected,
    setM1Text: (text) => update({ [KEY_M1]: text }),
    setThetaText: (i, text) => update({ [KEY_THETAS]: encodeList(replaceAt(thetaTexts, i, text)) }),
    setLengthText: (i, text) => update({ [KEY_LENGTHS]: encodeList(replaceAt(lengthTexts, i, text)) }),
    addRamp: () => writeLists(addRampTexts(thetaTexts, lengthTexts)),
    removeRamp: (i) => writeLists(removeRampTexts(thetaTexts, lengthTexts, i)),
    setCorner: (i, thetaDeg, length) =>
      writeLists({
        thetas: replaceAt(thetaTexts, i, toQueryNumber(thetaDeg, 4)),
        lengths: replaceAt(lengthTexts, i, toQueryNumber(length, 4)),
      }),
    setThetaFromBeta: (i, betaDeg) => {
      const shock = solution.chain.shocks[i]
      if (shock === undefined) return
      const theta = thetaFromBetaDeg(shock.upstreamMach, betaDeg, gamma.value)
      const clamped = Math.min(Math.max(theta, 0), shock.max.thetaMaxDeg)
      update({ [KEY_THETAS]: encodeList(replaceAt(thetaTexts, i, toQueryNumber(clamped, 4))) })
    },
    setProperty: (p) => update({ [KEY_PROPERTY]: p }),
    setCompare: (on) => update({ [KEY_COMPARE]: on ? '1' : '0' }),
    select: (shock) => update({ [KEY_SELECTED]: String(shock) }),
  }
}
