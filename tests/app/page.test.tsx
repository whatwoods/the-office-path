import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LandingPage from '@/app/page'
import { useGameStore } from '@/store/gameStore'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

describe('LandingPage', () => {
  beforeEach(() => {
    useGameStore.setState({
      state: null,
      isLoading: false,
      error: null,
      activePanel: 'attributes',
      activePhoneApp: null,
      showSaveModal: false,
      narrativeQueue: [],
      promotionInfo: null,
      currentEvent: null,
      criticalChoices: [],
      showQuarterTransition: false,
      lastPerformance: null,
    })
  })

  it('shows a settings button in the main menu', () => {
    render(<LandingPage />)
    expect(screen.getByText('设置')).toBeDefined()
  })

  it('opens the settings modal when clicking the settings button', async () => {
    const user = userEvent.setup()
    render(<LandingPage />)

    await user.click(screen.getByText('设置'))

    expect(screen.getAllByText('设置').length).toBeGreaterThan(1)
  })
})
