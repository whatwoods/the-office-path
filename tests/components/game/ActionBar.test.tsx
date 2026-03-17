import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ActionBar } from '@/components/game/ActionBar'
import { useGameStore } from '@/store/gameStore'
import { createNewGame } from '@/engine/state'

vi.mock('@/components/game/QuarterlyActions', () => ({
  QuarterlyActions: () => <div>季度行动</div>,
}))

vi.mock('@/components/game/CriticalChoices', () => ({
  CriticalChoices: () => <div>关键抉择</div>,
}))

vi.mock('@/components/game/SubmitButton', () => ({
  SubmitButton: ({ onSubmit }: { onSubmit: () => void }) => (
    <button onClick={onSubmit}>提交</button>
  ),
}))

vi.mock('@/components/ui/PixelProgressBar', () => ({
  PixelProgressBar: () => <div>体力条</div>,
}))

vi.mock('@/components/game/Phase2Choice', () => ({
  Phase2Choice: () => null,
}))

describe('ActionBar', () => {
  beforeEach(() => {
    const state = createNewGame()
    state.timeMode = 'quarterly'
    state.criticalPeriod = null
    state.staminaRemaining = 10

    useGameStore.setState({
      state,
      isLoading: false,
      criticalChoices: [],
      submitQuarter: vi.fn(),
      submitChoice: vi.fn(),
      resignStartup: vi.fn(),
    })
  })

  it('renders a mobile-friendly action bar shell', () => {
    render(<ActionBar />)

    const actionBar = screen.getByTestId('action-bar')
    expect(actionBar.className).toContain('p-3')
    expect(actionBar.className).toContain('sm:p-4')
    expect(screen.getByText('季度行动')).toBeDefined()
    expect(screen.getByText('提交')).toBeDefined()
  })
})
