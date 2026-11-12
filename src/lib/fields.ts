import { err, ok, type Result } from '@/physics'
import { parseNumber } from './parseNumber'

/** Describes one quantity a person can enter or read. `label` uses Unicode sub/superscripts. */
export interface Quantity {
  readonly label: string
  readonly name: string
  readonly unit?: '°'
}

/** Parse a field's text into a number, with a message that names the field. */
export function parseField(text: string, name: string): Result<number> {
  const value = parseNumber(text)
  return value === null ? err('NOT_FINITE', `Enter a number for ${name}`) : ok(value)
}
