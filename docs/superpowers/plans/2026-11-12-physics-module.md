# Physics Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `src/physics`, a pure TypeScript compressible-flow library (isentropic, normal shock, oblique shock, all inverses) with 100% Vitest coverage, validated against textbook values and the VT reference calculator.

**Architecture:** Small single-purpose modules that return `Result<T>` values instead of throwing. Forward relations come first; inverses use a closed form where one exists and a bracketed Brent root finder otherwise. One "solve from any input" dispatcher per calculator is the API the UI (and later the nozzle simulator) consumes.

**Tech Stack:** Vite + React + TypeScript (strict), Vitest + @vitest/coverage-v8, ESLint (typescript-eslint), Playwright (fixture recording only), tsx (runs the recording script).

**Spec:** `docs/superpowers/specs/2026-11-12-compressible-flow-design.md`

**Scope:** This plan covers the physics module only. The UI gets its own plan once every physics test passes and the visual direction is set with frontend-design.

## Global Constraints

- TypeScript strict mode. No `any`, no unchecked type assertions (`as`). Use `noUncheckedIndexedAccess: true`.
- `src/physics` imports nothing from React, the DOM, `@/features` or `@/components` (enforced by ESLint `no-restricted-imports`).
- Solvers never throw. They return `Result<T>`, and `ok`/`err` are the only constructors.
- Public angles are in degrees, with a `Deg` suffix on names. Internals use radians.
- γ must satisfy γ > 1 everywhere.
- Do not copy code from `reference/`. Implement from the standard equations (Anderson, *Modern Compressible Flow*).
- `npm run lint`, `npm run typecheck` and `npm test` must all pass before a task is done. Each task ends with a commit whose message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Coverage threshold on `src/physics/**`: 100% lines, branches, functions and statements.
- `reference/` stays gitignored. Only derived fixture JSON is committed.

## Review Focus

1. **γ near 1 or large (1.01, 3.0).** Exponents γ/(γ−1) blow up and the A/A* bracket must expand far. Expected: finite correct values or a clean error, with no hang. Tests go in Tasks 3 and 4.
2. **Hypersonic M1 (20, 50) in oblique shocks.** The weak root sits just above μ. Expected: a correct β whose forward θ matches the input. Test goes in Task 5.
3. **θ just below θmax (θmax − 1e-6).** Weak and strong nearly coincide around a double root. Expected: weak ≤ β_max ≤ strong, with both round-tripping θ. Test goes in Task 5.
4. **A/A* = 1 + 1e-12.** Expected: the subsonic branch returns M ≤ 1 and the supersonic branch returns M ≥ 1, never the wrong side. Test goes in Task 3.
5. **Boundary values.** ν = 0 gives M = 1. ν = ν_max is OUT_OF_RANGE. p1/p02 at its maximum gives M1 = 1. Tests go in Tasks 3 and 4.

---

### Task 1: Project scaffold, Result type, and input guards

**Files:**
- Create: Vite React-TS project files at repo root (`npm create vite@latest . -- --template react-ts`), `vitest.config.ts`, `eslint.config.js` (modify the generated one)
- Create: `src/physics/result.ts`, `src/physics/gas.ts`
- Test: `src/physics/__tests__/gas.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // result.ts
  export type ErrorCode = 'INVALID_GAMMA' | 'OUT_OF_RANGE' | 'NOT_FINITE' | 'NO_BRACKET' | 'NO_CONVERGENCE';
  export interface PhysicsError { readonly code: ErrorCode; readonly message: string; readonly bounds?: readonly [number, number] }
  export type Result<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: PhysicsError };
  export function ok<T>(value: T): Result<T>;
  export function err<T>(code: ErrorCode, message: string, bounds?: readonly [number, number]): Result<T>;
  // gas.ts
  export function validateGamma(gamma: number): Result<number>;                  // γ > 1, finite
  export function requireFinite(name: string, x: number): Result<number>;        // NOT_FINITE for NaN/±Infinity
  export interface Range { lo: number; hi: number; loInclusive: boolean; hiInclusive: boolean }
  export function requireInRange(name: string, x: number, range: Range): Result<number>; // NOT_FINITE first, then OUT_OF_RANGE with bounds [lo, hi]
  ```

