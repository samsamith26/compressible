import { formatValue } from '@/lib/format'
import { cn } from '@/lib/utils'

/** Upstream and downstream Mach numbers as the headline, each under its station colour. */
export function MachPair({ m1, m2, stale, note }: { m1: number; m2: number; stale: boolean; note?: string }) {
  return (
    <div className={cn('flex flex-wrap items-end gap-x-10 gap-y-4 transition-opacity', stale && 'opacity-45')}>
      <div className="border-t-[3px] border-t-s1 pt-1.5">
        <div className="text-sm text-ink-2">
          Upstream M<sub>1</sub>
        </div>
        <div data-testid="m1-headline" className="num text-2xl leading-tight font-bold text-ink">
          {formatValue(m1)}
        </div>
      </div>
      <div className="border-t-[3px] border-t-s2 pt-1.5">
        <div className="text-sm text-ink-2">
          Downstream M<sub>2</sub>{note !== undefined && ` (${note})`}
        </div>
        <div data-testid="m2-headline" className="num text-2xl leading-tight font-bold text-ink">
          {formatValue(m2)}
        </div>
      </div>
    </div>
  )
}
