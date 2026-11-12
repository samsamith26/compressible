import { readEnum } from '@/lib/query'
import { useSearchParams } from './useSearchParams'

export type CalculatorId = 'isentropic' | 'normal' | 'oblique'

export const CALCULATORS: readonly { id: CalculatorId; title: string; short: string }[] = [
  { id: 'isentropic', title: 'Isentropic flow', short: 'Isentropic' },
  { id: 'normal', title: 'Normal shock', short: 'Normal' },
  { id: 'oblique', title: 'Oblique shock', short: 'Oblique' },
]

const IDS = CALCULATORS.map((c) => c.id)

/** The visible calculator, mirrored to `?calc=`. */
export function useCalculatorTab(): readonly [CalculatorId, (value: string) => void] {
  const [params, update] = useSearchParams()
  const tab = readEnum(params, 'calc', IDS, 'isentropic')
  return [tab, (value) => update({ calc: readEnum(new URLSearchParams({ calc: value }), 'calc', IDS, tab) })]
}