- [ ] **Step 1: Scaffold.** Run the Vite command above (keep `CLAUDE.md`, `docs/` and `.gitignore`; merge the gitignore entries). Install the dev dependencies `vitest @vitest/coverage-v8`. Set `"strict": true, "noUncheckedIndexedAccess": true` in `tsconfig.app.json`. Add the scripts `"test": "vitest run --coverage"`, `"test:watch": "vitest"` and `"typecheck": "tsc -b --noEmit"`, and make sure `"lint": "eslint ."` exists. Add the `@/` path alias to `src/` in both tsconfig and the Vite config. In `vitest.config.ts`, set coverage `include: ['src/physics/**']`, `exclude: ['src/physics/__tests__/**']`, and thresholds of 100 for all four metrics. In ESLint, add `no-restricted-imports` for files `src/physics/**` with patterns `react`, `react-dom`, `@/features/*`, `@/components/*`, plus `@typescript-eslint/no-explicit-any: error` and `@typescript-eslint/consistent-type-assertions: ['error', { assertionStyle: 'never' }]` for `src/physics/**`.
- [ ] **Step 2: Write the failing tests** in `gas.test.ts`:
  - `validateGamma(1.4)` → `{ ok: true, value: 1.4 }`.
  - `validateGamma(1)`, `validateGamma(0.9)` and `validateGamma(NaN)` → `ok: false`. The first two give code `INVALID_GAMMA`; NaN gives `NOT_FINITE`.
  - `requireFinite('M', Infinity)` → `NOT_FINITE`, with the message containing `'M'`.
  - `requireInRange('p/p0', 1.2, { lo: 0, hi: 1, loInclusive: false, hiInclusive: false })` → `OUT_OF_RANGE` with `bounds` `[0, 1]`.
  - The endpoints obey inclusivity: `0` is rejected and `1` is accepted when `hiInclusive: true`.
- [ ] **Step 3: Run** `npx vitest run src/physics/__tests__/gas.test.ts`. Expected: FAIL (module not found).
- [ ] **Step 4: Implement `result.ts` and `gas.ts`** per the Interfaces block. Messages are human-readable, e.g. `"p/p0 must be between 0 and 1"`.
- [ ] **Step 5: Verify.** Run `npm run lint && npm run typecheck && npm test`. Expected: all pass and coverage is 100%. Also add a throwaway `import 'react'` to `gas.ts`, confirm `npm run lint` fails, then remove it.
- [ ] **Step 6: Commit** with `chore: scaffold Vite+TS project with Vitest and physics Result/guards`.

### Task 2: Numeric utilities

**Files:**
- Create: `src/physics/numeric.ts`
- Test: `src/physics/__tests__/numeric.test.ts`

**Interfaces:**
- Consumes: `Result`, `ok`, `err` from Task 1.
- Produces:
  ```ts
  export function degToRad(deg: number): number;
  export function radToDeg(rad: number): number;
  export interface RootOptions { xtol?: number; maxIter?: number }   // defaults: xtol 1e-14 (relative to |x|, absolute floor 1e-15), maxIter 200
  export function findRoot(f: (x: number) => number, lo: number, hi: number, opts?: RootOptions): Result<number>;
  export function expandUpper(f: (x: number) => number, lo: number, start: number, limit: number): Result<number>;
  ```
  - `findRoot` is Brent's method. If `f(lo)` or `f(hi)` is exactly 0, it returns that endpoint. If `f(lo)·f(hi) > 0`, it returns `NO_BRACKET`. If it fails to converge, it returns `NO_CONVERGENCE`.
  - `expandUpper` starts at `start` and doubles until `f(x)` has the opposite sign of `f(lo)`. It returns that x, or `NO_BRACKET` once `limit` is exceeded.

- [ ] **Step 1: Write the failing tests:**
  - `findRoot(x => x*x - 2, 0, 2)` → `Math.SQRT2` within 1e-14.
  - `findRoot(Math.cos, 0, 3)` → π/2 within 1e-14.
  - `findRoot(x => x - 1, 1, 5)` → exactly 1 (root at an endpoint).
  - `findRoot(x => x*x + 1, -1, 1)` → `NO_BRACKET`.
  - `findRoot(Math.cos, 0, 3, { maxIter: 1 })` → `NO_CONVERGENCE`.
  - `expandUpper(x => x - 1000, 1, 2, 1e6)` → a value ≥ 1000.
  - `expandUpper(x => -1, 0, 1, 1e3)` → `NO_BRACKET`.
  - `degToRad(180)` = π, and `radToDeg(Math.PI / 2)` = 90.
