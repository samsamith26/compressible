import type { KeyboardEvent } from 'react'
import { cn } from '@/lib/cn'
import { RampsMode } from './ramps/RampsMode'
import { ReflectMode } from './reflect/ReflectMode'
import { INLET_MODES, useInletMode, type InletMode } from './useInletMode'

const MODES: Readonly<Record<InletMode, { readonly name: string; readonly explanation: string }>> = {
  ramps: { name: 'Ramp series', explanation: 'External compression: the shocks focus toward the cowl lip.' },
  reflect: { name: 'Reflecting shocks', explanation: 'Internal compression: the shock bounces inside the duct.' },
}

/** The Inlet tab: two compression schemes behind one segmented control, sharing the same views. */
export function InletCalculator() {
  const [mode, setMode] = useInletMode()

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
    e.preventDefault()
    const next = mode === 'ramps' ? 'reflect' : 'ramps'
    setMode(next)
    e.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`[data-mode="${next}"]`)?.focus()
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <div role="radiogroup" aria-label="Inlet mode" className="inline-flex w-fit rounded-lg border border-rule bg-panel p-1">
          {INLET_MODES.map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              data-mode={m}
              aria-checked={mode === m}
              tabIndex={mode === m ? 0 : -1}
              onClick={() => setMode(m)}
              onKeyDown={onKeyDown}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                mode === m ? 'bg-ink text-paper' : 'text-muted hover:bg-ink/8 hover:text-ink',
              )}
            >
              {MODES[m].name}
            </button>
          ))}
        </div>
        <p className="text-sm text-ink">{MODES[mode].explanation}</p>
        <p className="text-xs text-muted">
          Shock–boundary-layer interaction at reflections is ignored, and shock merging past an intersection is not modeled.
        </p>
      </div>
      {mode === 'ramps' ? <RampsMode /> : <ReflectMode />}
    </div>
  )
}
