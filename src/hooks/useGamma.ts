import { useMemo } from 'react'
import { parseField } from '@/lib/fields'
import { useLastOk } from './useLastOk'
import { useSearchParams } from './useSearchParams'

export const DEFAULT_GAMMA = '1.4'

/** γ is shared by all calculators (query key `g`). `value` is the last parsable γ, for charts. */
export function useGamma(): {
  readonly text: string
  readonly value: number
  readonly setText: (text: string) => void
} {
  const [params, update] = useSearchParams()
  const text = params.get('g') ?? DEFAULT_GAMMA
  const parsed = useMemo(() => parseField(text, 'γ'), [text])
  const value = useLastOk(parsed, 1.4)
  return { text, value: value > 1 ? value : 1.4, setText: (t) => update({ g: t }) }
}
