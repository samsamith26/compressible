/**
 * Quantity labels are written with a tiny markup so pure model files stay free of
 * JSX: "p_2/p_1" → p₂/p₁, "M_{1n}" → M₁ₙ. Components render the runs as <sub>
 * (HTML) or a shifted <tspan> (SVG).
 */

export interface LabelRun {
  readonly text: string
  readonly sub: boolean
}

export function parseSubscripts(label: string): LabelRun[] {
  const runs: LabelRun[] = []
  const re = /_(\{[^}]*\}|.)/g
  let last = 0
  for (const m of label.matchAll(re)) {
    const i = m.index
    if (i > last) runs.push({ text: label.slice(last, i), sub: false })
    const body = m[1] ?? ''
    runs.push({ text: body.startsWith('{') ? body.slice(1, -1) : body, sub: true })
    last = i + m[0].length
  }
  if (last < label.length) runs.push({ text: label.slice(last), sub: false })
  return runs
}

/** The label as plain text, for aria-labels and tooltips. */
export function plainLabel(label: string): string {
  return parseSubscripts(label)
    .map((r) => r.text)
    .join('')
}
