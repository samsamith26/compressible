import { useCallback, useMemo, useRef, useState } from 'react'
import type { CalcId } from '@/lib/calculators'
import { readUrl, writeUrl, type CalcParams } from '@/lib/urlState'

function replaceUrl(calc: CalcId, params: CalcParams) {
  const next = writeUrl(calc, params)
  if (window.location.search !== next) window.history.replaceState(null, '', next)
}

/**
 * Which calculator is open, plus each calculator's last inputs, mirrored to the
 * URL (replaceState, so typing does not flood the back button). Inputs survive
 * switching tabs because they are kept here, not only in the unmounted calculator.
 */
export function useCalcRouting() {
  const initial = useMemo(() => readUrl(window.location.search), [])
  const [calc, setCalcState] = useState<CalcId>(initial.calc ?? 'isentropic')
  const params = useRef<Record<CalcId, CalcParams>>({
    isentropic: {},
    normal: {},
    oblique: {},
    [initial.calc ?? 'isentropic']: initial.params,
  })
  const calcRef = useRef(calc)

  const setCalc = useCallback((next: CalcId) => {
    calcRef.current = next
    setCalcState(next)
    replaceUrl(next, params.current[next])
  }, [])

  const handlers = useMemo(() => {
    const make = (id: CalcId) => (p: CalcParams) => {
      params.current[id] = p
      if (calcRef.current === id) replaceUrl(id, p)
    }
    return { isentropic: make('isentropic'), normal: make('normal'), oblique: make('oblique') } satisfies Record<CalcId, (p: CalcParams) => void>
  }, [])

  return { calc, setCalc, initialParams: (id: CalcId) => params.current[id], onParamsChange: handlers }
}