- [ ] **Step 2: Run** `npx vitest run src/physics/__tests__/numeric.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement `numeric.ts`** with the standard Brent algorithm (inverse quadratic interpolation, secant step, and bisection fallback).
- [ ] **Step 4: Verify.** Run `npm run lint && npm run typecheck && npm test`. Expected: PASS at 100% coverage.
- [ ] **Step 5: Commit** with `feat(physics): add Brent root finder and angle conversions`.

### Task 3: Isentropic relations and inverses

**Files:**
- Create: `src/physics/isentropic.ts`
- Test: `src/physics/__tests__/isentropic.test.ts`

**Interfaces:**
- Consumes: `validateGamma`, `requireInRange`, `requireFinite` (Task 1); `findRoot`, `expandUpper`, `degToRad`, `radToDeg` (Task 2).
- Produces:
  ```ts
  export interface IsentropicState {
    mach: number; machAngleDeg: number | null; prandtlMeyerDeg: number | null; // null when M < 1
    pP0: number; rhoRho0: number; tT0: number;
    pPStar: number; rhoRhoStar: number; tTStar: number; aAStar: number;
  }
  export function isentropicFromMach(mach: number, gamma: number): Result<IsentropicState>; // M > 0
  export function areaRatio(mach: number, gamma: number): number;        // raw, unvalidated; reused by nozzle
  export function prandtlMeyerDeg(mach: number, gamma: number): number;  // raw, M ≥ 1
  export function maxPrandtlMeyerDeg(gamma: number): number;             // 90·(√((γ+1)/(γ−1)) − 1)
  export function machFromTT0(tT0: number, gamma: number): Result<number>;         // tT0 ∈ (0,1)
  export function machFromPP0(pP0: number, gamma: number): Result<number>;         // (0,1)
  export function machFromRhoRho0(rhoRho0: number, gamma: number): Result<number>; // (0,1)
  export type FlowBranch = 'subsonic' | 'supersonic';
  export function machFromAreaRatio(aAStar: number, gamma: number, branch: FlowBranch): Result<number>; // aAStar ≥ 1, bounds [1, Infinity]
  export function machFromMachAngle(muDeg: number): Result<number>;                // μ ∈ (0, 90]; M = 1/sin μ
  export function machFromPrandtlMeyer(nuDeg: number, gamma: number): Result<number>; // ν ∈ [0, ν_max)
  ```
  - The `*Star` ratios divide by the sonic values at M = 1.
  - For area ratio, the subsonic bracket is `[1e-12, 1]`. The supersonic bracket is `[1, expandUpper(…, start 2, limit 1e8)]`. At aAStar = 1, both branches return exactly 1.

- [ ] **Step 1: Write the failing tests** (relative tolerance 1e-5 unless noted):
  - `isentropicFromMach(2, 1.4)` → tT0 0.555556, pP0 0.127805, rhoRho0 0.230048, aAStar 1.6875, machAngleDeg 30 (1e-12), prandtlMeyerDeg 26.3798, tTStar 0.666667, pPStar 0.241925, rhoRhoStar 0.362887.
  - `isentropicFromMach(2, 1.3)` → tT0 0.625, pP0 0.130464.
  - `isentropicFromMach(0.5, 1.4)` → aAStar 1.33984, machAngleDeg null, prandtlMeyerDeg null.
  - At M = 1: aAStar = 1, machAngleDeg = 90, prandtlMeyerDeg = 0, and tTStar = pPStar = rhoRhoStar = 1 (1e-12).
  - `maxPrandtlMeyerDeg(1.4)` → 130.454.
  - Round trips: for γ ∈ {1.1, 1.3, 1.4, 1.67} and M ∈ {0.05, 0.3, 0.7, 0.99, 1.01, 1.5, 3, 8, 20}, each applicable inverse fed the forward value returns M within 1e-9 relative. Applicable means: the T, p, ρ and area inverses on the matching branch; Mach angle and ν only when M ≥ 1.
  - Errors: M = 0 and M = −1 give OUT_OF_RANGE. `machFromPP0(1.2, 1.4)` gives OUT_OF_RANGE with bounds [0, 1]. `machFromAreaRatio(0.9, …)` gives OUT_OF_RANGE. `machFromMachAngle(95)` gives OUT_OF_RANGE. γ = 1 gives INVALID_GAMMA. NaN gives NOT_FINITE.
  - Review Focus 1: `machFromAreaRatio(1e6, 1.01, 'supersonic')` and `machFromPP0(1e-6, 3.0)` return ok, and the forward value round-trips within 1e-8.
  - Review Focus 4: `machFromAreaRatio(1 + 1e-12, 1.4, 'subsonic')` returns ≤ 1, and the supersonic branch returns ≥ 1.
  - Review Focus 5: `machFromPrandtlMeyer(0, 1.4)` → 1. `machFromPrandtlMeyer(130.454, 1.4)` and `machFromPrandtlMeyer(131, 1.4)` → OUT_OF_RANGE, with bounds [0, maxPrandtlMeyerDeg(1.4)].
- [ ] **Step 2: Run** `npx vitest run src/physics/__tests__/isentropic.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement `isentropic.ts`.** T, p and ρ use closed-form inverses through T/T0. Area and ν use `findRoot`. For ν, the bracket upper end comes from `expandUpper`.
- [ ] **Step 4: Verify.** Run `npm run lint && npm run typecheck && npm test`. Expected: PASS at 100% coverage.
- [ ] **Step 5: Commit** with `feat(physics): isentropic relations with all inverse solvers`.

