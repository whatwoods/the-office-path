import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { Modal } from '@/components/ui/Modal'

describe('Modal', () => {
  it('does not render when closed', () => {
    const { container } = render(
      <Modal open={false} onClose={vi.fn()} title="测试">
        内容
      </Modal>,
    )

    expect(container.innerHTML).toBe('')
  })

  it('renders an overlay and content when open', () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="测试">
        内容
      </Modal>,
    )

    expect(screen.getByText('测试')).toBeDefined()
    expect(screen.getByText('内容')).toBeDefined()
  })

  it('calls onClose when the backdrop is clicked', () => {
    const onClose = vi.fn()

    render(
      <Modal open={true} onClose={onClose} title="测试">
        内容
      </Modal>,
    )

    fireEvent.click(screen.getByTestId('modal-backdrop'))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('uses mobile-safe sizing classes on the dialog panel', () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="测试">
        内容
      </Modal>,
    )

    const panel = screen.getByTestId('modal-panel')
    expect(panel.className).toContain('w-[calc(100vw-1.5rem)]')
    expect(panel.className).toContain('max-h-[calc(100dvh-1.5rem)]')
  })
})
