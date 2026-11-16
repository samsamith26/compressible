# Multi-Ramp Inlet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fourth tab, a multi-ramp supersonic inlet calculator. It chains 1–4 weak oblique shocks and compares the result with a single shock through the same total angle.

**Architecture:**
- **Pure model** in `src/features/inlet/`: `model.ts` holds the chain, text parsing and the comparison case; `geometry.ts` holds corners, shocks, conflicts and region polygons. Both are fully unit-tested.
- **Hook:** `useInlet` mirrors the inputs to the URL with `in.*` keys and shares γ under `g`.
- **Components:** small ones for the flow field, region table, recovery chart and shock detail. The detail view reuses `WedgeDiagram`, `JumpChart` and `ThetaBetaChart` unchanged.
- **Physics:** no changes to `src/physics`.

**Tech Stack:** React 19, TypeScript 7 strict, Tailwind v4, d3-scale/d3-shape, Vitest with jsdom and Testing Library, and Playwright (`verify:ui`).

**Spec:** `docs/superpowers/specs/2026-11-13-multi-ramp-inlet-design.md`

## Global Constraints

- Strict TypeScript: no `any`, no `as` (oxlint). Logic lives in `model.ts`, `geometry.ts` and hooks; components stay small.
- Import physics only from `@/physics`. Every region value comes from `solveOblique(..., { kind: 'thetaWeak', value: θ }, γ)`.
- **URL keys:**
  - `in.m` (default `3`), `in.t` (default `8,8,8`), `in.l` (default `1,0.6,0.4`);
  - `in.prop` (`M` | `p` | `T` | `p0`, default `p0`), `in.cmp` (`1` | `0`, default `1`), `in.sel` (1-based, default `1`);
  - shared `g`.
- **Ramps:** 1–4. A new ramp is θ 8°, length = previous × 0.7, rounded to 3 significant figures.
- **Visual direction:** match the existing one (IBM Plex, the `--up` and `--down` tokens, `Panel`, `graph-paper`, the `num` class for numbers). Validate the new sequential shading ramp with the dataviz script in both themes.
- **Checks:** `npm run lint`, `typecheck`, `test`, `build` and `verify:ui` pass after every task. Commit per task, ending messages with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Malformed list params in a shared URL** (`in.t=8,,x`, five entries, `in.l=0`). Expected: no crash; per-ramp field errors, or the defaults if the list shape is invalid. Test: `parseList` and `solveInletText` in Task 3.
2. **Removing the ramp whose shock is selected.** Expected: the selection clamps to the last existing shock. Test: `clampSelection` in Task 3.
3. **A chain that stays attached while the single comparison detaches** (M₁ = 3, four 10° ramps: 40° > θmax ≈ 34.07°). Expected: the comparison says it's detached and shows no recovery. Test: `compareSingle` in Task 1.
4. **Extreme lengths or angles** (length 10 on ramp 3, θ = 0). Expected: finite geometry and a flagged conflict, never NaN. Tests: the geometry tests in Task 2.
5. **Detachment mid-chain.** Expected: regions stop at the detached ramp, the recovery chart stops there too, and the notice names the ramp, θ and θmax. Tests: `solveChain` (Task 1) and `InletCalculator` (Task 5).

---

### Task 1: Chain model

**Files:** create `src/features/inlet/model.ts`; test `src/features/inlet/__tests__/model.test.ts`.

**Interfaces (produces):**
```ts
export interface Ramp { readonly thetaDeg: number; readonly length: number }
export interface Region {
  readonly index: number              // 1-based; region 1 is the freestream
  readonly mach: number
  readonly betaDeg: number | null     // β of the shock that created it (null for region 1)
  readonly thetaLocalDeg: number      // that ramp's turn (0 for region 1)
  readonly thetaCumDeg: number        // wall angle under the region
  readonly pP1: number; readonly rhoRho1: number; readonly tT1: number; readonly p0P01: number
}
export type ShockLink =
  | { readonly kind: 'attached'; readonly index: number; readonly upstreamMach: number; readonly thetaDeg: number; readonly state: ObliqueShockState; readonly max: MaxDeflection }
  | { readonly kind: 'detached'; readonly index: number; readonly upstreamMach: number; readonly thetaDeg: number; readonly max: MaxDeflection }
export interface Chain { readonly regions: readonly Region[]; readonly shocks: readonly ShockLink[]; readonly detachedAt: number | null }
export const MAX_RAMPS = 4
export const DEFAULT_RAMPS: readonly Ramp[]   // [{8,1},{8,0.6},{8,0.4}]
export function solveChain(m1: number, ramps: readonly Ramp[], gamma: number): Result<Chain>
export function totalTurn(ramps: readonly Ramp[]): number
export function compareSingle(m1: number, ramps: readonly Ramp[], gamma: number): Result<ObliqueSolution>
```

