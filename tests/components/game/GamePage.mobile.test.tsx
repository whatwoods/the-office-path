import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createNewGame } from '@/engine/state'
import { useGameStore } from '@/store/gameStore'
import GamePage from '@/app/game/page'

const push = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}))

vi.mock('@/components/game/TopStatusBar', () => ({
  TopStatusBar: () => <div data-testid="top-status-bar" />,
}))

vi.mock('@/components/game/ErrorBanner', () => ({
  ErrorBanner: () => null,
}))

vi.mock('@/components/game/StoryPanel', () => ({
  StoryPanel: () => <div data-testid="story-panel">Story</div>,
}))

vi.mock('@/components/game/ActionBar', () => ({
  ActionBar: () => <div data-testid="action-bar">ActionBar</div>,
}))

vi.mock('@/components/game/DashboardPanel', () => ({
  DashboardPanel: () => <div data-testid="dashboard-panel">Dashboard</div>,
}))

vi.mock('@/components/game/AttributesTab', () => ({
  AttributesTab: () => <div data-testid="attributes-tab">Attributes</div>,
}))

vi.mock('@/components/game/RelationshipsTab', () => ({
  RelationshipsTab: () => <div data-testid="relationships-tab">Relationships</div>,
}))

vi.mock('@/components/game/PhoneTab', () => ({
  PhoneTab: () => <div data-testid="phone-tab">Phone</div>,
}))

vi.mock('@/components/game/SaveModal', () => ({
  SaveModal: () => null,
}))

vi.mock('@/components/game/EventPopup', () => ({
  EventPopup: () => null,
}))

vi.mock('@/components/game/QuarterTransition', () => ({
  QuarterTransition: () => null,
}))

vi.mock('@/components/game/PerformancePopup', () => ({
  PerformancePopup: () => null,
}))

describe('GamePage mobile layout', () => {
  beforeEach(() => {
    push.mockReset()
    useGameStore.setState({
      state: createNewGame(),
      showSaveModal: false,
      showQuarterTransition: false,
      lastPerformance: null,
      currentEvent: null,
    })
  })

  it('renders the mobile tab bar', () => {
    render(<GamePage />)

    expect(screen.getByText('故事')).toBeDefined()
    expect(screen.getByText('属性')).toBeDefined()
  })

  it('shows the story panel and action bar by default', () => {
    render(<GamePage />)

    const mobileStoryTab = screen.getByTestId('mobile-story-tab')

    expect(within(mobileStoryTab).getByTestId('story-panel')).toBeDefined()
    expect(within(mobileStoryTab).getByTestId('action-bar')).toBeDefined()
  })

  it('switches to the attributes tab when tapped', () => {
    render(<GamePage />)

    fireEvent.click(screen.getByText('属性'))

    expect(screen.getByTestId('attributes-tab')).toBeDefined()
  })

  it('hides the action bar on non-story tabs', () => {
    render(<GamePage />)

    fireEvent.click(screen.getByText('关系'))

    expect(screen.queryByTestId('mobile-story-tab')).toBeNull()
    expect(screen.getByTestId('mobile-relationships-tab')).toBeDefined()
  })
})
