import type { ReactNode } from 'react'

/** The inputs, laid out as the opening line of a textbook problem. Wraps on narrow screens. */
export function ProblemLine({ children }: { children: ReactNode }) {
  return (
    <div role="group" aria-label="Inputs" className="flex flex-wrap items-start gap-x-6 gap-y-3 text-base">
      {children}
    </div>
  )
}
