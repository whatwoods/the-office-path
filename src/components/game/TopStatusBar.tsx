'use client'

import { useGameStore } from '@/store/gameStore'

export function TopStatusBar() {
  const state = useGameStore(s => s.state)
  const setShowSaveModal = useGameStore(s => s.setShowSaveModal)

  if (!state) return null

  const money = state.player.money.toLocaleString('zh-CN')

  return (
    <div className="pixel-border-light flex h-12 items-center justify-between bg-[var(--pixel-bg-panel)] px-4">
      <span className="pixel-glow text-[var(--pixel-text-bright)]">打工之道</span>
      <div className="flex items-center gap-6 text-sm">
        <span>Q{state.currentQuarter}</span>
        <span>{state.job.level} {state.job.companyName}</span>
        <span className="text-[var(--pixel-text-amber)]">¥{money}</span>
        {state.criticalPeriod && (
          <span className="text-[var(--pixel-accent)]">
            关键期 {state.criticalPeriod.currentDay}/{state.criticalPeriod.maxDays}
          </span>
        )}
        <button
          className="pixel-btn px-2 py-0.5 text-xs"
          onClick={() => setShowSaveModal(true)}
        >
          存档
        </button>
      </div>
    </div>
  )
}
