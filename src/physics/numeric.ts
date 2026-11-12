/** Numeric helpers: angle conversion and a bracketed root finder. */

import { err, ok, type Result } from './result'

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180
}

export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI
}

export interface RootOptions {
  /** Relative x tolerance (default 1e-14), with an absolute floor of 1e-15. */
  readonly xtol?: number
  readonly maxIter?: number
}

/**
 * Brent's method: inverse quadratic interpolation and secant steps, falling
 * back to bisection whenever those would leave the bracket or converge slowly.
 * Guaranteed to converge for a continuous f with f(lo)·f(hi) ≤ 0.
 */
export function findRoot(
  f: (x: number) => number,
  lo: number,
  hi: number,
  opts: RootOptions = {},
): Result<number> {
  const maxIter = opts.maxIter ?? 200
  const xtol = opts.xtol ?? 1e-14

  let a = lo
  let b = hi
  let fa = f(a)
  let fb = f(b)
  if (fa === 0) return ok(a)
  if (fb === 0) return ok(b)
  if (!(fa * fb < 0)) {
    return err('NO_BRACKET', `No sign change between ${lo} and ${hi}`)
  }

  // c is the previous bracket end opposite b; d, e are the last two step sizes.
  let c = a
  let fc = fa
  let d = b - a
  let e = d

  for (let i = 0; i < maxIter; i++) {
    if (fb * fc > 0) {
      c = a
      fc = fa
      d = b - a
      e = d
    }
    if (Math.abs(fc) < Math.abs(fb)) {
      a = b
      b = c
      c = a
      fa = fb
      fb = fc
      fc = fa
    }

    const tol = 2 * Number.EPSILON * Math.abs(b) + 0.5 * Math.max(xtol * Math.abs(b), 1e-15)
    const m = 0.5 * (c - b)
    if (Math.abs(m) <= tol || fb === 0) return ok(b)

    if (Math.abs(e) >= tol && Math.abs(fa) > Math.abs(fb)) {
      const s = fb / fa
      let p: number
      let q: number
      if (a === c) {
        // secant
        p = 2 * m * s
        q = 1 - s
      } else {
        // inverse quadratic interpolation
        const qa = fa / fc
        const r = fb / fc
        p = s * (2 * m * qa * (qa - r) - (b - a) * (r - 1))
        q = (qa - 1) * (r - 1) * (s - 1)
      }
      if (p > 0) q = -q
      else p = -p
      if (2 * p < Math.min(3 * m * q - Math.abs(tol * q), Math.abs(e * q))) {
        e = d
        d = p / q
      } else {
        d = m
        e = m
      }
    } else {
      d = m
      e = m
    }

    a = b
    fa = fb
    b += Math.abs(d) > tol ? d : m > 0 ? tol : -tol
    fb = f(b)
  }
  return err('NO_CONVERGENCE', `Root finder did not converge in ${maxIter} iterations`)
}

/**
 * Find an upper bracket end: starting at `start`, double x until f(x) differs
 * in sign from f(lo). Used for open-ended ranges such as supersonic Mach.
 */
export function expandUpper(
  f: (x: number) => number,
  lo: number,
  start: number,
  limit: number,
): Result<number> {
  const signLo = Math.sign(f(lo))
  for (let x = start; x <= limit; x *= 2) {
    if (Math.sign(f(x)) !== signLo) return ok(x)
  }
  return err('NO_BRACKET', `No sign change found below ${limit}`)
}
