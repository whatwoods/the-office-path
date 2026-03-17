import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useGameStore } from '@/store/gameStore'
import { TopStatusBar } from '@/components/game/TopStatusBar'
import { createNewGame } from '@/engine/state'

describe('TopStatusBar', () => {
  beforeEach(() => {
    useGameStore.setState({ state: createNewGame(), showSaveModal: false })
  })

  it('displays quarter, level, and money', () => {
    render(<TopStatusBar />)
    expect(screen.getByText(/Q0/)).toBeDefined()
    expect(screen.getByText(/L1/)).toBeDefined()
    expect(screen.getByText(/5,000/)).toBeDefined()
  })

  it('displays game title', () => {
    render(<TopStatusBar />)
    expect(screen.getByText('打工之道')).toBeDefined()
  })

  it('keeps save and settings controls in the responsive bar shell', () => {
    render(<TopStatusBar />)

    expect(screen.getByTestId('top-status-bar')).toBeDefined()
    expect(screen.getByText('存档')).toBeDefined()
    expect(screen.getByText('⚙')).toBeDefined()
  })

  it('opens settings modal from the gear button', async () => {
    const user = userEvent.setup()
    render(<TopStatusBar />)

    await user.click(screen.getByText('⚙'))

    expect(screen.getByText('设置')).toBeDefined()
  })

  it('shows nothing when state is null', () => {
    useGameStore.setState({ state: null })
    const { container } = render(<TopStatusBar />)
    expect(container.textContent).toBe('')
  })
})
