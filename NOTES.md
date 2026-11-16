# Project notes

Status as of 2026-11-16. Read this before starting work; update it when the status changes.

## What's built

**Phase 1, physics module (complete).** On `main`.

| File | Contents |
|---|---|
| `src/physics/result.ts` | `Result<T>`, `ok`, `err`, error codes |
| `src/physics/gas.ts` | γ and range guards, `MACH_MIN`/`MACH_MAX`, `outOfRange` |
| `src/physics/numeric.ts` | Brent root finder `findRoot`, deg/rad |
| `src/physics/isentropic.ts` | forward state from M; inverses from T/T0, p/p0, ρ/ρ0, A/A* (sub/sup), Mach angle, ν; raw `machAngleDeg` |
| `src/physics/normalShock.ts` | forward from M1; inverses from M2, p2/p1, ρ2/ρ1, T2/T1, p02/p01, p1/p02 |
| `src/physics/obliqueShock.ts` | θ-β-M relation, θmax, weak/strong from θ, from β, from M1n, detachment |
| `src/physics/solvers.ts` | `solveIsentropic`, `solveNormalShock`, `solveOblique` dispatchers |
| `src/physics/index.ts` | public API |
| `scripts/record-vt-fixtures.ts` | Playwright recorder for VT reference values |

**Phase 1, UI (complete; the chosen UI).** Built on `claude/great-bell-lrkq1u` and merged into `main`
together with the physics. Plan: `docs/superpowers/plans/2026-11-12-ui.md`.

**`ui-local` is reference only.** It is an alternative UI built locally with the frontend-design and
dataviz skills (the "colour schlieren" direction, porthole flow views, weak and strong solutions side by
side). It was not merged and is kept on the remote for reference; nothing on `main` depends on it. Its
own `NOTES.md` and `docs/superpowers/plans/2026-11-13-ui-local.md` describe it. Only its Windows build
fix (commit 1b54870, below) was ported to this UI.

| Path | Contents |
|---|---|
| `src/index.css` | design tokens (light/dark), graph-paper, glide transitions, reduced motion |
| `src/lib/` | number parsing/formatting, URL query + store, theme, contrast check, ticks, label spreading |
| `src/hooks/` | `useSearchParams` (URL as store), `useTheme`, `useGamma` (shared γ), `useLastOk`, `usePointerDrag`, `useElementWidth`, `useNudgeKeys`, `useCalculatorTab` |
| `src/components/` | shadcn-style `ui/button`, `ui/tabs`; `NumberField`, `KindSelect`, `Readout`, `Panel`, `CalculatorLayout`, `GammaField`; layout (header wordmark, theme toggle, footer credit); charts (`Axis`, `JumpChart`) |
| `src/features/isentropic/` | `model.ts`, `useIsentropicSolver`, `RatioChart` (log ratios vs M, draggable/keyboard marker) |
| `src/features/normal-shock/` | `model.ts`, `useNormalShockSolver`, `ShockTube` (particle spacing ∝ 1/ρ) |
| `src/features/oblique-shock/` | `model.ts`, `useObliqueSolver`, `WedgeDiagram` (attached/detached), `ThetaBetaChart` (draggable point), `thetaBeta.ts`, `wedgeGeometry.ts` |
| `src/features/inlet/` | the Inlet tab (below): `shared/` (both modes), `ramps/` (ramp series), `reflect/` (reflecting shocks), `InletCalculator` (mode switch) |
| `scripts/verify-ui.ts` | `npm run verify:ui`: Playwright checks at 1280/375px, light/dark, behaviour |

