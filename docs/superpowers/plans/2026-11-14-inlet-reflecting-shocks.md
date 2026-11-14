# Inlet Reflecting-Shocks Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Reflecting shocks" mode beside "Ramp series" in the Inlet tab. The two modes share the drawing, table, recovery chart and shock detail.

**Architecture:**
- Move the mode-agnostic inlet pieces into `src/features/inlet/shared/`, and the ramp-specific ones into `ramps/`.
- Generalize `FlowField` into `InletField`, a drawing that takes walls, regions, shocks, a stop marker and a handle render prop.
- The new mode is `reflect/`, containing a pure `model.ts`, `geometry.ts` and `text.ts`, plus a `useReflect` hook, an editor, and `ReflectMode`.
- `InletCalculator` becomes the mode switch.

**Tech Stack:** as before: React 19, TypeScript strict, Tailwind, d3-scale, Vitest with jsdom, and Playwright `verify:ui`.

**Spec:** `docs/superpowers/specs/2026-11-14-inlet-reflecting-shocks-design.md` (the prior inlet spec still applies to ramp mode).

## Global Constraints

- **Code rules:** no `any` and no `as`; logic lives in `.ts` modules and hooks; `@/physics` is used only via its index; `src/physics` is unchanged.
- **Ramp mode must not change.** Every existing inlet test keeps passing, adjusted for file moves and the `thetaCumDeg` → `flowDeg` rename.
- **URL keys:** `in.mode` (`ramps` | `reflect`, default `ramps`); `rf.m` = `3`, `rf.t` = `10`, `rf.h` = `1`, `rf.l` = `5`; γ is shared as `g`.
- **Limits:** θ ∈ (0, 40]; H ∈ (0, 5]; L ∈ (0, 20].
- **Mode explanations, verbatim:**
  - "External compression: the shocks focus toward the cowl lip."
  - "Internal compression: the shock bounces inside the duct."
- **Note, verbatim:** "Shock–boundary-layer interaction at reflections is ignored, and shock merging past an intersection is not modeled."
- **Commits:** lint, typecheck, test, build and `verify:ui` pass at each commit, and each commit message ends with the Co-Authored-By line.

## Review Focus

1. **Switching modes with invalid input in the other mode.** Expected: each mode keeps its own text and errors, and the switch never resets either. Test: in Task 4's hook tests.
2. **θ so small that the shock exits before reaching the cowl** (θ = 0.5°, L = 5). Expected: a channel-end stop with one region behind the shock, and finite geometry. Test: in Task 2.
3. **H large relative to L** (H = 5, L = 1): shock 1 leaves the channel before hitting the cowl. Expected: a channel-end stop after one shock. Test: in Task 2.
4. **The channel closing** (M₁ = 10, θ = 5°, H = 1, L = 20). The channel narrows below 1% of H after 11 shocks. Expected: a walls-meet stop, with the channel drawn only to the meeting point. Test: in Tasks 2 and 3.
5. **A leading-edge bow shock** (M₁ = 1.5, θ = 15° > θmax ≈ 12.1°). Expected: no shocks, region 1 filling the channel, and a detached notice (not a Mach-reflection notice). Test: in Tasks 2 and 5.

---

### Task 1: Refactor the shared inlet parts (no behaviour change)

**Moves (`git mv`):**
- **To `shared/`:** `RegionTable`, `RecoveryChart`, `recovery.ts`, `ShockDetail`, `RegionTooltip`, `ShadeLegend`, `shade.ts`, `labels.ts`, `frame.ts`, `InletNotices`.
- **New `shared/chain.ts`:** the `Region`, `ShockLink`, `Chain` and `ShadeProperty` types and `SHADE_PROPERTIES`, taken from `model.ts`.
- **To `ramps/`:** `model.ts`, `geometry.ts`, `corner.ts`, `useInlet.ts` (renamed `useRamps.ts` / `useRamps`), `RampEditor`, `CompareSummary`.

Tests move with their subjects.

**Interfaces (produced):**
```ts
// shared/chain.ts
export interface Region { index; mach; betaDeg: number | null; thetaLocalDeg; flowDeg; pP1; rhoRho1; tT1; p0P01 }   // flowDeg replaces thetaCumDeg
// shared/InletField.tsx
export interface FieldShock { readonly index: number; readonly from: Pt; readonly to: Pt; readonly label?: string }
export interface FieldStop { readonly at: Pt; readonly text: string }
export function InletField(props: {
  label: string; bounds: { x0: number; x1: number; y1: number }
  lowerWall: readonly Pt[]          // from the lead-in to the end; the solid body is filled below it
  upperWall?: readonly Pt[]         // cowl; the solid is filled above it
  regions: readonly RegionShape[]; chain: Chain; shocks: readonly FieldShock[]
  clipX: number | null; conflictAt: Pt | null; stop: FieldStop | null
  property; domain; selected: number | null; interactive: boolean
  onSelectShock?: (n: number) => void; maxHeight?: number; stale?: boolean
  handles?: (frame: Frame) => ReactNode
}): JSX.Element
// shared/RecoveryChart: props { steps, single, name: string, singleName: string | null, stale }
```

