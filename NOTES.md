# Project notes

Status as of 2026-11-13. Read this before starting work; update it when the status changes.

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
| `scripts/verify-ui.ts` | `npm run verify:ui`: Playwright checks at 1280/375px, light/dark, behaviour |

URL keys: `calc` (isentropic/normal/oblique), `g` (γ, shared), `iso.k`/`iso.v`, `ns.k`/`ns.v`,
`ob.m`/`ob.k`/`ob.v`. Field text is stored as typed, so invalid input round-trips with its error.

**Tests:** 620 (Vitest), 100% coverage on `src/physics`. `npm run verify:ui` passes (53 checks).
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

## Open issues
1. ~~PR not merged~~: physics and UI are merged into `main`.
2. **Branch policy for the UI phase is undecided.** The options are a feature branch with a PR, or working directly on `main`. Ask the user.
3. ~~No GitHub CLI~~: `gh` is installed and authenticated, so Claude can open and merge PRs. Terminals opened before the install don't have it on PATH; restart them, or call `"C:Program FilesGitHub CLIgh.exe"`.
4. **Deferred minor cleanups from the code review:**
   - `solveOblique` computes θmax and validation twice for θ inputs.
   - `normalShockRaw` recomputes M2² and p2/p1 inside its log helpers.
5. ~~CRLF warnings~~: `.gitattributes` (`* text=auto eol=lf`) added.
6. **The VT fixtures depend on a live third-party page.** Re-recording (`npm run fixtures:vt`) needs network access and breaks if VT changes its markup. The committed JSON is the source of truth for tests.
7. ~~Cloud push blocked~~: GitHub access was fixed and `claude/great-bell-lrkq1u` is pushed.
8. **The D3 bundle and fonts** make the JS ~360 kB (115 kB gzipped). Fine for now; code-split per calculator if it grows.

## Next steps (in order)
1. **Decisions for you:**
   - Decide the branch policy for future work (open issue 2).
   - If you want ideas from `ui-local` (e.g. weak and strong solutions side by side, or the porthole views), port them deliberately; the branches are not meant to be merged.
2. **Small follow-ups:** the remaining review cleanups in open issue 4; optional `prefers-color-scheme` change listener in `useTheme` (it follows the OS only at load); a "copy link" button next to the tabs (the URL already holds the state).
3. **Phase 2 (later):** the nozzle simulator, built as `src/physics/nozzle.ts` plus `src/features/nozzle/`. It reuses `areaRatio`, `machFromAreaRatio`, `pressureRatio` and `normalShock`, and can reuse `RatioChart`'s axes, `JumpChart`, `useSearchParams` and the calculator layout.
