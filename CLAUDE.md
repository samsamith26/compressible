# Engineering standards
- TypeScript strict mode. No `any`, no unchecked type assertions.
- Physics code in /src/physics is pure functions: no UI imports, no side effects, fully unit-tested.
- Small, single-purpose components. Logic lives in hooks or utilities, not JSX.
- Run `npm run lint`, `npm run typecheck`, and `npm test` before calling any task done. All must pass.
- Commit in small, logical steps with clear messages.
- Run the code-review plugin on significant changes before moving on.

# UI standards
- Modern, polished, and interactive. Inputs update results live (no "Calculate" buttons).
- Smooth transitions on value changes. Charts and diagrams respond immediately to input.
- Fully responsive. Dark mode supported.
- Accessible: keyboard navigable, labeled inputs, sufficient contrast.
- Use the frontend-design skill for visual decisions. Avoid generic template looks.
- After UI changes, verify with Playwright, including at mobile width.