'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useGameStore } from '@/store/gameStore'
import { TopStatusBar } from '@/components/game/TopStatusBar'
import { ErrorBanner } from '@/components/game/ErrorBanner'
import { StoryPanel } from '@/components/game/StoryPanel'
import { DashboardPanel } from '@/components/game/DashboardPanel'
import { ActionBar } from '@/components/game/ActionBar'
import { SaveModal } from '@/components/game/SaveModal'
import { EventPopup } from '@/components/game/EventPopup'
import { QuarterTransition } from '@/components/game/QuarterTransition'
import { PerformancePopup } from '@/components/game/PerformancePopup'

export default function GamePage() {
  const router = useRouter()
  const state = useGameStore(s => s.state)
  const showSaveModal = useGameStore(s => s.showSaveModal)
  const setShowSaveModal = useGameStore(s => s.setShowSaveModal)
  const currentEvent = useGameStore(s => s.currentEvent)
  const dismissCurrentEvent = useGameStore(s => s.dismissCurrentEvent)
  const showQuarterTransition = useGameStore(s => s.showQuarterTransition)
  const dismissQuarterTransition = useGameStore(s => s.dismissQuarterTransition)
  const lastPerformance = useGameStore(s => s.lastPerformance)
  const dismissPerformance = useGameStore(s => s.dismissPerformance)

  useEffect(() => {
    if (!state) {
      router.push('/')
    }
  }, [state, router])

  if (!state) return null

  return (
    <div className="flex min-h-screen flex-col bg-[var(--pixel-bg)]">
      {/* 小屏幕提示 */}
      <div className="block min-[1024px]:hidden p-8 text-center text-[var(--pixel-text-amber)]">
        请使用电脑访问
      </div>

      <div className="hidden min-[1024px]:flex min-h-screen flex-col">
        <TopStatusBar />
        <ErrorBanner />

        {/* 主区域：故事区 70% + 仪表盘 30% */}
        <div className="flex flex-1 overflow-hidden">
          <div className="w-[70%] overflow-y-auto p-4">
            <StoryPanel />
          </div>
          <div className="w-[30%] border-l-4 border-[var(--pixel-border)] overflow-y-auto">
            <DashboardPanel />
          </div>
        </div>

        {/* 底部行动区 */}
        <ActionBar />
      </div>

      {currentEvent && (
        <EventPopup
          event={currentEvent}
          onConfirm={dismissCurrentEvent}
        />
      )}

      {showQuarterTransition && (
        <QuarterTransition
          quarter={state.currentQuarter}
          criticalPeriod={state.criticalPeriod}
          onComplete={dismissQuarterTransition}
        />
      )}

      {lastPerformance && (
        <PerformancePopup
          rating={lastPerformance.rating}
          salaryChange={lastPerformance.salaryChange}
          onClose={dismissPerformance}
        />
      )}

      <SaveModal
        open={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        mode="full"
      />
    </div>
  )
}
