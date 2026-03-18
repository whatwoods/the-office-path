import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MobileTabBar } from '@/components/game/MobileTabBar'

describe('MobileTabBar', () => {
  const defaultProps = {
    activeTab: 'story' as const,
    onTabChange: vi.fn(),
  }

  it('renders four tab buttons', () => {
    render(<MobileTabBar {...defaultProps} />)

    expect(screen.getByText('故事')).toBeDefined()
    expect(screen.getByText('属性')).toBeDefined()
    expect(screen.getByText('关系')).toBeDefined()
    expect(screen.getByText('手机')).toBeDefined()
  })

  it('highlights the active tab', () => {
    render(<MobileTabBar {...defaultProps} activeTab="attributes" />)

    const button = screen.getByText('属性').closest('button')

    expect(button?.className).toContain('text-[var(--pixel-text-bright)]')
  })

  it('calls onTabChange when a tab is pressed', () => {
    const onTabChange = vi.fn()

    render(<MobileTabBar {...defaultProps} onTabChange={onTabChange} />)

    fireEvent.click(screen.getByText('关系'))

    expect(onTabChange).toHaveBeenCalledWith('relationships')
  })

  it('is hidden on desktop via responsive classes', () => {
    const { container } = render(<MobileTabBar {...defaultProps} />)
    const nav = container.firstElementChild

    expect(nav?.className).toContain('min-[1024px]:hidden')
  })
})
