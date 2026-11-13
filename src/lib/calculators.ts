export type CalcId = 'isentropic' | 'normal' | 'oblique'

export interface CalculatorInfo {
  readonly id: CalcId
  readonly title: string
  /** Shorter name for narrow screens. */
  readonly short: string
}

export const CALCULATORS: readonly CalculatorInfo[] = [
  { id: 'isentropic', title: 'Isentropic flow', short: 'Isentropic' },
  { id: 'normal', title: 'Normal shock', short: 'Normal' },
  { id: 'oblique', title: 'Oblique shock', short: 'Oblique' },
]

export function isCalcId(s: string | null): s is CalcId {
  return CALCULATORS.some((c) => c.id === s)
}
