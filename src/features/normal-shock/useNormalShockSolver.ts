import { useMemo } from 'react'
import { normalShock, type NormalShockInputKind, type NormalShockState } from '@/physics'
import { useGamma } from '@/hooks/useGamma'
import { useLastOk } from '@/hooks/useLastOk'
import { useSearchParams } from '@/hooks/useSearchParams'
import { fieldError, type FieldError } from '@/lib/fields'
import { toQueryNumber } from '@/lib/format'
import { expectOk } from '@/lib/invariant'
import { readEnum } from '@/lib/query'
import { NORMAL_SHOCK_KINDS, normalShockValue, solveNormalShockText } from './model'

const KEY_KIND = 'ns.k'
const KEY_VALUE = 'ns.v'
const DEFAULT_STATE = expectOk(normalShock(2, 1.4))

export interface NormalShockSolver {
  readonly gamma: ReturnType<typeof useGamma>
  readonly kind: NormalShockInputKind
  readonly valueText: string
  readonly state: NormalShockState
  readonly error: FieldError<'value' | 'gamma'> | null
  readonly setKind: (kind: NormalShockInputKind) => void
  readonly setValueText: (text: string) => void
}

export function useNormalShockSolver(): NormalShockSolver {
  const [params, update] = useSearchParams()
  const gamma = useGamma()
  const kind = readEnum(params, KEY_KIND, NORMAL_SHOCK_KINDS, 'm1')
  const valueText = params.get(KEY_VALUE) ?? '2'

  const result = useMemo(
    () => solveNormalShockText(kind, valueText, gamma.text),
    [kind, valueText, gamma.text],
  )
  const state = useLastOk(result, DEFAULT_STATE)

  return {
    gamma,
    kind,
    valueText,
    state,
    error: fieldError(result),
    setKind: (next) =>
      update({ [KEY_KIND]: next, [KEY_VALUE]: toQueryNumber(normalShockValue(state, next), 6) }),
    setValueText: (text) => update({ [KEY_VALUE]: text }),
  }
}
