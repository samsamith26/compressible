import { useSearchParams } from '@/hooks/useSearchParams'
import { readEnum } from '@/lib/query'

export type InletMode = 'ramps' | 'reflect'
export const INLET_MODES: readonly InletMode[] = ['ramps', 'reflect']

/** The Inlet tab's mode, mirrored to `?in.mode=`. Each mode keeps its own URL keys. */
export function useInletMode(): readonly [InletMode, (mode: InletMode) => void] {
  const [params, update] = useSearchParams()
  return [readEnum(params, 'in.mode', INLET_MODES, 'ramps'), (mode) => update({ 'in.mode': mode })]
}