### Task 4: Normal shock relations and inverses

**Files:**
- Create: `src/physics/normalShock.ts`
- Test: `src/physics/__tests__/normalShock.test.ts`

**Interfaces:**
- Consumes: Tasks 1–3 (`isentropicFromMach` or the raw p/p0 relation, for the stagnation ratios).
- Produces:
  ```ts
  export interface NormalShockState { m1: number; m2: number; p2P1: number; rho2Rho1: number; t2T1: number; p02P01: number; p1P02: number }
  export function normalShock(m1: number, gamma: number): Result<NormalShockState>; // M1 ≥ 1; M1 = 1 is the identity
  export function m1FromM2(m2: number, gamma: number): Result<number>;           // M2 ∈ (√((γ−1)/(2γ)), 1]
  export function m1FromP2P1(p2P1: number, gamma: number): Result<number>;       // ≥ 1
  export function m1FromRho2Rho1(r: number, gamma: number): Result<number>;      // [1, (γ+1)/(γ−1))
  export function m1FromT2T1(t: number, gamma: number): Result<number>;          // ≥ 1
  export function m1FromP02P01(r: number, gamma: number): Result<number>;        // (0, 1]
  export function m1FromP1P02(r: number, gamma: number): Result<number>;         // (0, (2/(γ+1))^(γ/(γ−1))]
  ```
  - `p1P02` is p1 divided by the downstream stagnation pressure (the Rayleigh pitot ratio).
  - The `m1FromT2T1` closed form uses x = M1² and takes the positive root of
    `2γ(γ−1)x² + (4γ − (γ−1)² − τ(γ+1)²)x − 2(γ−1) = 0`, where τ = T2/T1.
  - p02/p01 and p1/p02 use `findRoot` on M1 ∈ [1, expandUpper(…, limit 1e6)].

