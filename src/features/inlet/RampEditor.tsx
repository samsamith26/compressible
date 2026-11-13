import { NumberField } from '@/components/NumberField'
import { Button } from '@/components/ui/button'
import { messageFor, type FieldError } from '@/lib/fields'
import { parseNumber } from '@/lib/parseNumber'
import { sub } from './labels'
import { MAX_RAMPS, type InletField } from './model'

interface RampEditorProps {
  readonly thetaTexts: readonly string[]
  readonly lengthTexts: readonly string[]
  readonly error: FieldError<InletField> | null
  readonly onTheta: (index0: number, text: string) => void
  readonly onLength: (index0: number, text: string) => void
  readonly onAdd: () => void
  readonly onRemove: (index0: number) => void
}

/** One row per ramp: angle (typed or slid), length, and a remove button; then "Add ramp". */
export function RampEditor({ thetaTexts, lengthTexts, error, onTheta, onLength, onAdd, onRemove }: RampEditorProps) {
  return (
    <fieldset className="grid gap-3">
      <legend className="mb-1 text-sm font-medium">Ramps</legend>
      {thetaTexts.map((theta, i) => {
        const n = i + 1
        const sliderValue = Math.min(30, Math.max(0, parseNumber(theta) ?? 0))
        return (
          <div key={n} className="grid gap-1 rounded-md border border-rule p-2.5">
            <div className="grid grid-cols-2 gap-2">
              <NumberField
                quantity={{ label: `θ${sub(n)}`, name: `ramp ${n} angle`, unit: '°' }}
                value={theta}
                onChange={(t) => onTheta(i, t)}
                error={messageFor(error, `theta${n}`)}
              />
              <NumberField
                quantity={{ label: `L${sub(n)}`, name: `ramp ${n} length` }}
                value={lengthTexts[i] ?? ''}
                onChange={(t) => onLength(i, t)}
                error={messageFor(error, `length${n}`)}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={30}
                step={0.5}
                value={sliderValue}
                onChange={(e) => onTheta(i, e.target.value)}
                aria-label={`Ramp ${n} angle`}
                className="h-6 min-w-0 flex-1 accent-[var(--up)]"
              />
              <Button
                type="button"
                variant="ghost"
                
                onClick={() => onRemove(i)}
                disabled={thetaTexts.length <= 1}
                aria-label={`Remove ramp ${n}`}
              >
                Remove
              </Button>
            </div>
          </div>
        )
      })}
      <Button type="button" variant="outline"  onClick={onAdd} disabled={thetaTexts.length >= MAX_RAMPS}>
        Add ramp
      </Button>
    </fieldset>
  )
}
