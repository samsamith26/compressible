import { parseSubscripts } from '@/lib/quantity'

/** A quantity label (see lib/quantity.ts) rendered in HTML with real subscripts. */
export function Quantity({ label }: { label: string }) {
  return (
    <>
      {parseSubscripts(label).map((r, i) => (r.sub ? <sub key={i}>{r.text}</sub> : <span key={i}>{r.text}</span>))}
    </>
  )
}

/** The same label inside an SVG <text>. */
export function SvgQuantity({ label }: { label: string }) {
  return (
    <>
      {parseSubscripts(label).map((r, i) =>
        r.sub ? (
          <tspan key={i} baselineShift="sub" fontSize="0.75em">
            {r.text}
          </tspan>
        ) : (
          <tspan key={i}>{r.text}</tspan>
        ),
      )}
    </>
  )
}