- [ ] **Step 1: Write the failing tests** (relative tolerance 1e-5):
  - `normalShock(2, 1.4)` → m2 0.577350, p2P1 4.5, rho2Rho1 2.666667, t2T1 1.6875, p02P01 0.720874, p1P02 0.177291.
  - `normalShock(1, 1.4)` → every ratio equals 1 (1e-12), with m2 = 1 and p1P02 0.528282.
  - Round trips: for γ ∈ {1.1, 1.3, 1.4, 1.67} and M1 ∈ {1.001, 1.2, 2, 5, 10, 50}, each inverse returns M1 within 1e-9.
  - Errors: M1 = 0.8 gives OUT_OF_RANGE. `m1FromM2(0.3, 1.4)` gives OUT_OF_RANGE with bounds [0.377964, 1]. `m1FromRho2Rho1(6, 1.4)` gives OUT_OF_RANGE. `m1FromP02P01(1.1, …)` gives OUT_OF_RANGE. `m1FromP1P02(0.6, 1.4)` gives OUT_OF_RANGE.
  - Review Focus 1: at γ = 1.01 and M1 = 10, the round trips for every inverse pass within 1e-8.
  - Review Focus 5: `m1FromP1P02(normalShock(1, 1.4).value.p1P02, 1.4)` → 1.
- [ ] **Step 2: Run** `npx vitest run src/physics/__tests__/normalShock.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement `normalShock.ts`** with the standard Rankine–Hugoniot relations and the inverse methods given above.
- [ ] **Step 4: Verify.** Run `npm run lint && npm run typecheck && npm test`. Expected: PASS at 100% coverage.
- [ ] **Step 5: Commit** with `feat(physics): normal shock relations with all inverse solvers`.

### Task 5: Oblique shock relations, θmax, and detachment

**Files:**
- Create: `src/physics/obliqueShock.ts`
- Test: `src/physics/__tests__/obliqueShock.test.ts`

**Interfaces:**
- Consumes: `normalShock` (Task 4, applied to M1n); `findRoot`, `degToRad`, `radToDeg` (Task 2); guards (Task 1).
- Produces:
  ```ts
  export interface ObliqueShockState { m1: number; m1n: number; m2n: number; m2: number; thetaDeg: number; betaDeg: number;
    p2P1: number; rho2Rho1: number; t2T1: number; p02P01: number }
  export interface MaxDeflection { thetaMaxDeg: number; betaDeg: number }
  export type ObliqueFromTheta =
    | { kind: 'attached'; weak: ObliqueShockState; strong: ObliqueShockState; max: MaxDeflection }
    | { kind: 'detached'; max: MaxDeflection };
  export function thetaFromBetaDeg(m1: number, betaDeg: number, gamma: number): number; // raw θ-β-M; clamps tiny negatives to 0; for chart curves
  export function maxDeflection(m1: number, gamma: number): Result<MaxDeflection>;   // M1 > 1
  export function obliqueFromBeta(m1: number, betaDeg: number, gamma: number): Result<ObliqueShockState>; // β ∈ [μ, 90]
  export function obliqueFromM1n(m1: number, m1n: number, gamma: number): Result<ObliqueShockState>;    // M1n ∈ [1, M1]
  export function obliqueFromTheta(m1: number, thetaDeg: number, gamma: number): Result<ObliqueFromTheta>; // θ ≥ 0
  ```
  - θ-β-M relation: `tan θ = 2 cot β (M1² sin²β − 1) / (M1²(γ + cos 2β) + 2)`.
  - β at θmax, in closed form: `sin²β = [(γ+1)M² − 4 + √((γ+1)((γ+1)M⁴ + 8(γ−1)M² + 16))] / (4γM²)`.
  - Downstream Mach: `M2 = M2n / sin(β − θ)`.
  - `obliqueFromTheta` returns `detached` when θ > θmax. When |θ − θmax| ≤ 1e-12, weak = strong = β_max. Otherwise the weak β is the `findRoot` of θ(β) − θ on [μ, β_max] and the strong β is the root on [β_max, 90].

- [ ] **Step 1: Write the failing tests** (β to 1e-4 degrees, ratios to 1e-4 relative):
  - `obliqueFromTheta(2, 10, 1.4)` is attached with weak.betaDeg 39.3139 and strong.betaDeg 83.7001. For the weak solution, m1n = 2·sin(β) and p2P1 1.7066.
  - `obliqueFromTheta(3, 20, 1.4)` → weak.betaDeg 37.7636.
  - `maxDeflection(2, 1.4)` → thetaMaxDeg 22.9735, betaDeg 64.6690.
  - `obliqueFromTheta(2, 23, 1.4)` → `{ kind: 'detached', max: { thetaMaxDeg ≈ 22.9735 } }`.
  - `obliqueFromTheta(2, maxDeflection(2,1.4).thetaMaxDeg, 1.4)` → weak.betaDeg = strong.betaDeg.
  - At θ = 0: weak.betaDeg = 30 (μ at M = 2) and strong.betaDeg = 90. The strong solution's p2P1 equals `normalShock(2,1.4)` p2P1.
  - `obliqueFromBeta(2, 90, 1.4)` matches the normal shock. `obliqueFromM1n(2, 1.2671, 1.4)` → betaDeg ≈ 39.31.
  - Round trips: for M1 ∈ {1.2, 2, 5, 10} and θ at 10%, 50% and 99% of θmax, `thetaFromBetaDeg(M1, β)` reproduces θ within 1e-9 degrees for both solutions.
  - Errors: M1 = 1 and M1 = 0.9 give OUT_OF_RANGE. θ = −1 gives OUT_OF_RANGE. `obliqueFromBeta(2, 25, 1.4)` (below μ) gives OUT_OF_RANGE with bounds [30, 90]. β = 91 gives OUT_OF_RANGE. `obliqueFromM1n(2, 2.5, 1.4)` gives OUT_OF_RANGE.
  - Review Focus 2: `obliqueFromTheta(50, 10, 1.4)` and `obliqueFromTheta(20, 30, 1.4)` are attached, and their weak β round-trips θ within 1e-9 degrees.
  - Review Focus 3: with θ = θmax − 1e-6 at M1 = 2 and M1 = 5, the result is attached, weak.betaDeg ≤ max.betaDeg ≤ strong.betaDeg, and both round-trip within 1e-6 degrees.
- [ ] **Step 2: Run** `npx vitest run src/physics/__tests__/obliqueShock.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement `obliqueShock.ts`.** `obliqueFromBeta` builds on `normalShock(M1 sin β)`. `obliqueFromM1n` converts to β = asin(M1n/M1) and delegates to `obliqueFromBeta`.
- [ ] **Step 4: Verify.** Run `npm run lint && npm run typecheck && npm test`. Expected: PASS at 100% coverage.
- [ ] **Step 5: Commit** with `feat(physics): oblique shock solver with weak/strong roots and detachment`.

