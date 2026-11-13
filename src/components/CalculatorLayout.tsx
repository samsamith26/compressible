import type { ReactNode } from 'react'

interface CalculatorLayoutProps {
  readonly intro: ReactNode
  readonly inputs: ReactNode
  readonly children: ReactNode
}

/** Input rail beside the results from `lg`; stacked on smaller screens. */
export function CalculatorLayout({ intro, inputs, children }: CalculatorLayoutProps) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(17rem,20rem)_minmax(0,1fr)] lg:items-start">
      <aside className="grid gap-4 lg:sticky lg:top-20">
        <div className="rounded-lg border border-rule bg-panel p-4">
          <form className="grid gap-3" onSubmit={(e) => e.preventDefault()} aria-label="Inputs">
            {inputs}
          </form>
        </div>
        <div className="px-1 text-sm leading-relaxed text-muted">{intro}</div>
      </aside>
      <div className="grid min-w-0 gap-6">{children}</div>
    </div>
  )
}
