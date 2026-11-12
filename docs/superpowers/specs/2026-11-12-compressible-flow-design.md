# Compressible Flow App: Design (Phase 1)

Approved 2026-11-12.

## Intent

A modern, interactive replacement for the isentropic, normal shock, and oblique shock sections of the
Virginia Tech Compressible Aerodynamics Calculator (https://devenport.aoe.vt.edu/aoe3114/calc.html), with
visualizations. Phase 2 (not built now) is a rocket nozzle performance simulator that reuses the same physics module.

## Goals

- Isentropic: solve from M, T/T0, p/p0, ρ/ρ0, A/A* (sub/sup), Mach angle, or Prandtl-Meyer angle, for any γ > 1.
- Normal shock: solve from M1, M2, p2/p1, ρ2/ρ1, T2/T1, p02/p01, or p1/p02.
- Oblique shock: solve from M1 plus turn angle (weak/strong), wave angle, or M1n; report detachment when θ > θmax.
- Visualizations: interactive θ-β-M chart with draggable operating point; wedge/ramp diagram with shock at the correct
  angle (including detached case); before/after property comparison across shocks; isentropic ratio plots vs M with a
  marker at the current value.
- Inputs update live; no Calculate buttons. Footer credits the VT calculator as inspiration.

## Non-goals (Phase 1)

- Cone flow, Fanno, Rayleigh sections of the reference calculator.
- The nozzle simulator (but the architecture must allow it without changes to physics code).

## Constraints

- Vite + React + TypeScript (strict, no `any`) + Tailwind + shadcn/ui.
- Reference calculator code is used only for input lists and expected outputs. It is not copied; the physics is
  implemented independently from standard equations.
- No UI work until all physics tests pass.

## Architecture

```
src/physics/     pure functions, no UI imports, no side effects (enforced via ESLint no-restricted-imports)
src/features/    one folder per calculator: hooks (state/validation) + small components
src/components/  shared UI: shadcn primitives, chart primitives, layout
```

Phase 2 adds `src/physics/nozzle.ts` and `src/features/nozzle/`, reusing isentropic and normal-shock functions.

### Physics API conventions

- Solvers return `Result<T> = { ok: true; value: T } | { ok: false; error: { code; message; bounds? } }`; they never
  throw. Error codes include `INVALID_GAMMA`, `OUT_OF_RANGE`, `NOT_FINITE`.
- Oblique shock from θ returns `{ kind: 'attached'; weak; strong }` or `{ kind: 'detached'; thetaMax; betaAtThetaMax }`.
  Detachment is a valid outcome, not an error.
- Public angles are in degrees with a `Deg` suffix; internals use radians.

### Files

```
src/physics/
  index.ts         public exports
  result.ts        Result type and error codes
  gas.ts           γ validation, shared helpers
  numeric.ts       bracketed Brent root finder, deg/rad
  isentropic.ts    ratios(M, γ), machAngle, prandtlMeyer, inverses
  normalShock.ts   normalShock(M1, γ), inverses
  obliqueShock.ts  thetaFromBeta, betaFromTheta (weak/strong), thetaMax, from M1n
  solvers.ts       "solve from any input" dispatchers, one per calculator
  __tests__/       *.test.ts, fixtures/*.json
```

### Inverse methods

| Input | Method |
|---|---|
| T/T0, p/p0, ρ/ρ0, Mach angle | closed form |
| A/A* sub / sup | Brent on bracketed interval [ε, 1] / [1, M_big] |
| Prandtl-Meyer ν | Brent; check ν < ν_max first |
| Normal shock M2, p2/p1, ρ2/ρ1, T2/T1 | closed form (T2/T1 via quadratic) |
| Normal shock p02/p01, p1/p02 | Brent on M1 ∈ (1, M_big] |
| Oblique from θ | closed-form β at θmax; Brent on [μ, β_max] (weak), [β_max, 90°] (strong) |
| Oblique from β or M1n | direct |

### Outputs (match reference calculator)

- Isentropic: M, μ, ν, p/p0, ρ/ρ0, T/T0, p/p*, ρ/ρ*, T/T*, A/A*
- Normal shock: M1, M2, p02/p01, p1/p02, p2/p1, ρ2/ρ1, T2/T1
- Oblique: M2, θ, β, p2/p1, ρ2/ρ1, T2/T1, p02/p01, M1n, M2n

## Test plan (Vitest)

1. Textbook values at γ = 1.4 (Anderson tables, 4 significant figures), e.g. isentropic M=2: p/p0 0.1278,
   T/T0 0.5556, A/A* 1.6875, ν 26.38°; normal shock M1=2: M2 0.5774, p2/p1 4.5, p02/p01 0.7209; oblique M=2, θ=10°:
   β 39.31° weak / 83.7° strong. At least one non-1.4 γ case.
2. Reference-calculator fixtures: a committed Playwright script in `scripts/` drives the original page over a grid
   (every input type, γ ∈ {1.2, 1.4, 1.67}) and writes `src/physics/__tests__/fixtures/vt-*.json`.
3. Round trips: for every inverse, `forward(inverse(x)) ≈ x` to 1e-9 over a grid of M and γ.
4. Edge cases: M = 1 (A/A* = 1, ν = 0, μ = 90°); normal shock at M1 = 1 is identity; θ = 0 (weak β = μ, strong
   β = 90°); θ = θmax (weak = strong); θmax + ε detaches; A/A* branches near 1; every invalid input (γ ≤ 1, M ≤ 0,
   ratios out of range, p1/p02 above max, β ≤ μ, NaN/Infinity) returns the right error.
5. Coverage threshold: 100% lines and branches on `src/physics`, enforced in `vitest.config.ts`.

## UI (direction set later via frontend-design)

- A `useXxxSolver` hook per feature; components stay small.
- Charts: custom SVG with d3-scale / d3-shape (needed for drag, detachment drawing, smooth transitions).
- State mirrored to the URL query string for shareable links.
- Responsive, dark mode, keyboard accessible. Verified with Playwright at desktop and 375px, light and dark.

## Builder's calls (approved with this design)

Results instead of exceptions; degrees at the public API; custom SVG over a chart library; URL state;
100% physics coverage; reference HTML kept out of git (third-party code), only recorded numeric fixtures committed.
