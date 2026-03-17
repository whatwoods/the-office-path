import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LandingPage from '@/app/page'
import { useGameStore } from '@/store/gameStore'
import { useSettingsStore } from '@/store/settingsStore'
import { DEFAULT_SETTINGS } from '@/types/settings'

const push = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}))

describe('LandingPage', () => {
  beforeEach(() => {
    push.mockReset()
    useSettingsStore.setState({ settings: structuredClone(DEFAULT_SETTINGS) })
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

  it('does not show the desktop-only mobile warning anymore', () => {
    render(<LandingPage />)

    expect(screen.queryByText('请使用电脑访问')).toBeNull()
  })

  it('renders the landing background layer', () => {
    render(<LandingPage />)

    expect(screen.getByTestId('landing-background')).toBeDefined()
  })

  it('opens the settings modal when clicking the settings button', async () => {
    const user = userEvent.setup()
    render(<LandingPage />)

    await user.click(screen.getByText('设置'))

    expect(screen.getAllByText('设置').length).toBeGreaterThan(1)
  })

  it('opens the load modal when clicking the load button', async () => {
    const user = userEvent.setup()
    render(<LandingPage />)

    await user.click(screen.getByText('读取存档'))

    expect(screen.getByText('存档管理')).toBeDefined()
  })

  it('opens settings instead of routing when API key is missing', async () => {
    const user = userEvent.setup()

    render(<LandingPage />)

    await user.click(screen.getByText('新游戏'))

    expect(push).not.toHaveBeenCalled()
    expect(screen.getAllByText('设置').length).toBeGreaterThan(1)
  })

  it('routes to the intro page when API key is present', async () => {
    useSettingsStore.getState().updateAI({ apiKey: 'sk-test-key' })
    const user = userEvent.setup()

    render(<LandingPage />)

    await user.click(screen.getByText('新游戏'))

    expect(push).toHaveBeenCalledWith('/intro')
  })
})
