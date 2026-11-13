import { useEffect, useMemo, useState } from 'react'
import { useLastOk } from '@/hooks/useLastOk'
import { useLastValidGamma } from '@/hooks/useLastValidGamma'
import type { CalcParams } from '@/lib/urlState'
import { isentropicFromMach, type IsentropicInputKind, type IsentropicState } from '@/physics'
import { ISENTROPIC_DEFAULTS, isIsentropicKind, machToInput, seedValue, solveIsentropicText } from './model'

function defaultState(): IsentropicState {
  const r = isentropicFromMach(2, 1.4)
  if (!r.ok) throw new Error('default isentropic state must solve')
  return r.value
}

/** Value text for the initial kind: the URL's, else the default state expressed in that kind. */
function initialValue(initial: CalcParams): string {
  if (!isIsentropicKind(initial.kind)) return ISENTROPIC_DEFAULTS.value
  return initial.value ?? seedValue(initial.kind, defaultState()) ?? ''
}

/** State for the isentropic calculator: typed text in, solved (or last valid) state out. */
export function useIsentropic(initial: CalcParams, onParamsChange: (p: CalcParams) => void) {
  const [gamma, setGamma] = useState(initial.gamma ?? ISENTROPIC_DEFAULTS.gamma)
  const [kind, setKindState] = useState<IsentropicInputKind>(
    isIsentropicKind(initial.kind) ? initial.kind : ISENTROPIC_DEFAULTS.kind,
  )
  const [value, setValue] = useState(() => initialValue(initial))

  const solved = useMemo(() => solveIsentropicText(gamma, kind, value), [gamma, kind, value])
  const state = useLastOk(solved.result, defaultState())
  const stale = solved.result?.ok !== true
  const gammaValue = useLastValidGamma(gamma)

  useEffect(() => {
    onParamsChange({ gamma, kind, value })
  }, [gamma, kind, value, onParamsChange])

  /** Switch kind, re-seeding the value from the current state so it stays valid. */
  function setKind(next: IsentropicInputKind) {
    setKindState(next)
    // A kind that cannot express the state (an angle while subsonic) starts empty
    // rather than reinterpreting the old number as the new quantity.
    setValue(seedValue(next, state) ?? '')
  }

  /** Set the state from a Mach number picked on a chart, keeping the user's kind. */
  function setMach(mach: number) {
    const input = machToInput(kind, mach, gammaValue)
    if (input === null) return
    setKindState(input.kind)
    setValue(input.value)
  }

  const error = solved.result?.ok === false ? solved.result.error.message : undefined

  return {
    gamma,
    setGamma,
    kind,
    setKind,
    value,
    setValue,
    setMach,
    state,
    stale,
    gammaError: solved.field === 'gamma' ? error : undefined,
    valueError: solved.field === 'value' ? error : undefined,
    gammaValue,
  }
}
