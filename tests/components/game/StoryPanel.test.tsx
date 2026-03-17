import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StoryPanel } from '@/components/game/StoryPanel'
import { useGameStore } from '@/store/gameStore'
import { useSettingsStore } from '@/store/settingsStore'
import { DEFAULT_SETTINGS } from '@/types/settings'

vi.mock('@/components/game/NarrativeDisplay', () => ({
  NarrativeDisplay: () => <div data-testid="narrative-display" />,
}))

describe('StoryPanel', () => {
  beforeEach(() => {
    useGameStore.setState({
      narrativeQueue: ['你打开工位电脑，看到一堆未读消息。'],
    })
    useSettingsStore.setState({ settings: structuredClone(DEFAULT_SETTINGS) })
  })

  it('applies the large font size class from settings', () => {
    useSettingsStore.getState().updateDisplay({ fontSize: 'large' })

    render(<StoryPanel />)

    expect(screen.getByTestId('story-panel').className).toContain('text-base')
  })
})