### Task 6: Solver dispatchers and public index

**Files:**
- Create: `src/physics/solvers.ts`, `src/physics/index.ts`
- Test: `src/physics/__tests__/solvers.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 3–5.
- Produces (these are the UI's and the nozzle's entry points):
  ```ts
  export type IsentropicInputKind = 'mach' | 'tT0' | 'pP0' | 'rhoRho0' | 'areaSub' | 'areaSup' | 'machAngleDeg' | 'prandtlMeyerDeg';
  export type NormalShockInputKind = 'm1' | 'm2' | 'p2P1' | 'rho2Rho1' | 't2T1' | 'p02P01' | 'p1P02';
  export type ObliqueInputKind = 'thetaWeak' | 'thetaStrong' | 'beta' | 'm1n';
  export interface SolverInput<K extends string> { kind: K; value: number }
  export function solveIsentropic(input: SolverInput<IsentropicInputKind>, gamma: number): Result<IsentropicState>;
  export function solveNormalShock(input: SolverInput<NormalShockInputKind>, gamma: number): Result<NormalShockState>;
  export type ObliqueSolution =
    | { kind: 'attached'; state: ObliqueShockState; max: MaxDeflection }
    | { kind: 'detached'; max: MaxDeflection };
  export function solveOblique(m1: number, input: SolverInput<ObliqueInputKind>, gamma: number): Result<ObliqueSolution>;
  ```
  - `index.ts` re-exports every public type and function from `result`, `isentropic`, `normalShock`, `obliqueShock` and `solvers`. `numeric` and `gas` stay internal.
  - For the `beta` and `m1n` inputs, `solveOblique` attaches `max` from `maxDeflection(m1, γ)`.

- [ ] **Step 1: Write the failing tests:**
  - For every input kind, `solveX({ kind, value: forwardValue }, γ)` yields the same state as the forward solver at M = 2 (oblique: M1 = 2 with θ = 10°), within 1e-9.
  - `solveOblique(2, { kind: 'thetaWeak', value: 30 }, 1.4)` → `kind: 'detached'`.
  - An error from an inner solver passes through unchanged. For example, `solveIsentropic({ kind: 'pP0', value: 2 }, 1.4)` gives the OUT_OF_RANGE error with bounds [0, 1].
  - Use an exhaustive `switch` with a `never` check, so TypeScript fails if a kind goes unhandled.
- [ ] **Step 2: Run** `npx vitest run src/physics/__tests__/solvers.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement `solvers.ts` and `index.ts`.**
- [ ] **Step 4: Verify.** Run `npm run lint && npm run typecheck && npm test`. Expected: PASS at 100% coverage.
- [ ] **Step 5: Commit** with `feat(physics): add solve-from-any-input dispatchers and public API`.

