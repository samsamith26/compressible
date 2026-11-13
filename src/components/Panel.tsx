import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface PanelProps {
  readonly title: string
  readonly caption?: ReactNode
  readonly children: ReactNode
  readonly className?: string
}

/** A titled section with a hairline frame. */
export function Panel({ title, caption, children, className }: PanelProps) {
  return (
    <section className={cn('min-w-0 overflow-hidden rounded-lg border border-rule bg-panel', className)} aria-label={title}>
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-rule px-4 py-2.5">
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{title}</h2>
        {caption === undefined ? null : <div className="text-xs text-muted">{caption}</div>}
      </header>
      {children}
    </section>
  )
}
