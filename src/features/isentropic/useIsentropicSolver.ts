import { useMemo } from 'react'
import { isentropicFromMach, type IsentropicInputKind, type IsentropicState } from '@/physics'
import { useGamma } from '@/hooks/useGamma'
import { useLastOk } from '@/hooks/useLastOk'
import { useSearchParams } from '@/hooks/useSearchParams'
import { fieldError, type FieldError } from '@/lib/fields'
import { toQueryNumber } from '@/lib/format'
import { expectOk } from '@/lib/invariant'
import { readEnum } from '@/lib/query'
import {
  ISENTROPIC_KINDS,
  dragInputText,
  inputFromMach, isentropicValue, solveIsentropicText } from './model'

const KEY_KIND = 'iso.k'
const KEY_VALUE = 'iso.v'
const DEFAULT_STATE = expectOk(isentropicFromMach(2, 1.4))

export interface IsentropicSolver {
  readonly gamma: ReturnType<typeof useGamma>
  readonly kind: IsentropicInputKind
  readonly valueText: string
  /** Last valid state; shown dimmed while `error` is set. */
  readonly state: IsentropicState
  readonly error: FieldError<'value' | 'gamma'> | null
  readonly setKind: (kind: IsentropicInputKind) => void
  readonly setValueText: (text: string) => void
  readonly setMach: (mach: number) => void
}

export function useIsentropicSolver(): IsentropicSolver {
  const [params, update] = useSearchParams()
  const gamma = useGamma()
  const kind = readEnum(params, KEY_KIND, ISENTROPIC_KINDS, 'mach')
  const valueText = params.get(KEY_VALUE) ?? '2'

  const result = useMemo(
    () => solveIsentropicText(kind, valueText, gamma.text),
    [kind, valueText, gamma.text],
  )
  const state = useLastOk(result, DEFAULT_STATE)

  return {
    gamma,
    kind,
    valueText,
    state,
    error: fieldError(result),
    // Switching kinds converts the current state, so the field shows the same flow in new terms.
    setKind: (next) => {
      const value = isentropicValue(state, next) ?? isentropicValue(DEFAULT_STATE, next)
      update({ [KEY_KIND]: next, [KEY_VALUE]: value === null ? valueText : toQueryNumber(value, 6) })
    },
    setValueText: (text) => update({ [KEY_VALUE]: text }),
    setMach: (mach) => {
      const next = inputFromMach(kind, mach, gamma.value)
      update({ [KEY_KIND]: next.kind, [KEY_VALUE]: dragInputText(next, gamma.text, mach) })
    },
  }
}
