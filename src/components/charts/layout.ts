export interface Margins {
  readonly top: number
  readonly right: number
  readonly bottom: number
  readonly left: number
}

export interface ChartBox {
  readonly width: number
  readonly height: number
  readonly inner: { readonly width: number; readonly height: number }
  readonly margin: Margins
}

/** Chart height follows width within limits, so a phone gets a usable, not tiny, plot. */
export function chartBox(width: number, aspect: number, margin: Margins, minHeight = 240, maxHeight = 420): ChartBox {
  const height = Math.round(Math.min(maxHeight, Math.max(minHeight, width * aspect)))
  return {
    width,
    height,
    margin,
    inner: {
      width: Math.max(10, width - margin.left - margin.right),
      height: Math.max(10, height - margin.top - margin.bottom),
    },
  }
}
