'use client'

import { useState } from 'react'
import { SettingsModal } from '@/components/game/SettingsModal'
import { useGameStore } from '@/store/gameStore'

export function TopStatusBar() {
  const state = useGameStore(s => s.state)
  const setShowSaveModal = useGameStore(s => s.setShowSaveModal)
  const [showSettings, setShowSettings] = useState(false)

  if (!state) return null

  const money = state.player.money.toLocaleString('zh-CN')

  return (
    <>
      <div
        data-testid="top-status-bar"
        className="pixel-border-light bg-[var(--pixel-bg-panel)] px-3 py-2 sm:px-4"
      >
        <div className="flex flex-col gap-2 min-[1024px]:h-12 min-[1024px]:flex-row min-[1024px]:items-center min-[1024px]:justify-between">
          <span className="pixel-glow text-[var(--pixel-text-bright)]">打工之道</span>
          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm min-[1024px]:gap-6">
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
            <button
              className="pixel-btn px-2 py-0.5 text-xs"
              onClick={() => setShowSettings(true)}
            >
              ⚙
            </button>
          </div>
        </div>
      </div>
      {showSettings && (
        <SettingsModal
          open={showSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </>
  )
}
