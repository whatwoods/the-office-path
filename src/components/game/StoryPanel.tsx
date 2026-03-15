'use client'

import { useCallback, useMemo } from 'react'
import { useGameStore } from '@/store/gameStore'
import { NarrativeDisplay } from '@/components/game/NarrativeDisplay'
import { parseNarrative } from '@/lib/narrative'

export function StoryPanel() {
  const narrativeQueue = useGameStore(s => s.narrativeQueue)

  const currentNarrative = narrativeQueue[0] ?? null

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
    <div data-testid="story-panel" className="p-4">
      <NarrativeDisplay segments={segments} onComplete={handleComplete} />
    </div>
  )
}
