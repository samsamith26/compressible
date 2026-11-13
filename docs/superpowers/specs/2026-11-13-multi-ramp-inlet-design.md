# Multi-ramp supersonic inlet calculator: design

Approved in conversation on 2026-11-13. Branch: `feat/multi-ramp-inlet`, from `main`.

## Intent

A fourth tab that compresses a supersonic stream through 1–4 ramps, each turning the flow a little more through a weak oblique shock. It shows region by region where pressure rises and where total pressure (p₀) is lost. The comparison with a single shock through the same total angle teaches the main point: staged compression recovers far more p₀.

Default example: M₁ = 3, γ = 1.4, three 8° ramps against one 24° shock. Checked with the existing physics: the chain recovers p₀/p₀₁ = 0.956 and the single shock 0.703.

## Goals

- **Chain model** (pure, test-first, in `src/features/inlet/model.ts`, built on `solveOblique`).
  - Shock i is a weak oblique shock whose upstream state is region i. Region i+1 takes its Mach number from that shock's M₂.
  - Per region: M, β of the shock that created it, local θ (that ramp's turn), cumulative θ (wall angle), and cumulative p/p₁, ρ/ρ₁, T/T₁ and p₀/p₀₁, multiplied through the chain.
  - If ramp i's θ exceeds θmax for its incoming Mach number, shock i is detached and the chain stops there.
- **Comparison:** a single oblique shock at the total turning angle, from the same M₁. If that exceeds θmax for M₁, it is reported as detached, with no recovery shown.
- **Geometry.**
  - Ramp i runs from corner i−1 to corner i, along the cumulative wall angle, with its own length.
  - Shock i leaves corner i−1 at (cumulative wall angle before ramp i) + βᵢ.
  - Find where consecutive shocks intersect.
  - If the first intersection lies inside the drawn area (before the x of the last ramp's end), flag it. Draw shocks only up to that point, and hatch the area beyond it as "not modelled", instead of drawing geometry this model can't represent.
- **UI.**
  - **Flow-field diagram:** ramps in sequence, shocks at their true absolute angles, regions numbered 1, 2, 3…, and shading by a selectable property (M, p/p₁, T/T₁, p₀/p₀₁) with a legend.
  - **Region inspection:** hovering a region shows a tooltip with all its properties, and clicking pins it. Keyboard equivalents: regions are focusable, focus shows the tooltip, and Enter or Space pins.
  - **Region table:** one row per region with M, β, θ (local and cumulative), p/p₁, ρ/ρ₁, T/T₁ and p₀/p₀₁.
  - **Cumulative p₀ recovery chart** that steps down at each shock.
  - **Comparison toggle:** shows the single-shock case beside the multi-ramp result, with both recoveries compared directly.
  - **Shock selection:** selecting a shock shows the existing oblique views for it, which are `WedgeDiagram`, `JumpChart` and the point on `ThetaBetaChart`. Dragging that chart's point edits that ramp's θ.
  - **Ramp editing:** add and remove ramps (1–4). Each ramp's angle can be typed, set with a slider, or set by dragging its corner. Lengths can be typed, or set by dragging the corner.
  - **URL state:** inputs are mirrored to the URL like the other calculators, with γ shared under `g`.

## Non-goals

- Shock–shock interaction physics (merging, reflected waves), cowl or lip geometry, the subsonic diffuser and terminal normal shock, strong-shock chains, and designing an optimal inlet.

## Anti-goals

- Drawing geometry past a shock crossing as though the simple model still held.
- A default example that opens on the intersection warning.
- Changing `src/physics` (unless a real bug turns up, which must be reported).

## Decided with the user

- **Ramp lengths: option B,** an editable length per ramp, chosen for flexibility.
  - Rejected: equal lengths (the default would open already flagged), and shock-on-lip sizing (the intersection flag could never fire).
- **The chain lives in the feature's `model.ts`,** as specified, reusing the existing components and the URL and state patterns.

## Calls made by Claude (open to change)

- **Lengths** are dimensionless, with ramp 1 = 1.
  - Default lengths are **1 / 0.6 / 0.4**. With these, crossings fall at x ≈ 2.22 and 2.24, past the ramps' end at x ≈ 1.93, so the default opens clean.
  - New ramps get angle 8° and the previous ramp's length × 0.7.
- **Drawn area:** x from a short freestream lead-in before the leading edge to the end of the last ramp. y from the wall up to where shock 1 meets x = end, or a minimum height.
- **Only consecutive shocks are checked for crossings.** Shocks steepen downstream, so shock i+2 can't reach shock i without crossing shock i+1 first. The table values stay valid along the walls and are still shown when a crossing is flagged.
- **A shock that meets a later ramp is also a conflict.** Steep later ramps can climb into an earlier shock, which this model can't draw either.
- **What a flag does:** the first conflict, the one with the smallest x, is flagged. Everything at or beyond that x is clipped from the drawing and hatched "not modelled".
- **Detached mid-chain:**
  - Region k is drawn up to the end, and ramps after ramp k are drawn greyed.
  - A "detached at ramp k" notice shows the θ and θmax.
  - The recovery chart stops at that shock.
- **URL keys:** `in.m` (M₁), `in.t` (angles, comma-separated), `in.l` (lengths), `in.prop` (`M`, `p`, `T` or `p0`), `in.cmp` (`1` or `0`, default `1`), and `in.sel` (selected shock, 1-based, default 1).
- **Shading:** one sequential hue scale (light to dark), validated with the dataviz script in both themes.
  - Region numbers use ink or paper, whichever contrasts with the fill.
  - The legend shows the property's range across the regions.
- **Corner handles** are `slider`s. Up and Down change the previous ramp's θ by 0.5° (Shift: 2°); Left and Right change its length by 0.05 (Shift: 0.2).
- **Comparison view:** a compact, read-only flow field of the single ramp (one ramp with the total θ and the total length), plus a second series on the recovery chart, plus a final-state summary for both.

## Constraints

- Follows CLAUDE.md: strict TypeScript, no `any` and no `as`, logic in `model.ts` and hooks, components small, tests first.
- Matches the existing visual direction ("wind-tunnel instrument", IBM Plex, `--up` and `--down`, `Panel`, `graph-paper`).
- `npm run lint`, `typecheck`, `test` and `verify:ui` must all pass. Extend `verify:ui` for the new tab at desktop and mobile widths. Run code review, commit in small steps, update NOTES.md, and open a PR with gh without merging it.
