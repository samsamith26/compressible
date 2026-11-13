import { useEffect, useMemo, useState } from 'react'
import { useLastOk } from '@/hooks/useLastOk'
import type { CalcParams } from '@/lib/urlState'
import { normalShock, type NormalShockInputKind, type NormalShockState } from '@/physics'
import { isNormalKind, NORMAL_DEFAULTS, seedValue, solveNormalText } from './model'

function defaultState(): NormalShockState {
  const r = normalShock(2, 1.4)
  if (!r.ok) throw new Error('default normal shock must solve')
  return r.value
}

export function useNormalShock(initial: CalcParams, onParamsChange: (p: CalcParams) => void) {
  const [gamma, setGamma] = useState(initial.gamma ?? NORMAL_DEFAULTS.gamma)
  const [kind, setKindState] = useState<NormalShockInputKind>(
    isNormalKind(initial.kind) ? initial.kind : NORMAL_DEFAULTS.kind,
  )
  const [value, setValue] = useState(
    isNormalKind(initial.kind) ? (initial.value ?? NORMAL_DEFAULTS.value) : NORMAL_DEFAULTS.value,
  )

  const solved = useMemo(() => solveNormalText(gamma, kind, value), [gamma, kind, value])
  const state = useLastOk(solved.result, defaultState())
  const error = solved.result?.ok === false ? solved.result.error.message : undefined

  useEffect(() => {
    onParamsChange({ gamma, kind, value })
  }, [gamma, kind, value, onParamsChange])

  function setKind(next: NormalShockInputKind) {
    setKindState(next)
    setValue(seedValue(next, state))
  }

  return {
    gamma,
    setGamma,
    kind,
    setKind,
    value,
    setValue,
    state,
    stale: solved.result?.ok !== true,
    gammaError: solved.field === 'gamma' ? error : undefined,
    valueError: solved.field === 'value' ? error : undefined,
  }
}