- [ ] **Tests:**
  - **Every region matches a standalone shock.** For the default ramps and for `[{5,1},{12,1}]` at M₁ = 2.5, γ = 1.3: for each attached shock i, `solveOblique(regions[i].mach, θᵢ, γ)` equals `shocks[i].state`. `regions[i+1].mach` equals that M₂, and each cumulative ratio equals the running product, to 1e-12.
  - **Default case:**
    - region Mach numbers ≈ 3, 2.6031, 2.2595, 1.9529;
    - `regions[3].p0P01` ≈ 0.95595 (1e-5) and `pP1` ≈ 4.828;
    - `thetaCumDeg` = 0, 8, 16, 24;
    - `compareSingle` p₀₂/p₀₁ ≈ 0.70341;
    - the chain's recovery exceeds the single shock's by > 0.2.
  - **Detachment mid-chain:** M₁ = 2, ramps `[{15,1},{15,1},{15,1}]`. Shock 2 meets M ≈ 1.45, where θmax ≈ 11°, so `detachedAt === 2`, there are 2 regions, `shocks[1].kind === 'detached'`, and there is no shock 3.
  - **Comparison detaches:** M₁ = 3 with four 10° ramps gives a chain with 5 regions, and `compareSingle` returns `kind: 'detached'`.
  - **Errors pass through:** `solveChain(0.8, …)` is a `Result` error, and so is an empty ramp list ("Add at least one ramp"). `θ = 0` is fine (β = μ, ratios 1).
- [ ] Implement it, run `npm test`, and commit `feat(inlet): chain weak oblique shocks across 1–4 ramps`.

### Task 2: Geometry, conflicts and region polygons

**Files:** create `src/features/inlet/geometry.ts`; test `src/features/inlet/__tests__/geometry.test.ts`.

**Interfaces:**
- Consumes `Chain` and `Ramp` (Task 1).
- Produces (coordinates are math-style, y up; components flip to SVG):
```ts
export interface Pt { readonly x: number; readonly y: number }
export interface ShockLine { readonly index: number; readonly from: Pt; readonly angleDeg: number; readonly to: Pt }
export interface Conflict { readonly kind: 'shocks' | 'wall'; readonly between: readonly [number, number]; readonly at: Pt }
export interface InletGeometry {
  readonly corners: readonly Pt[]                    // c0 = (0,0) … cN
  readonly shocks: readonly ShockLine[]              // attached shocks only; `to` = exit on the top or right edge
  readonly bounds: { readonly x0: number; readonly x1: number; readonly y1: number }
  readonly conflict: Conflict | null                 // first (smallest x) with x < x1
  readonly regions: readonly { readonly index: number; readonly polygon: readonly Pt[]; readonly label: Pt }[]
  readonly detachedCorner: Pt | null
}
export function inletGeometry(chain: Chain, ramps: readonly Ramp[]): InletGeometry
export function rayIntersection(a: Pt, angA: number, b: Pt, angB: number): Pt | null // forward rays only
```

