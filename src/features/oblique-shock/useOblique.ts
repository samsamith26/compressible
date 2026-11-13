import { useEffect, useMemo, useState } from 'react'
import { useLastOk } from '@/hooks/useLastOk'
import { useLastValidGamma } from '@/hooks/useLastValidGamma'
import type { CalcParams } from '@/lib/urlState'
import type { ObliqueInputKind } from '@/physics'
import { dragToInput, isObliqueKind, OBLIQUE_DEFAULTS, seedValue, solveObliqueText, type ObliqueView } from './model'

function defaultView(): ObliqueView {
  const s = solveObliqueText(OBLIQUE_DEFAULTS.gamma, OBLIQUE_DEFAULTS.m1, OBLIQUE_DEFAULTS.kind, OBLIQUE_DEFAULTS.value)
  if (s.result === null || !s.result.ok) throw new Error('default oblique shock must solve')
  return s.result.value
}

export function useOblique(initial: CalcParams, onParamsChange: (p: CalcParams) => void) {
  const [gamma, setGamma] = useState(initial.gamma ?? OBLIQUE_DEFAULTS.gamma)
  const [m1, setM1] = useState(initial.m1 ?? OBLIQUE_DEFAULTS.m1)
  const [kind, setKindState] = useState<ObliqueInputKind>(isObliqueKind(initial.kind) ? initial.kind : OBLIQUE_DEFAULTS.kind)
  const [value, setValue] = useState(() =>
    isObliqueKind(initial.kind) ? (initial.value ?? seedValue(initial.kind, defaultView()) ?? '') : OBLIQUE_DEFAULTS.value,
  )

  const solved = useMemo(() => solveObliqueText(gamma, m1, kind, value), [gamma, m1, kind, value])
  const view = useLastOk(solved.result, defaultView())
  const error = solved.result?.ok === false ? solved.result.error.message : undefined
  const gammaValue = useLastValidGamma(gamma)

  useEffect(() => {
    onParamsChange({ gamma, m1, kind, value })
  }, [gamma, m1, kind, value, onParamsChange])

  function setKind(next: ObliqueInputKind) {
    setKindState(next)
    setValue(seedValue(next, view) ?? '')
  }

  /** Set the state from a wave angle picked on the θ-β-M chart, keeping the user's kind. */
  function setBeta(betaDeg: number) {
    const input = dragToInput(kind, view.m1, betaDeg, gammaValue)
    setKindState(input.kind)
    setValue(input.value)
  }

  return {
    gamma,
    setGamma,
    m1,
    setM1,
    kind,
    setKind,
    value,
    setValue,
    setBeta,
    view,
    gammaValue,
    stale: solved.result?.ok !== true,
    gammaError: solved.field === 'gamma' ? error : undefined,
    m1Error: solved.field === 'm1' ? error : undefined,
    valueError: solved.field === 'value' ? error : undefined,
  }
}
