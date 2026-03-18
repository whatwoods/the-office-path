'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import { TopStatusBar } from '@/components/game/TopStatusBar'
import { ErrorBanner } from '@/components/game/ErrorBanner'
import { StoryPanel } from '@/components/game/StoryPanel'
import { DashboardPanel } from '@/components/game/DashboardPanel'
import { ActionBar } from '@/components/game/ActionBar'
import { AttributesTab } from '@/components/game/AttributesTab'
import { RelationshipsTab } from '@/components/game/RelationshipsTab'
import { PhoneTab } from '@/components/game/PhoneTab'
import { SaveModal } from '@/components/game/SaveModal'
import { EventPopup } from '@/components/game/EventPopup'
import { QuarterTransition } from '@/components/game/QuarterTransition'
import { PerformancePopup } from '@/components/game/PerformancePopup'
import { MobileTabBar, type MobileTab } from '@/components/game/MobileTabBar'

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
  const [activeMobileTab, setActiveMobileTab] = useState<MobileTab>('story')

  useEffect(() => {
    if (!state) {
      router.push('/')
    }
  }, [state, router])

  if (!state) return null

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[var(--pixel-bg)]">
      <TopStatusBar />
      <ErrorBanner />

      <div className="hidden flex-1 overflow-hidden min-[1024px]:flex min-[1024px]:flex-row">
        <div className="w-[70%] overflow-y-auto p-4">
          <StoryPanel />
        </div>
        <div className="w-[30%] overflow-y-auto border-l-4 border-[var(--pixel-border)]">
          <DashboardPanel />
        </div>
      </div>
      <div className="hidden min-[1024px]:block">
        <ActionBar />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden min-[1024px]:hidden">
        {activeMobileTab === 'story' && (
          <div
            data-testid="mobile-story-tab"
            className="flex flex-1 flex-col overflow-y-auto pb-[calc(56px+env(safe-area-inset-bottom,0px))]"
          >
            <div className="flex-1 p-3">
              <StoryPanel />
            </div>
            <ActionBar />
          </div>
        )}
        {activeMobileTab === 'attributes' && (
          <div
            data-testid="mobile-attributes-tab"
            className="flex-1 overflow-y-auto p-3 pb-[calc(56px+env(safe-area-inset-bottom,0px))]"
          >
            <AttributesTab />
          </div>
        )}
        {activeMobileTab === 'relationships' && (
          <div
            data-testid="mobile-relationships-tab"
            className="flex-1 overflow-y-auto p-3 pb-[calc(56px+env(safe-area-inset-bottom,0px))]"
          >
            <RelationshipsTab />
          </div>
        )}
        {activeMobileTab === 'phone' && (
          <div
            data-testid="mobile-phone-tab"
            className="flex-1 overflow-y-auto p-3 pb-[calc(56px+env(safe-area-inset-bottom,0px))]"
          >
            <PhoneTab />
          </div>
        )}
      </div>

      <MobileTabBar activeTab={activeMobileTab} onTabChange={setActiveMobileTab} />

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
