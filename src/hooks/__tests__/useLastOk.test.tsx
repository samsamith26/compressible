// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { err, ok, type Result } from '@/physics'
import { useLastOk } from '../useLastOk'

describe('useLastOk', () => {
  it('returns the initial value until a result succeeds, then keeps the last success', () => {
    const { result, rerender } = renderHook(({ r }: { r: Result<number> }) => useLastOk(r, 0), {
      initialProps: { r: err<number>('OUT_OF_RANGE', 'bad') },
    })
    expect(result.current).toBe(0)
    rerender({ r: ok(5) })
    expect(result.current).toBe(5)
    rerender({ r: err<number>('OUT_OF_RANGE', 'bad') })
    expect(result.current).toBe(5)
  })
})
