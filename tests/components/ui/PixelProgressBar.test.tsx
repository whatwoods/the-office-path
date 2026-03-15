import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PixelProgressBar } from '@/components/ui/PixelProgressBar'

describe('PixelProgressBar', () => {
  it('renders correct number of filled segments', () => {
    render(<PixelProgressBar value={73} max={100} label="健康" />)
    expect(screen.getByText('健康')).toBeDefined()
    expect(screen.getByText('73')).toBeDefined()
    // 73/100 = 7.3 → 7 filled segments out of 10
    const segments = screen.getAllByTestId('segment')
    expect(segments).toHaveLength(10)
    const filled = segments.filter(s => s.getAttribute('data-filled') === 'true')
    expect(filled).toHaveLength(7)
  })

  it('renders 0 value correctly', () => {
    render(<PixelProgressBar value={0} max={100} label="声望" />)
    const filled = screen.getAllByTestId('segment').filter(
      s => s.getAttribute('data-filled') === 'true',
    )
    expect(filled).toHaveLength(0)
  })

  it('renders 100 value correctly', () => {
    render(<PixelProgressBar value={100} max={100} label="专业" />)
    const filled = screen.getAllByTestId('segment').filter(
      s => s.getAttribute('data-filled') === 'true',
    )
    expect(filled).toHaveLength(10)
  })
})
