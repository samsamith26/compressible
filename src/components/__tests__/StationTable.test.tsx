// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StationTable } from '../StationTable'

const columns = [
  { key: 'up', label: 'Upstream', tone: 's1' as const },
  { key: 'down', label: 'Downstream', tone: 's2' as const, emphasis: true },
]
const rows = [
  { key: 'm', label: 'M', values: [2, 0.57735] },
  { key: 'p', label: 'p_2/p_1', values: [null, 4.5] },
]

describe('StationTable', () => {
  it('formats values to five significant figures and shows a dash for null', () => {
    render(<StationTable caption="Across the shock" columns={columns} rows={rows} stale={false} />)
    const table = screen.getByRole('table', { name: 'Across the shock' })
    const pRow = within(table).getByRole('row', { name: /p2\/p1/ })
    expect(within(pRow).getByText('—')).toBeTruthy()
    expect(within(pRow).getByText('4.5000')).toBeTruthy()
    expect(within(table).getByText('0.57735')).toBeTruthy()
  })

  it('renders subscripts as <sub>', () => {
    const { container } = render(<StationTable caption="t" columns={columns} rows={rows} stale={false} />)
    expect(container.querySelectorAll('sub')).toHaveLength(2)
  })

  it('marks stale results and says so', () => {
    render(<StationTable caption="t" columns={columns} rows={rows} stale />)
    expect(screen.getByRole('table').dataset.stale).toBe('true')
    expect(screen.getByText(/last valid result/i)).toBeTruthy()
  })
})
