function channels(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h
  const n = Number.parseInt(full, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0)
}

/** WCAG 2 contrast ratio between two hex colours (1 to 21). */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05)
}

/** Extract the `--name: #hex` custom properties declared in the first `selector { ... }` block. */
export function readThemeTokens(css: string, selector: string): Map<string, string> {
  const start = css.indexOf(`${selector} {`)
  const block = start < 0 ? '' : css.slice(start, css.indexOf('}', start))
  const tokens = new Map<string, string>()
  for (const m of block.matchAll(/--([\w-]+):\s*(#[0-9a-f]{3,6})\s*;/gi)) {
    const [, name, value] = m
    if (name !== undefined && value !== undefined) tokens.set(name, value)
  }
  return tokens
}
