# Project notes

Status as of 2026-11-13. Read this before starting work; update it when the status changes.

## Where things are

| Branch | Contents | State |
|---|---|---|
| `main` | spec and physics plan only | — |
| `feat/physics-module` | the physics engine | PR into `main`, not merged |
| `ui-local` | physics + the UI described below (built locally with the user's skills) | PR into `main`, not merged |
| `origin/claude/great-bell-lrkq1u` | an earlier UI built in a cloud session without the user's skills | reference only; nothing taken from it |

`ui-local` is based on `feat/physics-module`, so its PR contains the physics commits too. Merging it alone brings in both.

Run the app with `npm install`, then `npm run dev` (Vite prints the URL, usually http://localhost:5173). For a production build, run `npm run build`, then `npm run preview`.

## What's built

### Physics (Phase 1, complete; unchanged on `ui-local`)

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

The physics tests have 100% coverage. They cover Anderson's tables, round trips, edge cases, and 261 cases recorded from the VT calculator (`npm run fixtures:vt`).

### UI (Phase 1, complete on `ui-local`)

The plan, including the visual direction, is in `docs/superpowers/plans/2026-11-13-ui-local.md`.

**Visual direction: "colour schlieren".** It was chosen with the frontend-design skill.
- **Porthole.** Each calculator has a round, always-dark test-section window showing the flow, redrawn on every input.
- **Station colours.** Cyan means station 1 (upstream) and magenta means station 2 (downstream). These are the two filter colours in colour schlieren photography. They are used for table columns, chart marks and porthole regions, and nowhere else.
- **Type.** B612 (Airbus's cockpit-display face) is used for numbers and headings, and Atkinson Hyperlegible Next for text. Both keep 0/O and 1/l/I distinct.
- **Palettes** were validated with the dataviz script in both themes. `src/lib/__tests__/contrast.test.ts` tests the contrast of every token.

**The three calculators:**

| Calculator | Inputs | Readout | Porthole | Charts |
|---|---|---|---|---|
| Isentropic | γ, plus any of 8 VT inputs | headline M, μ, ν, A/A*; p/ρ/T to stagnation and sonic | converging-diverging nozzle, station marked, shaded by density | small multiples: stagnation ratios (linear) and A/A* (log) vs M, with a draggable marker |
| Normal shock | γ, plus any of 7 VT inputs | M1 → M2 headline; ratio table including the pitot ratio p1/p02 | duct with the shock, regions tinted by station | across-the-shock dumbbells on a log axis |
| Oblique shock | γ, M1, plus turn angle (weak or strong), β or M1n | upstream / weak / strong side by side, with the selected solution emphasised | ramp with the attached shock, or a detached bow shock | draggable θ-β-M chart, plus across-the-shock dumbbells |

**Behaviour shared by all three:**
- **Live solving.** Results update as you type, with no Calculate button. Half-typed numbers ("1.", "2e") stay quiet. While an input is invalid, an inline message appears next to the field that caused it, and the last valid result stays visible, dimmed.
- **Detachment** is shown as a status with an icon and an explanation, not as an error.
- **Chart drags keep your input kind.** Dragging the isentropic marker while p/p₀ is your input keeps p/p₀ as the input. On the θ-β-M chart, a turn-angle input switches between weak and strong as the point crosses β at θmax.
- **Keyboard control.** Every draggable point is a focusable `slider`. Arrow keys move it, and Shift+arrow moves it ten times further. Arrow keys in a number field nudge its last typed digit.
- **Shareable URLs.** The URL mirrors the inputs (`?calc=oblique&g=1.4&m1=2&k=thetaWeak&v=10`). Each calculator keeps its own inputs when you switch tabs. Garbage in the URL falls back to the defaults, with a message.
- **Responsive to 375 px.** Light and dark themes follow the system, and a toggle choice is remembered. The footer credits the VT calculator.

**Code layout.** `src/lib` holds parsing, formatting, URL state, tokens and theme. `src/hooks` holds React state helpers. `src/components` holds the shared table, input, porthole and chart primitives. Each `src/features/<calc>/` folder has a pure `model.ts` (tested), a `use<Calc>` hook, and small components.

**Tests:**
- `npm test` runs 653 tests: physics, the UI models and libraries, and jsdom component and hook tests.
- `npm run verify:ui` builds the app and drives it with Playwright, at 1280 px and 375 px in light and dark:
  - no horizontal scroll and no console errors;
  - live typing, the Tab order, and the θ-β-M keyboard and mouse drag;
  - detachment, URL reload and theme persistence.
- Screenshots go to `verification/` (gitignored).

## How this UI differs from the cloud version (`origin/claude/great-bell-lrkq1u`)

The cloud session had no frontend-design or dataviz skill, and its visual direction was its own call. Its plan is in commit `d02dfc7`.

| | Cloud UI | This UI (`ui-local`) |
|---|---|---|
| Look | "wind-tunnel instrument": warm paper `#f5f3ee`, graph-paper grids, IBM Plex Sans + Plex Mono for numbers | "colour schlieren": cool test-section glass `#eef1f3`, B612 for numbers, no monospace |
| Signal colours | blue = upstream, amber = downstream | cyan = upstream, magenta = downstream, validated for colour-blind separation with the dataviz script |
| Signature element | wedge diagram and shock tube inside chart panels | a round porthole per calculator: a nozzle (isentropic), a duct (normal) and a ramp or bow shock (oblique), shaded by density with colour-schlieren shock lines |
| Isentropic plot | one ratio plot vs M on a log y axis | two small multiples: stagnation ratios (linear) and A/A* (log), so one axis per chart |
| Oblique results | a readout of the chosen solution | weak and strong side by side, with the selected one emphasised |
| Inputs | an input rail on the left | a "problem line" that reads like the first line of a textbook problem |
| shadcn/ui | primitives hand-written (the registry was blocked) | installed with the shadcn CLI (button, select, tabs, tooltip) and mapped onto the project's tokens |
| Physics | added an exported `machAngleDeg` helper to `src/physics` | no physics changes |
| Windows build | built on Linux, so not affected | fixes the lowercase-drive bug that bundled React twice on this machine (see below) |

## Decisions

### Made with the user
- Stack: Vite + React + TypeScript + Tailwind + shadcn/ui.
- Physics first; the architecture lets Phase 2 (nozzle) reuse `src/physics`.
- Spec: `docs/superpowers/specs/2026-11-12-compressible-flow-design.md`. Plans are in `docs/superpowers/plans/`.
- The UI was built fresh on `ui-local` with the user's local skills, with the cloud UI as reference only and no physics changes.
- GitHub remote: https://github.com/samsamith26/compressible.

### Made by Claude (open to change)

**Physics phase:**
- `Result` values instead of exceptions.
- Degrees at the public API.
- Custom SVG charts.
- URL state.
- oxlint instead of ESLint.
- Mach domain [1e-12, 1e6].
- Floating-point margins at μ and θmax.
- One coverage-ignore on an unreachable branch.
- VT fixture tolerance.

**UI phase:**
- **The colour-schlieren direction, porthole, palettes and typefaces** (above).
- **Every npm script runs through `scripts/upper-cwd.mjs`** (`dev`, `build`, `preview`, `test`). A lowercase `c:\` working directory, which is VS Code's default here, made Vite bundle React twice ("Invalid hook call") and Vitest load twice.
- **Shared links.** A URL that names a kind but no value opens on the default state expressed in that kind.
- **Unrepresentable kinds.** Switching to a kind that can't describe the current state (e.g. Mach angle while subsonic) clears the value rather than reinterpreting the old number.
- **Chart SVGs use `role="group"`, not `role="img"`,** so their focusable sliders and rows stay accessible.
- **Charts render only after their width is measured,** so nothing animates from a guessed width.
- **Direct chart labels that would collide are dropped;** the legend carries them, following the dataviz rules.

## Open issues
1. **Neither PR is merged.** Merging `ui-local` brings in the physics as well.
2. **The GitHub CLI (`gh`) is not installed,** so Claude can't open PRs itself. Install it with `winget install GitHub.cli`, then run `gh auth login`.
3. **Deferred minor cleanups from the physics review:**
   - `solveOblique` computes θmax twice for θ inputs.
   - `normalShockRaw` recomputes M2² and p2/p1.
   - The Mach-angle formula appears in three places.
4. **Deferred minor cleanups from the UI review:**
   - Each hook recomputes its default state on every render (an eager `useLastOk` initial value); a module constant would do.
   - Matching errors to fields relies on message text, and that logic is copied in three models. A shared helper keyed on error data would be sturdier.
   - Label flattening duplicates `plainLabel` in three models.
   - The superscript map is duplicated in `format.ts` and `scales.ts`.
   - `KINDS[0]!` non-null assertions appear in three models. CLAUDE.md bans `as`; whether `!` counts is a judgement call.
5. **The JS bundle is about 450 kB (≈145 kB gzipped),** mostly React, Radix and d3. That's fine for now; code-splitting per calculator is possible later.
6. **The VT fixtures depend on a live third-party page** (see `npm run fixtures:vt`).

## Next steps (in order)
1. **Review and merge the `ui-local` PR,** after looking at the app with `npm run dev`. If it's preferred over the cloud UI, close or delete `origin/claude/great-bell-lrkq1u`.
2. **Optionally do the deferred cleanups** (open issues 3 and 4). Each is small and already has test coverage to lean on.
3. **Phase 2: the rocket nozzle simulator.** Brainstorm it first, then write a spec and a plan. It reuses `areaRatio`, `machFromAreaRatio`, `pressureRatio` and `normalShock`, the nozzle porthole (`src/features/isentropic/NozzleView.tsx` and `nozzleGeometry`), and the chart primitives.
