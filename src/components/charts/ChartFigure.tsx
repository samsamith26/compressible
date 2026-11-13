import type { ReactNode } from 'react'
import { useElementWidth } from '@/hooks/useElementWidth'

export interface Margin {
  readonly top: number
  readonly right: number
  readonly bottom: number
  readonly left: number
}

export interface PlotArea {
  readonly width: number
  readonly height: number
  readonly margin: Margin
  /** Inner plot extents. */
  readonly x0: number
  readonly x1: number
  readonly y0: number
  readonly y1: number
}

/**
 * A titled chart: heading, optional legend row, then an SVG sized to the
 * container width. `children` receives the plot area to draw in.
 */
export function ChartFigure({
  title,
  summary,
  legend,
  height,
  margin,
  children,
}: {
  title: string
  /** One-sentence description for screen readers. */
  summary: string
  legend?: ReactNode
  height: number
  margin: Margin
  children: (area: PlotArea) => ReactNode
}) {
  const [ref, width] = useElementWidth<HTMLDivElement>()
  const area: PlotArea = {
    width,
    height,
    margin,
    x0: margin.left,
    x1: Math.max(margin.left + 10, width - margin.right),
    y0: margin.top,
    y1: height - margin.bottom,
  }

  return (
    <figure className="m-0 min-w-0">
      <figcaption className="mb-2 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <span className="font-heading text-base font-bold text-ink">{title}</span>
        {legend}
      </figcaption>
      <div ref={ref} className="relative w-full">
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${title}. ${summary}`} className="block touch-none overflow-visible select-none">
          {children(area)}
        </svg>
      </div>
    </figure>
  )
}
