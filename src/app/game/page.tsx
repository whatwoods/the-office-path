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
      <TopStatusBar />
      <ErrorBanner />

      {/* 主区域：移动端纵向堆叠，桌面端双栏 */}
      <div className="flex flex-1 flex-col overflow-hidden min-[1024px]:flex-row">
        <div className="min-h-[38vh] flex-1 overflow-y-auto p-3 min-[1024px]:w-[70%] min-[1024px]:p-4">
          <StoryPanel />
        </div>
        <div className="border-t-4 border-[var(--pixel-border)] min-[1024px]:w-[30%] min-[1024px]:overflow-y-auto min-[1024px]:border-t-0 min-[1024px]:border-l-4">
          <DashboardPanel />
        </div>
      </div>

      <ActionBar />

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