- `ramps/RampField.tsx` wraps `InletField`. It maps `InletGeometry` to the generic props and renders the corner handles through `handles`.
- `ShockDetail` text becomes "turns the flow θ = …".

- [ ] Do the moves and the rename. Fix imports. Run `npm test`: all 703 must still pass (only the moved tests' import paths and `flowDeg` change; no assertion values change). Also run lint, typecheck and `verify:ui`.
- [ ] Commit `refactor(inlet): split shared and ramp-series parts; generic InletField`.

### Task 2: The reflect chain model

**Files:** create `reflect/model.ts`; test `reflect/__tests__/model.test.ts`.

**Interfaces:**
```ts
export interface ReflectInput { readonly m1: number; readonly thetaDeg: number; readonly height: number; readonly length: number }
export type ReflectStop =
  | { kind: 'channelEnd' } | { kind: 'wallsMeet' }
  | { kind: 'machReflection'; at: Pt; upstreamMach: number; thetaMaxDeg: number }
  | { kind: 'leadingEdge'; thetaMaxDeg: number }            // detached at the leading edge
  | { kind: 'subsonic'; at: Pt; upstreamMach: number }
export interface ReflectShock { readonly index: number; readonly from: Pt; readonly to: Pt; readonly fromWall: 'ramp' | 'cowl'; readonly wallAngleDeg: number }
export interface ReflectSolution { readonly input: ReflectInput; readonly chain: Chain; readonly shocks: readonly ReflectShock[]; readonly stop: ReflectStop; readonly channelEndX: number; readonly meetX: number }
export function solveReflect(input: ReflectInput, gamma: number): Result<ReflectSolution>
```

**Rules:**
- `meetX` = H / tan θ. `channelEndX` = min(L, `meetX`).
- Shock k leaves P_k. P₁ = (0, 0), on the ramp.
  - **From the ramp:** drawn at β above horizontal, hitting the cowl at x = P.x + (H − P.y)/tan β.
  - **From the cowl:** drawn at β − θ below horizontal, hitting the ramp at x = (P.y + tan(β−θ)·P.x)/(tan θ + tan(β−θ)).
  - If the hit's x > `channelEndX`, the shock ends where it crosses x = `channelEndX`, its region is still added, and the stop is `channelEnd`.
  - If the channel height at the hit point is below 0.01·H, the shock and its region are added and the stop is `wallsMeet`.
- **Flow direction:** behind a ramp-origin shock, θ; behind a cowl-origin shock, 0. `thetaLocalDeg` = θ.
- Iterations are capped at 100.

- [ ] **Tests, written first:**
  - **The 2.8/16 case:**
    - β₁ = 34.92 and M₂ = 2.059;
    - shock 2 has `wallAngleDeg` 29.33 and starts on the cowl at x = 1.432;
    - M₃ = 1.458 and p/p₁ = 6.607;
    - the stop is `machReflection`, with θmax = 11.00 and `at` = (2.127, 0.610).
  - **The default case:** 4 shocks; final M = 1.373, p/p₁ = 10.945, p₀/p₀₁ = 0.9125; a `machReflection` stop with θmax = 8.67.
  - **Every region** equals a standalone `solveOblique(region.mach, θ)` chained through.
  - **The other stops:** a channel end (θ = 10°, L = 2.5, giving 2 shocks); walls meeting (M₁ = 10, θ = 5°, H = 1, L = 20, giving 11 shocks); Review Focus 2, 3 and 5; and finite values throughout.
  - **Invalid M₁ and γ** pass the errors through.
- [ ] Implement it, test it, and commit `feat(inlet): reflecting-shock chain model`.

### Task 3: Reflect geometry

**Files:** `reflect/geometry.ts`; test `reflect/__tests__/geometry.test.ts`.

**Interfaces:**
```ts
export interface ReflectGeometry { bounds: { x0; x1; y1 }; lowerWall: Pt[]; upperWall: Pt[]; regions: RegionShape[]; shocks: FieldShock[]; stop: FieldStop | null }
export function reflectGeometry(s: ReflectSolution): ReflectGeometry
export function thetaFromPointer(p: Pt): number           // clamp 0.5–40
export function heightFromPointer(p: Pt): number          // clamp 0.05–5
export function lengthFromPointer(p: Pt): number          // clamp 0.2–20
export function nudgeReflect(which: 'theta' | 'height' | 'length', value: number, key: string, shift: boolean): number | null
```

**Rules:**
- **Bounds:** x0 = −0.3·H, x1 = `channelEndX`, y1 = 1.15·H.
- **Walls:** the lower wall runs (x0, 0) → (0, 0) → (x1, x1·tan θ). The upper wall runs (0, H) → (x1, H).
- **Region polygons:**
  - **Region 1:** (x0, 0), (0, 0), the first impingement or exit point, [the cowl end if it exits], (0, H), (x0, H).
  - **Middle regions:** triangles P₍ₖ₋₁₎, Pₖ, P₍ₖ₊₁₎, or P₍ₖ₋₁₎, Pₖ, E, end(wall of P₍ₖ₋₁₎) at an exit.
  - **The last region** closes through the channel-end corners.
- **Labels** are at polygon vertex centroids.
- **Shock labels** read `${β−θ}° to ramp` or `to cowl` (1 decimal).
- **The stop marker:** "Mach reflection (not modeled)" at the point; "bow shock" at (0, 0) for `leadingEdge`; "subsonic" for `subsonic`; null otherwise.

- [ ] **Tests, written first:**
  - the default case: 5 regions; each polygon has ≥ 3 vertices; and the vertices lie within the bounds;
  - a walls-meet case: x1 = `meetX`;
  - a leading-edge case: 1 region and a "bow shock" stop;
  - the label text, e.g. "29.3° to cowl";
  - the pointer and nudge maths, including clamps.
- [ ] Implement it, test it, and commit `feat(inlet): reflecting-shock geometry and handle maths`.

### Task 4: Text, URL and hooks

**Files:** `reflect/text.ts`, `reflect/useReflect.ts`, `useInletMode.ts`; tests for each.

**Interfaces:**
- `ReflectField = 'gamma' | 'm1' | 'theta' | 'height' | 'length'`.
- `solveReflectText({ gamma, m1, theta, height, length }): FieldResult<ReflectSolution, ReflectField>`. Messages: "θ must be greater than 0 and at most 40°", "H must be greater than 0 and at most 5", "L must be greater than 0 and at most 20".
- `useReflect()` exposes `{ gamma, m1Text, thetaText, heightText, lengthText, solution, error, property, selected, setters…, setTheta(n), setHeight(n), setLength(n), select }`. It reuses `in.prop`, keeps its own selection in `rf.sel`, and writes drag values with `toQueryNumber(x, 4)`.
- `useInletMode(): ['ramps' | 'reflect', (m) => void]` reads and writes `in.mode`.

- [ ] **Tests:**
  - validation messages and fields;
  - defaults;
  - URL writes;
  - Review Focus 1: setting `rf.m=abc` and then switching the mode leaves the `rf.m` text in place, and the ramp mode's inputs untouched.
- [ ] Implement it, test it, and commit `feat(inlet): reflect-mode inputs, URL state and mode key`.

### Task 5: Mode switch and the reflect UI

**Files:**
- `InletCalculator.tsx` becomes the mode switch: a radiogroup "Inlet mode" above the layout with the one-sentence explanation, rendering `RampsMode` or `ReflectMode`.
- `ramps/RampsMode.tsx` is the current calculator body, moved.
- `reflect/ReflectMode.tsx`, `reflect/ReflectEditor.tsx` (M₁, γ, θ with a slider, H, L), `reflect/ReflectField.tsx` (`InletField` plus 3 handles, with the scale frozen during a drag), and `reflect/ReflectNotices.tsx` (Mach reflection with the full verbatim text; leading-edge bow shock; channel end; walls meet).
- Both modes show the verbatim note.

- [ ] **Tests:**
  - the mode switch writes `in.mode` and keeps each mode's inputs;
  - reflect defaults show 5 table rows, with region 5's p₀/p₀₁ = 0.91253 (5 sig. fig.);
  - the Mach-reflection notice text appears;
  - the θ handle's ArrowUp writes `rf.t=10.5`;
  - the leading-edge case shows the bow-shock notice;
  - the shock detail works in reflect mode.
- [ ] Implement it, screenshot both modes at 1280 and 375 px in light and dark, and fix what the screenshots show. Commit `feat(inlet): mode switch and reflecting-shocks view`.

### Task 6: verify:ui

- [ ] **Extend `scripts/verify-ui.ts`:**
  - **Layout sweep:** add `/?calc=inlet&in.mode=reflect` at both widths and in both themes.
  - **Behaviour:**
    - switching modes keeps inputs, and reloading restores the mode and the inputs;
    - the reflect default shows the Mach-reflection notice and 0.91253;
    - a mouse drag of the H handle changes `rf.h`;
    - Tab reaches the three reflect handles;
    - a walls-meet URL shows its stop notice.
- [ ] Commit `test(ui): verify both inlet modes`.

### Task 7: Review, notes, PR

- [ ] Run code review (high) on `main...HEAD`, scoped to the new commits; fix Critical and Important findings test-first, and record the minors.
- [ ] Update NOTES.md, push, and update PR #2's title and description with gh. Don't merge.
