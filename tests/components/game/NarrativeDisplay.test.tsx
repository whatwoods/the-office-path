import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import { NarrativeDisplay } from '@/components/game/NarrativeDisplay'
import { useSettingsStore } from '@/store/settingsStore'
import { DEFAULT_SETTINGS } from '@/types/settings'

describe('NarrativeDisplay', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useSettingsStore.setState({ settings: structuredClone(DEFAULT_SETTINGS) })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders segments with typewriter effect', () => {
    render(
      <NarrativeDisplay
        segments={[{ type: 'text', content: 'AB' }]}
        onComplete={vi.fn()}
      />,
    )
    // Initially empty
    expect(screen.queryByText('AB')).toBeNull()

    // After enough ticks (2 chars × 40ms interval)
    act(() => { vi.advanceTimersByTime(40) })
    expect(screen.getByTestId('narrative-text').textContent).toBe('A')

    act(() => { vi.advanceTimersByTime(40) })
    expect(screen.getByTestId('narrative-text').textContent).toBe('AB')
  })

  it('renders NPC dialogue as speech bubble', () => {
    render(
      <NarrativeDisplay
        segments={[{ type: 'dialogue', speaker: '王建国', content: '早啊' }]}
        onComplete={vi.fn()}
      />,
    )
    // Skip to end
    act(() => { vi.advanceTimersByTime(5000) })

    expect(screen.getByText('王建国')).toBeDefined()
    expect(screen.getByTestId('dialogue-content').textContent).toContain('早啊')
  })

  it('skip button shows all text immediately', () => {
    const onComplete = vi.fn()
    render(
      <NarrativeDisplay
        segments={[{ type: 'text', content: '很长的一段文字内容在这里' }]}
        onComplete={onComplete}
      />,
    )

    fireEvent.click(screen.getByText('跳过'))

    expect(screen.getByTestId('narrative-text').textContent).toBe('很长的一段文字内容在这里')
  })

  it('uses narrativeSpeed from settings store', () => {
    useSettingsStore.getState().updateDisplay({ narrativeSpeed: 20 })

    render(
      <NarrativeDisplay
        segments={[{ type: 'text', content: 'AB' }]}
        onComplete={vi.fn()}
      />,
    )

    act(() => { vi.advanceTimersByTime(20) })
    expect(screen.getByTestId('narrative-text').textContent).toBe('A')

    act(() => { vi.advanceTimersByTime(20) })
    expect(screen.getByTestId('narrative-text').textContent).toBe('AB')
  })
})