### Task 7: VT reference-calculator fixtures

**Files:**
- Create: `scripts/record-vt-fixtures.ts`
- Create: `src/physics/__tests__/fixtures/vt-isentropic.json`, `vt-normal-shock.json`, `vt-oblique.json` (generated)
- Test: `src/physics/__tests__/vt-reference.test.ts`

**Interfaces:**
- Consumes: `solveIsentropic`, `solveNormalShock`, `solveOblique` (Task 6).
- Produces: fixture records of the form
  ```ts
  interface VtFixture { gamma: number; m1?: number; inputKind: string; inputValue: number;
    outputs: Record<string, string> | null;   // raw strings exactly as VT displayed them; null if VT raised an alert
    alert?: string }
  ```
  `outputs` is keyed by our state field names, using a mapping table at the top of the script. For example, VT `pp0` maps to `pP0`, `aas` to `aAStar`, `delta` to `thetaDeg`, and `beta` to `betaDeg`.

- [ ] **Step 1: Write the recording script.** Install the dev dependencies `playwright tsx`, then run `npx playwright install chromium`. The script opens `https://devenport.aoe.vt.edu/aoe3114/calcbody.html` directly (it is the inner frame, so no frameset handling is needed). It works on the first three `<form>` elements in document order: isentropic, normal shock and oblique. For each case it sets `g`, (`m` for oblique), selects option index `i`, sets `v`/`a`, and clicks the button. It captures any `dialog` as `alert` and dismisses it. Otherwise it reads each output field's `value` as a raw string.
  - Grid: γ ∈ {1.2, 1.4, 1.67}.
  - Isentropic: each of the 8 input kinds at 3 valid values plus 1 invalid value.
  - Normal shock: each of the 7 kinds at 3 valid values plus 1 invalid value.
  - Oblique: M1 ∈ {1.5, 2, 5}, each of the 4 kinds at 2 valid values, plus θ = 1.1·θmax as a detachment case.
  - Add the script `"fixtures:vt": "tsx scripts/record-vt-fixtures.ts"`.
- [ ] **Step 2: Record.** Run `npm run fixtures:vt`. Expected: three JSON files with no empty `outputs` strings on valid cases. Spot-check that isentropic at γ = 1.4, M = 2 shows `pP0` starting with `0.12780`.
- [ ] **Step 3: Write `vt-reference.test.ts`.** Use `it.each` over every fixture.
  - A valid case must give `ok` (or `attached`).
  - Each output must match within `tol = max(2 × unitInLastPlace(rawString), 1e-5 × |vt|)`. Here `unitInLastPlace` reads the decimal places in the string, including exponent notation, because VT truncates to 10 characters.
  - A case with an `alert` must give `ok: false`, or `kind: 'detached'` for the turn-angle-too-large alert.
  - Skip null outputs, such as μ or ν when M < 1.
- [ ] **Step 4: Run** `npm test`. Expected: PASS at 100% coverage. If any case fails, debug it before loosening the tolerance. VT's own iterative inverses may be the less accurate side; confirm by checking the forward round trip. Document any justified per-field tolerance in the test with a one-line comment.
- [ ] **Step 5: Final verification.** Run `npm run lint && npm run typecheck && npm test`. Expected: all green.
- [ ] **Step 6: Commit** the script, fixtures and test with `test(physics): validate against VT calculator fixtures`.
- [ ] **Step 7: Run the code-review skill** on the physics module (per CLAUDE.md) and address the findings before the UI plan begins.
