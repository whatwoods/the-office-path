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
        <div className="flex h-10 flex-row items-center justify-between min-[1024px]:h-12">
          <div className="flex items-center gap-2 text-xs sm:text-sm min-[1024px]:gap-6">
            <span className="hidden text-base pixel-glow text-[var(--pixel-text-bright)] min-[1024px]:inline">
              打工之道
            </span>
            <span>Q{state.currentQuarter}</span>
            <span className="hidden min-[1024px]:inline">
              {state.job.level} {state.job.companyName}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs sm:text-sm min-[1024px]:gap-4">
            {state.criticalPeriod && (
              <span className="hidden text-[var(--pixel-accent)] min-[1024px]:inline">
                关键期 {state.criticalPeriod.currentDay}/{state.criticalPeriod.maxDays}
              </span>
            )}
            <span className="text-[var(--pixel-text-amber)]">¥{money}</span>
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