**Rules:**
- **Corners:** ramp i runs from c₍ᵢ₋₁₎ along `thetaCumDeg` after ramp i, for its length.
- **Shocks:** shock i starts at c₍ᵢ₋₁₎ with absolute angle = (cumulative angle before ramp i) + βᵢ.
- **Bounds:**
  - `x1` = cN.x;
  - `x0` = −0.3 × ramp 1's length;
  - `y1` = max(shock 1's y at x1, 1.4 × the largest corner y, 0.35 × x1).
- **Regions:**
  - **Region 1:** the polygon (x0,0), c0, shock 1's exit, the walk along the boundary, then (x0,y1).
  - **Region k+1:** c₍ₖ₋₁₎, shock k's exit, the walk along the boundary, shock k+1's exit, then cₖ.
  - **Last drawn region:** its upstream shock's exit, the walk to (x1, cN.y), then the walls back to its corner.
  - **The boundary walk** goes from the right edge up to the top-right corner and then left along the top, inserting (x1, y1) when the two exits are on different edges.
  - **Labels** sit at the centroid of {c₍ₖ₋₁₎, cₖ, the point on shock k at distance |cₖ − c₍ₖ₋₁₎| from c₍ₖ₋₁₎}. Region 1's label is at (x0/2, 0.25·y1).
- **Conflicts:**
  - consecutive shocks crossing at x < x1;
  - shock i's ray crossing any wall segment j > i at x < x1.

  Take the one with the smallest x.
- **Detached:**
  - Draw no shock for ramp k, and stop the regions at region k, whose polygon closes along the walls to cN.
  - `detachedCorner` = c₍ₖ₋₁₎.

- [ ] **Tests:**
  - **Default:**
    - corners c3 ≈ (1.932, 0.467);
    - shock angles ≈ 25.61, 36.94, 48.97;
    - `conflict === null` (crossings at x ≈ 2.22 and 2.24 are past x1 ≈ 1.93);
    - 4 regions, each polygon with ≥ 3 points, and every coordinate finite.
  - **Lengths `1,1,1`:** conflict `{ kind: 'shocks', between: [1, 2] }` with `at.x` ≈ 2.22.
  - **`[{5,1},{5,1},{25,3}]` at M₁ = 3** gives a conflict, either a wall crossing or a shock crossing (assert non-null, x < x1).
  - **`rayIntersection`:** parallel rays give null; intersections behind either origin give null.
  - **Detached chain (Task 1 case):** `shocks.length === 1`, `detachedCorner` = c1, and 2 regions.
  - **Review Focus 4:** θ = 0 and length 10 give finite numbers throughout.
- [ ] Implement it, test it, and commit `feat(inlet): ramp geometry, shock lines, conflicts and region polygons`.

### Task 3: Text inputs, URL state and the hook

**Files:** modify `src/features/inlet/model.ts`; create `src/features/inlet/useInlet.ts`; tests `__tests__/text.test.ts` and `__tests__/useInlet.test.tsx`.

**Interfaces:**
```ts
// model.ts
export type InletField = 'gamma' | 'm1' | `theta${number}` | `length${number}`
export interface InletText { readonly gamma: string; readonly m1: string; readonly thetas: readonly string[]; readonly lengths: readonly string[] }
export interface InletSolution { readonly m1: number; readonly ramps: readonly Ramp[]; readonly chain: Chain; readonly single: ObliqueSolution }
export function parseList(text: string | null, fallback: readonly string[]): string[]  // 1–4 entries, else fallback
export function solveInletText(t: InletText): FieldResult<InletSolution, InletField>
export function addRampTexts(thetas, lengths): { thetas: string[]; lengths: string[] }   // no-op at 4
export function removeRampTexts(thetas, lengths, index0: number): { thetas: string[]; lengths: string[] } // no-op at 1
export function clampSelection(sel: number, shockCount: number): number
export type ShadeProperty = 'M' | 'p' | 'T' | 'p0'
// useInlet.ts
export interface Inlet { gamma; m1Text; thetaTexts; lengthTexts; solution: InletSolution /* last valid */; error: FieldError<InletField> | null;
  property: ShadeProperty; compare: boolean; selected: number;
  setM1Text(t); setThetaText(i0, t); setLengthText(i0, t); addRamp(); removeRamp(i0);
  setCorner(i0, thetaDeg, length); setThetaFromBeta(i0, betaDeg); setProperty(p); setCompare(b); select(n) }
export function useInlet(): Inlet
```

**Rules:**
- Errors are attributed to the field that caused them:
  - lengths must be > 0 ("Ramp 2 length must be greater than 0");
  - a physics error for ramp i is prefixed "Ramp i: ";
  - M₁ errors go to `m1`, and γ errors to `gamma`.
- Values written by drags use `toQueryNumber(x, 4)`.
- `setThetaFromBeta` sets θ = `thetaFromBetaDeg(upstream M, β, γ)`, clamped to the range [0, θmax].
- The selection is clamped on every read.

- [ ] **Tests:**
  - **`parseList`:** `'8,8,8'` gives 3 entries; `null` gives the fallback; `'1,2,3,4,5'` gives the fallback; `'8,,x'` gives `['8','','x']`, so the field errors show.
  - **`solveInletText`:** `thetas ['8','x']` gives field `theta2`; `lengths ['1','0']` gives `length2`; and `m1 '0.5'` gives `m1`.
  - **Add and remove:** adding to `8,8,8` / `1,0.6,0.4` gives 4 ramps, the last being `8` and `0.28`; adding again is a no-op; removing at index 1 leaves 2 ramps.
  - **`clampSelection(4, 2)`** is 2; `clampSelection(0, 3)` is 1.
  - **Hook:** with `?calc=inlet&in.m=2.5` it reads M₁ = 2.5; `setThetaText(1,'10')` writes `in.t=8,10,8`; `removeRamp` writes both lists; and the last valid solution survives `in.m=abc`.
- [ ] Implement it, test it, and commit `feat(inlet): text inputs, URL state and useInlet hook`.

### Task 4: The tab, inputs and region table

**Files:**
- Modify: `src/hooks/useCalculatorTab.ts` (add `{ id: 'inlet', title: 'Multi-ramp inlet', short: 'Inlet' }`), `src/App.tsx` (VIEWS).
- Create: `src/features/inlet/{InletCalculator,RampEditor,RegionTable}.tsx`.
- Test: `__tests__/InletCalculator.test.tsx`.

**Interfaces:**
- **`RampEditor`:** for each ramp, a θ `NumberField` with the unit °, a length `NumberField`, a native range slider for θ (0–30°, step 0.5, labelled "Ramp i angle"), and a remove button ("Remove ramp i", disabled when there is 1 ramp). Below them, an "Add ramp" button, disabled at 4.
- **`RegionTable`:** columns Region, M, β (°), θ (°), wall (°), p/p₁, ρ/ρ₁, T/T₁ and p₀/p₀₁. Values use `formatValue` with the `num` class, and "—" for null. The selected shock's downstream row is highlighted.
- **Layout:** `CalculatorLayout` with `inputs` holding M₁, γ, the `RampEditor` and the shading select, plus an intro that explains the tab.

- [ ] **Tests:**
  - the tab appears;
  - the table has 4 rows by default, with region 4's p₀/p₀₁ = "0.95595";
  - typing θ₂ = 10 updates the rows live;
  - "Add ramp" gives 5 rows;
  - θ₁ = 40 at M₁ = 2 shows the "Shock 1 is detached" status, with θmax, and 1 row.
- [ ] Implement it, check lint, typecheck, tests and build, and commit `feat(inlet): fourth tab with ramp editor and region table`.

### Task 5: The flow-field diagram

**Files:** create `src/features/inlet/{FlowField,ShadeLegend}.tsx` and `src/features/inlet/shade.ts`; tests `__tests__/shade.test.ts` and an extension of `InletCalculator.test.tsx`.

**Interfaces:**
- **`shade.ts`:**
  - `SHADE_STOPS: { light: [string, string]; dark: [string, string] }` gives one hue each. Validate it with `validate_palette.js --ordinal`.
  - `shadeValue(region: Region, p: ShadeProperty): number`
  - `shadeScale(values: number[], theme): (v: number) => string`, a `scaleLinear<string>` over [min, max]. Equal values map to the middle colour.
  - `labelInk(fill: string): 'var(--ink)' | 'var(--paper)'` picks the higher-contrast option, using `lib/contrast.ts`.
- **`FlowField`** props: `{ geometry, chain, property, selected, onSelect(n), onCorner(i0, θ, len), interactive?: boolean, label: string }`.
  - **Regions** are `<path>`s with `role="button"`, `tabIndex=0`, `aria-pressed` for the pinned one, and `aria-label` "Region k: M …, p/p₁ …, ρ/ρ₁ …, T/T₁ …, p₀/p₀₁ …". Hover or focus shows the tooltip, and click or Enter/Space pins it.
  - **Shocks** are lines in `--down`, drawn thicker when selected, and clickable to select.
  - **Corners c1…cN** are handles with `role="slider"`: `aria-valuenow` is the θ of the ramp ending there, with `aria-valuetext` "Ramp i: 8°, length 1". Dragging sets θ and length from the pointer's polar position relative to c₍ᵢ₋₁₎ (θ = angle − the cumulative angle before ramp i). Arrow keys follow the spec: Up/Down change θ by ±0.5° (Shift: 2°), and Left/Right change length by ±0.05 (Shift: 0.2).
  - **A conflict** clips everything at x ≥ `conflict.at.x`, hatches that area, puts a marker at `at`, and shows the notice "Shocks 1 and 2 cross here; the simple model doesn't apply beyond this point".
- **`ShadeLegend`** draws a gradient bar with min and max values and the property label.

- [ ] **Tests:**
  - shading is monotonic, and equal values map to the midpoint;
  - `labelInk` picks paper on the dark end;
  - the default renders 4 region buttons;
  - focusing region 2 shows a tooltip containing "M 2.6031";
  - Enter pins it (`aria-pressed="true"`);
  - an ArrowUp on the corner 1 slider changes θ₁ to 8.5 (check the URL);
  - with `in.l=1,1,1` the conflict notice appears.
- [ ] Implement it. Show the comparison flow field read-only (`interactive={false}`, one ramp at the total θ and total length) when `compare` is on. Commit `feat(inlet): shaded flow-field diagram with hover, pin and draggable corners`.

### Task 6: Recovery chart and comparison

**Files:** create `src/features/inlet/{RecoveryChart,CompareSummary}.tsx` and `src/features/inlet/recovery.ts`; tests `__tests__/recovery.test.ts` and an extension of the calculator test.

**Interfaces:**
- `recoverySteps(chain): { station: number; p0P01: number }[]` gives stations 0…k (0 is the freestream at 1), stopping at a detachment.
- `singleSteps(single: ObliqueSolution): … | null` gives null when detached.
- **`RecoveryChart`:**
  - a step line for the ramps in `--up`, and a step for the single shock in `--down` when `compare` is on;
  - direct labels at the ends ("3 ramps 0.956", "single 24° 0.703"), plus a legend;
  - the y-axis runs from max(0, min − 0.05) to 1;
  - a crosshair or tooltip per station.
- **`CompareSummary`:** final M, p/p₁ and p₀/p₀₁ for both cases, with the p₀ difference called out ("+0.253 recovered", from 0.95595 − 0.70341). A detached comparison says "A single 40° turn detaches at M₁ = 3 (θmax 34.07°)".

- [ ] **Tests:**
  - the default's steps are [1, 0.97993, 0.96596, 0.95595];
  - the single case's steps are [1, 0.70341];
  - toggling compare off hides the single series;
  - the four-by-10° case shows the detached message.
- [ ] Implement it, test it, and commit `feat(inlet): stepped p0 recovery chart with single-shock comparison`.

### Task 7: Shock detail through the existing oblique views

**Files:** create `src/features/inlet/ShockDetail.tsx`; extend the tests.

**Interfaces:**
- A segmented control, "Shock 1 … N" (`role="radiogroup"`), changes `in.sel`.
- For the selected attached shock:
  - `WedgeDiagram thetaDeg={θᵢ} betaDeg={βᵢ} m1={upstreamMach}`;
  - `JumpChart` with p, ρ, T, p₀ and M ratios, built as in `ObliqueCalculator`;
  - `ThetaBetaChart m1={upstreamMach} max point onBeta={(b) => setThetaFromBeta(i0, b)} drag`.

  For a detached shock: `betaDeg={null}`, `detachedThetaDeg={θᵢ}`.

- [ ] **Tests:**
  - selecting shock 2 shows "M₁ 2.603" in the detail heading;
  - an ArrowUp on the θ-β-M point changes `in.t`'s second entry.
- [ ] Implement it, test it, and commit `feat(inlet): shock detail reusing the wedge, jump and θ-β-M views`.

### Task 8: verify:ui, review, notes and PR

- [ ] **Extend `scripts/verify-ui.ts`:**
  - add `inlet` to `CALCS`, which covers layout, theme and console checks at both widths and in both themes;
  - **behaviour:**
    - the default's region-4 p₀/p₀₁ is 0.95595, and the single case is 0.70341;
    - "Add ramp" gives 4 ramps in the URL;
    - a mouse drag of corner 2 changes `in.t`;
    - hovering a region shows a tooltip;
    - Tab reaches the region buttons;
    - `in.l=1,1,1` shows the conflict notice;
    - `in.m=2&in.t=15,15,15` shows "Shock 2 is detached";
    - at 375 px, no horizontal scroll.
- [ ] Run lint, typecheck, test, build and `verify:ui`, review the screenshots, and fix what they show.
- [ ] Run the code-review plugin. Fix Critical and Important findings test-first, and record the minor ones.
- [ ] Update NOTES.md (what's built, URL keys, decisions, open issues).
- [ ] Commit, push `feat/multi-ramp-inlet`, and run `gh pr create` into `main`. Don't merge; wait for the user's review.
