import type { Result } from '@/physics'

/** Unwrap a Result that is valid by construction (module-level defaults). Throws if it is not. */
export function expectOk<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(`Invariant failed: ${result.error.message}`)
  return result.value
}
