import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
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
  StoryPanel: () => <div data-testid="story-panel" />,
}))

vi.mock('@/components/game/DashboardPanel', () => ({
  DashboardPanel: () => <div data-testid="dashboard-panel" />,
}))

vi.mock('@/components/game/ActionBar', () => ({
  ActionBar: () => <div data-testid="action-bar" />,
}))

vi.mock('@/components/game/SaveModal', () => ({
  SaveModal: () => null,
}))

vi.mock('@/components/game/QuarterTransition', () => ({
  QuarterTransition: ({ onComplete }: { onComplete: () => void }) => (
    <button onClick={onComplete}>季度过渡</button>
  ),
}))

vi.mock('@/components/game/PerformancePopup', () => ({
  PerformancePopup: ({
    rating,
    salaryChange,
    onClose,
  }: {
    rating: string
    salaryChange: number
    onClose: () => void
  }) => (
    <div>
      <span>{`绩效 ${rating} ${salaryChange}`}</span>
      <button onClick={onClose}>关闭绩效</button>
    </div>
  ),
}))

describe('GamePage', () => {
  beforeEach(() => {
    push.mockReset()
    useGameStore.setState({
      state: createNewGame(),
      showSaveModal: false,
      showQuarterTransition: false,
      lastPerformance: null,
      currentEvent: {
        type: 'deadline',
        title: '项目告急',
        description: '需求临时变更，今晚必须补方案。',
        severity: 'high',
        triggersCritical: true,
        criticalType: 'project_sprint',
      },
    })
  })

  it('renders EventPopup when currentEvent exists', () => {
    render(<GamePage />)

    expect(screen.getByText('项目告急')).toBeDefined()
    expect(screen.getByText('需求临时变更，今晚必须补方案。')).toBeDefined()
    expect(screen.getByText('确认')).toBeDefined()
  })

  it('dismisses EventPopup when confirm is clicked', () => {
    render(<GamePage />)

    fireEvent.click(screen.getByText('确认'))

    expect(screen.queryByText('项目告急')).toBeNull()
    expect(useGameStore.getState().currentEvent).toBeNull()
  })

  it('renders and dismisses QuarterTransition when flagged', () => {
    useGameStore.setState({ showQuarterTransition: true, currentEvent: null })

    render(<GamePage />)

    fireEvent.click(screen.getByText('季度过渡'))

    expect(useGameStore.getState().showQuarterTransition).toBe(false)
  })

  it('renders and dismisses PerformancePopup when performance data exists', () => {
    useGameStore.setState({
      currentEvent: null,
      lastPerformance: {
        rating: 'A',
        salaryChange: 5000,
      },
    })

    render(<GamePage />)

    expect(screen.getByText('绩效 A 5000')).toBeDefined()

    fireEvent.click(screen.getByText('关闭绩效'))

    expect(useGameStore.getState().lastPerformance).toBeNull()
  })

  it('does not show the desktop-only warning anymore', () => {
    useGameStore.setState({
      currentEvent: null,
      showQuarterTransition: false,
      lastPerformance: null,
    })

    render(<GamePage />)

    expect(screen.queryByText('请使用电脑访问')).toBeNull()
    expect(screen.getByTestId('top-status-bar')).toBeDefined()
    expect(screen.getAllByTestId('story-panel').length).toBeGreaterThan(0)
    expect(screen.getByTestId('dashboard-panel')).toBeDefined()
    expect(screen.getAllByTestId('action-bar').length).toBeGreaterThan(0)
  })
})
