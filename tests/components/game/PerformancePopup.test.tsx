import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PerformancePopup } from '@/components/game/PerformancePopup'

describe('PerformancePopup', () => {
  it('renders performance rating and salary change', () => {
    render(
      <PerformancePopup
        rating="A"
        salaryChange={5000}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByText('A')).toBeDefined()
    expect(screen.getByText(/\+5,000/)).toBeDefined()
  })

  it('renders negative salary change', () => {
    render(
      <PerformancePopup
        rating="C"
        salaryChange={-3000}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByText('C')).toBeDefined()
    expect(screen.getByText(/-3,000/)).toBeDefined()
  })

  it('calls onClose when dismiss button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(
      <PerformancePopup
        rating="B+"
        salaryChange={0}
        onClose={onClose}
      />,
    )

    await user.click(screen.getByText('继续'))

    expect(onClose).toHaveBeenCalledOnce()
  })
})
