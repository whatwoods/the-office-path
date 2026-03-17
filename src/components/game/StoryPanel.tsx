'use client'

import { useCallback, useMemo } from 'react'
import { useGameStore } from '@/store/gameStore'
import { NarrativeDisplay } from '@/components/game/NarrativeDisplay'
import { parseNarrative } from '@/lib/narrative'
import { useSettingsStore } from '@/store/settingsStore'

export function StoryPanel() {
  const narrativeQueue = useGameStore(s => s.narrativeQueue)
  const fontSize = useSettingsStore(s => s.settings.display.fontSize)

  const currentNarrative = narrativeQueue[0] ?? null
  const fontSizeClass = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-base',
  }[fontSize]

  const segments = useMemo(() => {
    if (!currentNarrative) return []
    return parseNarrative(currentNarrative)
  }, [currentNarrative])

  const handleComplete = useCallback(() => {
    // Remove consumed narrative from queue
    useGameStore.setState(prev => ({
      narrativeQueue: prev.narrativeQueue.slice(1),
    }))
  }, [])

  if (segments.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-[var(--pixel-text-dim)]">
        等待下一段故事...
      </div>
    )
  }

  return (
    <div data-testid="story-panel" className={`p-4 ${fontSizeClass}`}>
      <NarrativeDisplay segments={segments} onComplete={handleComplete} />
    </div>
  )
}