**Inlet (fourth tab; branch `feat/multi-ramp-inlet`, PR #2 open, not merged).**

The tab has two modes, chosen with a segmented control. Each mode keeps its own inputs, and the mode is mirrored to the URL. Both modes share the drawing component (`shared/InletField`), the shading select and legend, the region table, the p₀ recovery chart and the shock detail.

*Ramp series* (external compression):
- **Spec and plan:** spec `docs/superpowers/specs/2026-11-13-multi-ramp-inlet-design.md`, plan `docs/superpowers/plans/2026-11-13-multi-ramp-inlet.md`.
- **Inputs:** M₁, γ and 1–4 ramps, each with an angle and a length. The angle can be typed, slid or set by dragging the ramp's corner; the length can be typed or set by dragging.
- **Model (pure, test-first):**
  - `model.ts` chains weak oblique shocks through `solveOblique`. Each region is checked against a standalone call.
  - The chain stops at a **detached** ramp, or a **subsonic** one: a shock just under θmax can leave M < 1.
  - `geometry.ts` places corners and shocks at their true angles, builds the region polygons, and flags the first **conflict** inside the drawing (consecutive shocks crossing, or a shock meeting a later ramp).
- **Views:**
  - **Flow field:** shaded by M, p/p₁, T/T₁ or p₀/p₀₁ on one validated sequential hue. Regions are focusable buttons whose tooltip pins on click or Enter. Corners are sliders, and everything past a conflict is hatched "not modelled".
  - **Regions:** a table with one row per region.
  - **Recovery:** a stepped p₀ chart against the single-shock case, with a final-state comparison.
  - **Shock detail:** reuses `WedgeDiagram`, `JumpChart` and `ThetaBetaChart`. Dragging the θ-β-M point edits that ramp.
- **Default:** M₁ = 3 with three 8° ramps of lengths 1, 0.6 and 0.4 recovers p₀/p₀₁ = 0.95595, against 0.70341 for one 24° shock.

*Reflecting shocks* (internal compression):
- **Spec and plan:** spec `docs/superpowers/specs/2026-11-14-inlet-reflecting-shocks-design.md`, plan `docs/superpowers/plans/2026-11-14-inlet-reflecting-shocks.md`.
- **Geometry and inputs:** a ramp at θ from the leading edge and a flat cowl at height H, over a channel of length L. Inputs are M₁, γ, θ, H and L.
- **Handles:** the ramp angle, the cowl height (its leading edge) and the channel end. Each works by drag or by arrow keys, and the scale freezes while dragging.
- **Model (pure, test-first):**
  - `reflect/model.ts` bounces a weak oblique shock between the walls. Each reflection turns the flow by θ back parallel to the wall it leaves.
  - Shocks leaving the ramp are drawn at β above horizontal; shocks leaving the cowl at β − θ below. Each is labelled with its angle to its wall.
  - **Stops:** the next shock would leave the channel; the walls close in (channel narrower than 1% of H); regular reflection is impossible (a Mach reflection, marked but not modelled); a bow shock at the leading edge; subsonic flow; or the 100-reflection display cap.
- **Reference cases:**
  - M₁ = 2.8, θ = 16°: β₁ = 34.92°, M₂ = 2.059; the reflected shock is 29.33° to the cowl, with M₃ = 1.458 and p/p₁ = 6.607; the next reflection fails at θmax = 11.00°.
  - Default M₁ = 3, θ = 10°, H = 1, L = 5: four shocks, M = 1.373, p/p₁ = 10.945, p₀/p₀₁ = 0.9125; the fifth fails at θmax = 8.67°.

URL keys:
- `calc` (isentropic/normal/oblique/inlet), and `g` (γ, shared).
- `iso.k`/`iso.v`, `ns.k`/`ns.v`, `ob.m`/`ob.k`/`ob.v`.
- Inlet mode: `in.mode` (`ramps`/`reflect`).
- Ramp series: `in.m`, `in.t` (angles, comma list), `in.l` (lengths), `in.prop` (`M`/`p`/`T`/`p0`), `in.cmp` (`1`/`0`), `in.sel`.
- Reflecting shocks: `rf.m`, `rf.t`, `rf.h`, `rf.l`, `rf.prop`, `rf.sel`.

Field text is stored as typed, so invalid input round-trips with its error. (In ramp lists, a typed decimal comma is stored as a point.)

**Tests:** 757 (Vitest), with 100% coverage on `src/physics`, which is unchanged by the inlet. `npm run verify:ui` passes. It sweeps both inlet modes at 1280 and 375 px in light and dark, runs 12 ramp-series checks and 14 reflect and mode-switching checks (including reload), and checks that every calculator tab is on screen.
In the cloud container run it as `CHROMIUM_PATH=/opt/pw-browsers/chromium npm run verify:ui`.

## Decisions

### Made with the user
- Stack: Vite + React + TypeScript + Tailwind + shadcn/ui.
- Physics module first, with no UI until all physics tests pass. Architecture designed so Phase 2 (nozzle) reuses `src/physics`.
- The approved design is in `docs/superpowers/specs/2026-11-12-compressible-flow-design.md`, and the physics plan in `docs/superpowers/plans/2026-11-12-physics-module.md`. The plan was executed inline in one session, with one review at the end.
- GitHub remote: https://github.com/samsamith26/compressible.

### Made by Claude (open to change)
- **Error handling:** solvers return `Result` values instead of throwing; detachment is a result, not an error.
- **Angle units:** degrees at the public API.
- **Charts:** custom SVG with d3-scale/d3-shape rather than a chart library.
- **URL state:** calculator state mirrored to the URL.
- **Linting:** oxlint instead of ESLint. The current Vite template ships oxlint and TypeScript 7, and typescript-eslint support for TS 7 is uncertain. All three required rules were verified by planting violations.
- **Every npm script that runs Vite or Vitest goes through `scripts/upper-cwd.mjs`** (`dev`, `build`, `preview`, `test`, `test:watch`). A lowercase `c:` working directory, which is VS Code's default here, makes Vitest load twice and makes Vite bundle React twice ("Invalid hook call"). Ported from `ui-local` (commit 1b54870); it replaces the old `scripts/vitest.mjs`.
- **Mach domain capped at [1e-12, 1e6].** Each input range is exactly what that domain produces. Mach numbers above 1e6 are rejected, because M² overflows past ~1e154.
- **Floating-point margins:**
  - The wave-angle lower bound is μ·(1 − 1e-12), so β typed as exactly μ (e.g. 30° at M1 = 2) is accepted.
  - θ within 1e-12° of θmax counts as θmax (weak = strong = β_max).
- **Coverage ignore:** one `/* v8 ignore */` on the root-failure return in `obliqueFromTheta`. That bracket is valid by construction.
- **VT fixture tolerance:** max(2 × last displayed digit, 1e-5 relative). In 17 cases VT's own inverse stops short (e.g. it echoes p02/p01 = 0.92199659 for an input of 0.922). There, the test compares our forward relations at VT's answer, and our inverse to the input to 1e-9.
- **Branch workflow:** the physics was built on `feat/physics-module` and the UI on `claude/great-bell-lrkq1u` (stacked on it). Both were merged into `main` through one PR, after which both remote branches were deleted.

### Made by Claude in the UI phase (open to change, please review)
- **Visual direction ("wind-tunnel instrument")** chosen without the frontend-design skill, which wasn't available in the cloud session. IBM Plex Sans + Plex Mono, warm paper / graphite grounds, blue = state 1 / upstream, amber = state 2 / downstream, graph-paper chart grounds. Details and rationale in the UI plan. Screenshots: run `npm run verify:ui`, then see `verification/`.
- **shadcn/ui primitives were written by hand** (button, tabs) on `radix-ui` + `cva` + `tailwind-merge`, because the cloud network blocks `ui.shadcn.com`. Running `npx shadcn init` locally later is compatible; it would overwrite `src/components/ui/*`.
- **Inputs:** native `<select>` for "known quantity" (best keyboard/mobile behaviour) and text inputs with `inputMode="decimal"` (accepts "1e-3", decimal comma, Unicode minus; ArrowUp/Down nudge). Not `<input type="number">`, which mangles half-typed values.
- **γ is shared** across the three calculators (one `g` key).
- **Switching input kind converts the value** (M = 2 → p/p0 = 0.127805), so the flow state doesn't jump.
- **Invalid input** shows its message under the field that caused it (γ, M1 or the value) and dims the last valid results instead of clearing them. Detachment is an amber notice, not an error.
- **Chart drags write the input in the person's chosen kind** (dragging in A/A* mode keeps A/A*, flipping the sub/sup branch as needed; θ inputs flip weak/strong by side of β at θmax), using the shortest text that still solves within tolerance.
- **The detached bow shock drawing is schematic** (hyperbola with Mach-angle asymptotes and a heuristic standoff), and is labelled as such.
- **`machAngleDeg` is now exported** from `src/physics` (closes the asin(1/M) cleanup from open issue 4).
- **Vitest processes `index.css`** (`test.css.include`) so the contrast test can read the real tokens with `?raw`.

### Inlet: ramp series
- **Made with the user:** ramp lengths are editable per ramp (option B). The chain lives in the feature's `model.ts`, reusing the oblique components.
- **Made by Claude (open to change):**
  - **Lengths** are dimensionless, defaulting to 1, 0.6 and 0.4 so the default opens without a shock crossing.
  - **Drawn area:** from the leading edge to the end of the last ramp.
  - **Conflicts:** only the first one is flagged, and the drawing is clipped beyond it.
  - **Corner keys:** ±0.5° and ±0.05 per arrow press, with Shift for 2° and 0.2.
  - **Comparison:** shown by default, as a read-only single ramp on the same shading scale.
  - **Empty lists:** an empty `in.t` means one cleared ramp, not the defaults.
  - **Tabs on mobile:** they use 12 px text below `sm` so all four fit at 375 px.

### Inlet: reflecting shocks
- **Made with the user:** the geometry, the stop conditions, the reference cases, and the two-mode tab with its shared views (from the request).
- **Made by Claude (open to change):**
  - **"Walls meet"** means the channel is narrower than 1% of H at the next reflection. Reflected shocks always land before the apex, so a literal meeting never happens, and at M₁ ≈ 3 regular reflection always fails first. The closing stop fires at high M₁, e.g. M₁ = 10, θ = 5°.
  - **Defaults:** H = 1 and L = 5, so all four default shocks are visible.
  - **Limits:** θ ∈ (0, 40°], H ∈ (0, 5], L ∈ (0, 20].
  - **Comparison:** the single-shock comparison stays in ramp mode only.
  - **θ-β-M drag:** only shock 1's point sets θ. A later shock's incoming Mach depends on θ itself.
  - **Tab name:** "Inlet". `Region.flowDeg` (formerly `thetaCumDeg`) is shown as "flow (°)".
  - **Narrow screens:** below 560 px, shock-angle labels are listed under the drawing.
  - **Chart widths** are measured before paint (`useElementWidth` uses `useLayoutEffect`).

## Open issues
1. ~~PR not merged~~: physics and UI are merged into `main`.
2. **Branch policy for the UI phase is undecided.** The options are a feature branch with a PR, or working directly on `main`. Ask the user.
3. ~~No GitHub CLI~~: `gh` is installed and authenticated, so Claude can open and merge PRs. Terminals opened before the install don't have it on PATH; restart them, or call `"C:\Program Files\GitHub CLI\gh.exe"`.
4. **Deferred minor cleanups from the code review:**
   - `solveOblique` computes θmax and validation twice for θ inputs.
   - `normalShockRaw` recomputes M2² and p2/p1 inside its log helpers.
5. ~~CRLF warnings~~: `.gitattributes` (`* text=auto eol=lf`) added.
6. **The VT fixtures depend on a live third-party page.** Re-recording (`npm run fixtures:vt`) needs network access and breaks if VT changes its markup. The committed JSON is the source of truth for tests.
7. ~~Cloud push blocked~~: GitHub access was fixed and `claude/great-bell-lrkq1u` is pushed.
8. **The D3 bundle and fonts** make the JS ~360 kB (115 kB gzipped). Fine for now; code-split per calculator if it grows.
9. **The inlet imports components from the oblique feature,** which breaks CLAUDE.md's layering rule: `ShockDetail` uses `WedgeDiagram`, `ThetaBetaChart` and `DetachedNotice` from `src/features/oblique-shock`. This was kept deliberately, because the request asked for that reuse. Moving them into `src/components` is a separate refactor.
10. **Deferred minors from the inlet review:**
    - Below a 280 px container, the flow-field drawing is CSS-shrunk while corner drags assume 1:1 pixels.
    - The shading select and the legend name properties slightly differently (`PROPERTY_NAMES` against `SHADE_NAMES`).
    - The corner drag is hand-rolled rather than using `usePointerDrag`.
    - `defaultSolution` duplicates `expectOk`.
    - (The select/legend naming mismatch is fixed: both use `SHADE_NAMES`.)
11. **Deferred minors from the reflecting-shocks review:**
    - The handle-drag code is duplicated between `RampField` and `ReflectField`, and ramp drags don't freeze the scale.
    - Small helpers are duplicated across modes (`centroid`, `rad`, the notice style), and reflect imports `clampSelection` from `ramps/model`.
    - `reflect/text.ts` reads validated values back through unreachable `?? 0` fallbacks.
    - `RecoveryChart`'s `single` and `singleName` should be one prop.
    - On first load the shaded regions glide briefly from the pre-font-load layout (CSS `d` transition); the geometry is right once settled.
    - The θ slider bottoms out at 0.5°, so a typed θ below that shows the slider at 0.5.

## Next steps (in order)
1. **Decisions for you:**
   - Decide the branch policy for future work (open issue 2).
   - If you want ideas from `ui-local` (e.g. weak and strong solutions side by side, or the porthole views), port them deliberately; the branches are not meant to be merged.
2. **Small follow-ups:** the remaining review cleanups in open issue 4; optional `prefers-color-scheme` change listener in `useTheme` (it follows the OS only at load); a "copy link" button next to the tabs (the URL already holds the state).
3. **Phase 2 (later):** the nozzle simulator, built as `src/physics/nozzle.ts` plus `src/features/nozzle/`. It reuses `areaRatio`, `machFromAreaRatio`, `pressureRatio` and `normalShock`, and can reuse `RatioChart`'s axes, `JumpChart`, `useSearchParams` and the calculator layout.
