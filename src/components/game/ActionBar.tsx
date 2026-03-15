'use client'

import { useState, useCallback } from 'react'
import { useGameStore } from '@/store/gameStore'
import { QuarterlyActions } from '@/components/game/QuarterlyActions'
import { CriticalChoices } from '@/components/game/CriticalChoices'
import { SubmitButton } from '@/components/game/SubmitButton'
import { PixelProgressBar } from '@/components/ui/PixelProgressBar'
import type { ActionAllocation, CriticalChoice } from '@/types/actions'
import { ACTION_STAMINA_COST } from '@/types/actions'

export function ActionBar() {
  const state = useGameStore(s => s.state)
  const isLoading = useGameStore(s => s.isLoading)
  const submitQuarter = useGameStore(s => s.submitQuarter)
  const submitChoice = useGameStore(s => s.submitChoice)
  const resignStartup = useGameStore(s => s.resignStartup)
  const criticalChoices = useGameStore(s => s.criticalChoices)

  const [allocations, setAllocations] = useState<ActionAllocation[]>([])

  const isCritical = state?.timeMode === 'critical'
  const staminaMax = isCritical ? (state?.criticalPeriod?.staminaPerDay ?? 3) : 10
  const staminaUsed = allocations.reduce(
    (sum, a) => sum + (ACTION_STAMINA_COST[a.action] ?? 0),
    0,
  )
  const staminaRemaining = isCritical
    ? (state?.staminaRemaining ?? 0)
    : staminaMax - staminaUsed

  const handleAllocate = useCallback((alloc: ActionAllocation) => {
    if (alloc.action === 'resign_startup') {
      void resignStartup()
      return
    }
    setAllocations(prev => [...prev, alloc])
  }, [resignStartup])

  const handleDeallocate = useCallback((index: number) => {
    setAllocations(prev => prev.filter((_, i) => i !== index))
  }, [])

  const handleSubmitQuarter = useCallback(() => {
    submitQuarter({ actions: allocations })
    setAllocations([])
  }, [allocations, submitQuarter])

  const handleChoose = useCallback((choice: CriticalChoice) => {
    submitChoice(choice)
  }, [submitChoice])

  if (!state) return null

  return (
    <div data-testid="action-bar" className="border-t-4 border-[var(--pixel-border)] bg-[var(--pixel-bg-light)] p-4">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          {isCritical && state.criticalPeriod ? (
            <CriticalChoices
              choices={criticalChoices}
              staminaRemaining={state.staminaRemaining}
              staminaPerDay={state.criticalPeriod.staminaPerDay}
              currentDay={state.criticalPeriod.currentDay}
              maxDays={state.criticalPeriod.maxDays}
              onChoose={handleChoose}
            />
          ) : (
            <QuarterlyActions
              phase={state.phase}
              level={state.job.level}
              allocations={allocations}
              staminaUsed={staminaUsed}
              staminaMax={staminaMax}
              npcs={state.npcs}
              onAllocate={handleAllocate}
              onDeallocate={handleDeallocate}
            />
          )}
        </div>

        <div className="flex shrink-0 flex-col items-center gap-2">
          {!isCritical && (
            <div className="flex items-center gap-2">
              <PixelProgressBar
                value={staminaUsed}
                max={staminaMax}
                label="体力"
                color="var(--pixel-accent)"
              />
              <span className="text-xs text-[var(--pixel-text-dim)]">
                已用 {staminaUsed} / {staminaMax}
              </span>
            </div>
          )}
          <SubmitButton
            isLoading={isLoading}
            isCritical={isCritical}
            staminaRemaining={staminaRemaining}
            staminaMax={staminaMax}
            onSubmit={handleSubmitQuarter}
          />
        </div>
      </div>
    </div>
  )
}
