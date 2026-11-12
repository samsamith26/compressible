// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useSearchParams } from '../useSearchParams'

afterEach(() => {
  window.history.replaceState(null, '', '/')
})

describe('useSearchParams', () => {
  it('reads the current query string', () => {
    window.history.replaceState(null, '', '/?g=1.3')
    const { result } = renderHook(() => useSearchParams())
    expect(result.current[0].get('g')).toBe('1.3')
  })

  it('merges updates into the URL and re-renders', () => {
    window.history.replaceState(null, '', '/?calc=iso')
    const { result } = renderHook(() => useSearchParams())
    act(() => result.current[1]({ 'iso.v': '2' }))
    expect(window.location.search).toBe('?calc=iso&iso.v=2')
    expect(result.current[0].get('iso.v')).toBe('2')
  })

  it('follows back/forward navigation', () => {
    const { result } = renderHook(() => useSearchParams())
    act(() => {
      window.history.replaceState(null, '', '/?g=1.67')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    expect(result.current[0].get('g')).toBe('1.67')
  })
})
