# Project notes

Status as of 2026-11-12. Read this before starting work; update it when the status changes.

## What's built

**Phase 1, physics module (complete).** It lives on branch `feat/physics-module`; the PR into `main` is open but not yet merged.

| File | Contents |
|---|---|
| `src/physics/result.ts` | `Result<T>`, `ok`, `err`, error codes |
| `src/physics/gas.ts` | γ and range guards, `MACH_MIN`/`MACH_MAX`, `outOfRange` |
| `src/physics/numeric.ts` | Brent root finder `findRoot`, deg/rad |
| `src/physics/isentropic.ts` | forward state from M; inverses from T/T0, p/p0, ρ/ρ0, A/A* (sub/sup), Mach angle, ν |
| `src/physics/normalShock.ts` | forward from M1; inverses from M2, p2/p1, ρ2/ρ1, T2/T1, p02/p01, p1/p02 |
| `src/physics/obliqueShock.ts` | θ-β-M relation, θmax, weak/strong from θ, from β, from M1n, detachment |
| `src/physics/solvers.ts` | `solveIsentropic`, `solveNormalShock`, `solveOblique` dispatchers |
| `src/physics/index.ts` | public API |
| `scripts/record-vt-fixtures.ts` | Playwright recorder for VT reference values |

**Tests:** 471, with 100% coverage on `src/physics`. They cover:
- textbook values from Anderson's tables
- round trips for every inverse over γ ∈ {1.1, 1.3, 1.4, 1.67}
- edge cases: M = 1, θ = 0, θ = θmax, A/A* ≈ 1, γ near 1, M1 up to 50, out-of-domain inputs
- 261 cases recorded from the VT calculator at γ ∈ {1.2, 1.4, 1.67}

**Not built yet:** any UI. `src/App.tsx`, `App.css`, `index.css` and `src/assets/` are still the Vite starter template. Tailwind, shadcn/ui and d3 are not installed.

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
- **`npm test` runs through `scripts/vitest.mjs`.** This works around the lowercase drive-letter bug described in CLAUDE.md.
- **Mach domain capped at [1e-12, 1e6].** Each input range is exactly what that domain produces. Mach numbers above 1e6 are rejected, because M² overflows past ~1e154.
- **Floating-point margins:**
  - The wave-angle lower bound is μ·(1 − 1e-12), so β typed as exactly μ (e.g. 30° at M1 = 2) is accepted.
  - θ within 1e-12° of θmax counts as θmax (weak = strong = β_max).
- **Coverage ignore:** one `/* v8 ignore */` on the root-failure return in `obliqueFromTheta`. That bracket is valid by construction.
- **VT fixture tolerance:** max(2 × last displayed digit, 1e-5 relative). In 17 cases VT's own inverse stops short (e.g. it echoes p02/p01 = 0.92199659 for an input of 0.922). There, the test compares our forward relations at VT's answer, and our inverse to the input to 1e-9.
- **Branch workflow:** work happened on a feature branch rather than `main`. The user hasn't said whether to keep using branches and PRs for the UI phase.

## Open issues
1. **The PR is not merged.** `main` has only the spec and plan. Merge it on GitHub (fast-forward, no conflicts), or have Claude fast-forward `main` locally and push.
2. **Branch policy for the UI phase is undecided.** The options are a feature branch with a PR, or working directly on `main`. Ask the user.
3. **The GitHub CLI (`gh`) is not installed,** so Claude can't open PRs itself. Install it with `winget install GitHub.cli`, then run `gh auth login`.
4. **Deferred minor cleanups from the code review:**
   - `solveOblique` computes θmax and validation twice for θ inputs.
   - `normalShockRaw` recomputes M2² and p2/p1 inside its log helpers.
   - `asin(1/M)` for the Mach angle is written in `isentropic.ts`, `obliqueShock.ts` and the fixture script; export one helper.
5. **Git warns that LF line endings will be converted to CRLF** on every commit. A `.gitattributes` file with `* text=auto eol=lf` would silence the warning.
6. **The VT fixtures depend on a live third-party page.** Re-recording (`npm run fixtures:vt`) needs network access and breaks if VT changes its markup. The committed JSON is the source of truth for tests.

## Next steps (in order)
1. **Resolve open issues 1 and 2:** merge the physics PR and confirm the branch policy.
2. **Pick the visual direction** with the frontend-design skill, before writing any UI code. Settle the typography, palette (light and dark), layout across the three calculators, and the style for charts and diagrams.
3. **Write the UI implementation plan** with the writing-plans skill, saved to `docs/superpowers/plans/`. It should cover:
   - **Setup:** install and configure Tailwind and shadcn/ui (check current docs via context7), plus `d3-scale` and `d3-shape`. Replace the Vite starter files.
   - **App shell:** a responsive layout and a dark mode toggle, and the footer credit to the VT calculator.
   - **Calculators:** a `useXxxSolver` hook and input/output components for each of `src/features/isentropic`, `normal-shock` and `oblique-shock`. Inputs update live, and errors appear inline using the `Result` messages.
   - **Visualizations:**
     - isentropic ratio plots vs M, with a marker at the current value
     - before/after property comparison across shocks
     - wedge/ramp diagram with the shock at the correct angle, including the detached case
     - interactive θ-β-M chart with a draggable operating point
   - **URL state:** a query-string sync hook for each calculator.
   - **Verification:** Playwright checks at desktop and 375px width, in light and dark mode, including keyboard navigation and drag on the θ-β-M chart.
4. **Execute that plan** test-first, with lint, typecheck and tests passing per task, and the code-review plugin at the end.
5. **Phase 2 (later):** the nozzle simulator, built as `src/physics/nozzle.ts` plus `src/features/nozzle/`. It reuses `areaRatio`, `machFromAreaRatio`, `pressureRatio` and `normalShock`.
