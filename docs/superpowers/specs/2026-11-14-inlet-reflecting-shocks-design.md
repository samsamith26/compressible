# Inlet: reflecting-shocks mode — design

Approved in conversation on 2026-11-14. Continues PR #2 on `feat/multi-ramp-inlet`, which is still open.

## Intent

The Inlet tab gets two modes, chosen with a segmented control: **Ramp series** (external compression, unchanged) and **Reflecting shocks** (internal compression, new). In the new mode a shock from a ramp's leading edge bounces between the ramp and a flat cowl, turning the flow by θ at every reflection, until it leaves the channel, the walls meet, or regular reflection becomes impossible. Both modes share the region shading, region table, p₀ recovery chart and selected-shock detail, so they read as one feature.

## Decided with the user

The user's request fixes the following:
- **Geometry:**
  - lower wall: a ramp at θ from the leading edge;
  - upper wall: a flat cowl at height H, from x = 0;
  - channel length L.
- **Inputs:** M₁, γ (shared), θ, H and L, mirrored to the URL with their own keys. Mode is in the URL too, and each mode keeps its own inputs.
- **Chain:**
  - Every shock is weak, with turning θ, and takes its upstream Mach number from the previous region.
  - Shocks leaving the lower wall are drawn at β above horizontal; shocks leaving the cowl at β − θ below horizontal.
  - Each shock is labelled with its angle to its local wall, which is β − θ.
- **Stops:** the chain stops when the next shock would leave the channel, when the walls meet, or when θ > θmax for the incoming Mach number. In the last case the reflection point is marked "regular reflection impossible: a Mach reflection forms here (not modeled)".
- **Per region:** M, β, flow direction, and cumulative p/p₁, ρ/ρ₁, T/T₁ and p₀/p₀₁. Inputs are validated with inline errors.
- **Test cases:**
  - M₁ = 2.8, θ = 16°: β₁ = 34.92°, M₂ = 2.059; the reflected shock is 29.33° to the cowl, with M₃ = 1.458 and p₃/p₁ = 6.607; the next reflection fails (θmax = 11.00°).
  - Default M₁ = 3, θ = 10°: four shocks, final M = 1.373, p/p₁ = 10.945, p₀/p₀₁ = 0.9125; the fifth fails at θmax = 8.67°.
- **UI:** one-sentence mode explanations, and subtle notes that shock–boundary-layer interaction and shock merging aren't modelled. The shared parts are refactored rather than duplicated. A single shared look is used across both modes.

## Calls made by Claude (open to change)

- **Structure:**
  - `src/features/inlet/shared/` holds `InletField` (a generic drawing), `RegionTable`, `RecoveryChart`, `ShockDetail`, shading, labels, frame, tooltips, notices, and the `Region`/`ShockLink`/`Chain` types.
  - `ramps/` holds the existing ramp model, geometry, hook and editor.
  - `reflect/` holds the new mode.
- **The `Region` field `thetaCumDeg` becomes `flowDeg`,** the flow direction. In ramp mode this is the wall angle, so the values are unchanged; the table column is renamed from "wall (°)" to "flow (°)".
- **Defaults and URL keys:** `in.mode` (`ramps` | `reflect`, default `ramps`). Reflect inputs: `rf.m` = 3, `rf.t` = 10, `rf.h` = 1, `rf.l` = 5. With these, all four shocks are visible: the last lands at x = 4.06, and the walls would meet at x = 5.67.
- **Limits:** 0 < θ ≤ 40°; 0 < H ≤ 5; 0 < L ≤ 20. M₁ follows the usual physics rules.
- **"Walls meet" needs a working definition.** In a converging channel every reflected shock reaches the opposite wall before the walls' meeting point, so the train only approaches the apex. Each shock also weakens the flow, so at moderate M₁ regular reflection fails first. (At M₁ = 3, every θ tried failed before the channel narrowed to a quarter of H.) The walls-meet stop therefore fires when the next reflection point would be where the channel is **narrower than 1% of H**. That is reachable at high M₁, e.g. M₁ = 10, θ = 5° after 11 shocks.
- **Extra stops:**
  - A detached shock at the leading edge stops the chain at once. This is a bow shock, not a reflection.
  - A region left subsonic by a near-θmax shock stops the chain with the existing "subsonic" link.
- **Handles:**
  - **θ:** a point on the ramp at 60% of the channel; dragging sets the angle from the leading edge.
  - **H:** the cowl's leading edge; dragging vertically sets H.
  - **L:** the cowl's end; dragging horizontally sets L.
  - Each handle is a keyboard `slider`: θ ±0.5° (Shift ±2°), H ±0.05 (Shift ±0.2), L ±0.1 (Shift ±0.5).
  - The drawing's scale is frozen while a handle is dragged, so the handle doesn't run away from the pointer.
- **Comparison:** the single-shock comparison stays in ramp mode only.
- **The full Mach-reflection message** appears as a status notice; the drawing carries a short "Mach reflection" marker at the point.

## Non-goals

- Mach reflection, boundary layers and shock merging. They are noted, not modelled.
- Changes to `src/physics`.
- Changes to ramp mode's behaviour.
