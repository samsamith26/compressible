import { useMemo } from 'react'
import { solveOblique, type ObliqueInputKind, type ObliqueSolution } from '@/physics'
import { useGamma } from '@/hooks/useGamma'
import { useLastOk } from '@/hooks/useLastOk'
import { useSearchParams } from '@/hooks/useSearchParams'
import { fieldError, type FieldError, type FieldResult } from '@/lib/fields'
import { toQueryNumber } from '@/lib/format'
import { expectOk } from '@/lib/invariant'
import { readEnum } from '@/lib/query'
import {
  OBLIQUE_KINDS,
  inputFromBeta,
  obliqueValue,
  solveObliqueText,
  type ObliqueField,
} from './model'

const KEY_M1 = 'ob.m'
const KEY_KIND = 'ob.k'
const KEY_VALUE = 'ob.v'

interface Snapshot {
  readonly solution: ObliqueSolution
  readonly theta: number
  readonly kind: ObliqueInputKind
}

const DEFAULT_SNAPSHOT: Snapshot = {
  solution: expectOk(solveOblique(2, { kind: 'thetaWeak', value: 10 }, 1.4)),
  theta: 10,
  kind: 'thetaWeak',
}

export interface ObliqueSolver {
  readonly gamma: ReturnType<typeof useGamma>
  readonly m1Text: string
  readonly kind: ObliqueInputKind
  readonly valueText: string
  /** Last valid solution (attached or detached); shown dimmed while `error` is set. */
  readonly solution: ObliqueSolution
  /** Upstream Mach number of `solution`. */
  readonly m1: number
  /** The θ typed by the person, when the input is a turning angle. Drawn when detached. */
  readonly inputThetaDeg: number | null
  readonly error: FieldError<ObliqueField> | null
  readonly setM1Text: (text: string) => void
  readonly setKind: (kind: ObliqueInputKind) => void
  readonly setValueText: (text: string) => void
  readonly setBeta: (betaDeg: number) => void
}

export function useObliqueSolver(): ObliqueSolver {
  const [params, update] = useSearchParams()
  const gamma = useGamma()
  const m1Text = params.get(KEY_M1) ?? '2'
  const kind = readEnum(params, KEY_KIND, OBLIQUE_KINDS, 'thetaWeak')
  const valueText = params.get(KEY_VALUE) ?? '10'

  const result = useMemo(
    () => solveObliqueText({ m1: m1Text, kind, value: valueText, gamma: gamma.text }),
    [m1Text, kind, valueText, gamma.text],
  )
  // Remember the input alongside the solution: a detached result is drawn at the θ that was typed.
  const snapshot = useMemo(
    (): FieldResult<Snapshot, ObliqueField> =>
      result.ok ? { ok: true, value: { solution: result.value, theta: Number(valueText), kind } } : result,
    [result, valueText, kind],
  )
  const last = useLastOk(snapshot, DEFAULT_SNAPSHOT)
  const { solution } = last
  const m1 = solution.kind === 'attached' ? solution.state.m1 : Number(m1Text)
  const isThetaInput = last.kind === 'thetaWeak' || last.kind === 'thetaStrong'

  return {
    gamma,
    m1Text,
    kind,
    valueText,
    solution,
    m1,
    inputThetaDeg: isThetaInput ? last.theta : null,
    error: fieldError(result),
    setM1Text: (text) => update({ [KEY_M1]: text }),
    setKind: (next) => {
      // Keep the typed θ when moving between the weak and strong branches.
      const keepTheta = isThetaInput && (next === 'thetaWeak' || next === 'thetaStrong')
      const value =
        solution.kind === 'attached' && !keepTheta
          ? toQueryNumber(obliqueValue(solution.state, next), 6)
          : valueText
      update({ [KEY_KIND]: next, [KEY_VALUE]: value })
    },
    setValueText: (text) => update({ [KEY_VALUE]: text }),
    setBeta: (betaDeg) => {
      const next = inputFromBeta(kind, m1, betaDeg, solution.max.betaDeg, gamma.value)
      update({ [KEY_KIND]: next.kind, [KEY_VALUE]: toQueryNumber(next.value, 4) })
    },
  }
}
