# Compressible flow app

Modern replacement for the isentropic, normal shock and oblique shock sections of the
VT Compressible Aerodynamics Calculator (https://devenport.aoe.vt.edu/aoe3114/calc.html),
with interactive visualizations. Phase 2 (later) is a rocket nozzle simulator reusing
`src/physics`. Design: `docs/superpowers/specs/2026-11-12-compressible-flow-design.md`.
Status and next steps: `NOTES.md`.

# Engineering standards
- TypeScript strict mode (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`). No `any`, no type assertions (`as`); narrow with type guards instead. oxlint enforces both.
- Physics code in /src/physics is pure functions: no UI imports, no side effects, fully unit-tested. oxlint blocks `react`, `@/features`, `@/components` imports there.
- Small, single-purpose components. Logic lives in hooks or utilities, not JSX.
- Run `npm run lint`, `npm run typecheck`, and `npm test` before calling any task done. All must pass.
- Commit in small, logical steps with clear messages.
- Run the code-review plugin on significant changes before moving on.
- Write tests first (red, then green). Coverage on `src/physics` must stay at 100% lines, branches, functions and statements (`vitest.config.ts` enforces it). Prefer restructuring over `/* v8 ignore */`; use it only for paths that are unreachable by construction, with a comment saying why.

# Architecture
- `src/physics/` — pure math. `src/features/<calculator>/` — hooks plus small components. `src/components/` — shared UI. Each layer imports only from the layers below it.
- UI and the nozzle simulator import from `@/physics` (the `index.ts`) only. `numeric.ts`, `gas.ts` and the `*Raw` functions are internal.
- Entry points are the dispatchers: `solveIsentropic`, `solveNormalShock`, `solveOblique`. For chart curves, use the raw relations (`thetaFromBetaDeg`, `areaRatio`, `pressureRatio`, `prandtlMeyerDeg`).

# Physics conventions
- Solvers never throw. They return `Result<T>` (`{ ok: true, value } | { ok: false, error: { code, message, bounds? } }`). Error messages name the user's own input ("p/p0 must be between 0 and 1") so the UI can show them directly.
- Detachment is a valid outcome (`kind: 'detached'` with θmax), not an error.
- Public angles are in degrees with a `Deg` suffix; internals use radians.
- γ > 1 everywhere. Mach domain is [`MACH_MIN` = 1e-12, `MACH_MAX` = 1e6] (`gas.ts`). Every inverse accepts exactly the ratios that domain produces, so a validated input always has a solution.
- Inverses use closed forms where possible, otherwise `findRoot` (Brent) on a bracket that is valid by construction. Solve very large or small ratios in log space.
- Implement from the standard equations (Anderson, *Modern Compressible Flow*). Do not copy code from `reference/`. It is VT's page, gitignored, and used only for input lists and expected outputs.

# Testing
- Physics tests live in `src/physics/__tests__/`. Shared helpers: `unwrap`, `expectRel`, `expectError`, `expectBounds` (`helpers.ts`).
- VT reference fixtures: `npm run fixtures:vt` re-records `src/physics/__tests__/fixtures/vt-*.json` from the live VT page with Playwright. VT's iterative inverses sometimes stop short; `vt-reference.test.ts` handles that. Don't loosen its tolerance without checking which side is wrong.
- Always use the npm scripts (`npm test`, `npm run dev`, `npm run build`, `npm run preview`), never bare `npx vitest` or `npx vite`. They go through `scripts/upper-cwd.mjs`, which re-launches the tool from an upper-case drive path: a lowercase `c:\` cwd (the VS Code default here) makes Vitest load twice (every suite fails) and makes Vite bundle React twice ("Invalid hook call" at runtime).

# UI standards
- Modern, polished, and interactive. Inputs update results live (no "Calculate" buttons).
- Smooth transitions on value changes. Charts and diagrams respond immediately to input.
- Fully responsive. Dark mode supported.
- Accessible: keyboard navigable, labeled inputs, sufficient contrast.
- Use the frontend-design skill for visual decisions. Avoid generic template looks.
- After UI changes, verify with Playwright, including at mobile width.
- Footer credits the VT calculator as inspiration.
- Charts and diagrams are custom SVG with `d3-scale`/`d3-shape`, not a chart library: the draggable θ-β-M point and the detached-shock drawing need exact control.
- Mirror calculator state to the URL query string so links are shareable.
- Use context7 for current library docs (Tailwind, shadcn/ui, React, Vite).
