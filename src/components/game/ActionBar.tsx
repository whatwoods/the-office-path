'use client'

import { useState, useCallback } from 'react'
import { useGameStore } from '@/store/gameStore'
import { QuarterlyActions } from '@/components/game/QuarterlyActions'
import { CriticalChoices } from '@/components/game/CriticalChoices'
import { SubmitButton } from '@/components/game/SubmitButton'
import { PixelProgressBar } from '@/components/ui/PixelProgressBar'
import { Phase2Choice } from '@/components/game/Phase2Choice'
import type { ActionAllocation, CriticalChoice } from '@/types/actions'
import { ACTION_STAMINA_COST } from '@/types/actions'
import {
  EXECUTIVE_ACTION_STAMINA_COST,
  type ExecutiveQuarterPlan,
} from '@/types/executive'

type PlannedAction = {
  action: string
  target?: string
}

function getActionCost(action: string): number {
  if (action in ACTION_STAMINA_COST) {
    return ACTION_STAMINA_COST[action as keyof typeof ACTION_STAMINA_COST]
  }

  if (action in EXECUTIVE_ACTION_STAMINA_COST) {
    return EXECUTIVE_ACTION_STAMINA_COST[
      action as keyof typeof EXECUTIVE_ACTION_STAMINA_COST
    ]
  }

  return 0
}

export function ActionBar() {
  const state = useGameStore(s => s.state)
  const isLoading = useGameStore(s => s.isLoading)
  const submitQuarter = useGameStore(s => s.submitQuarter)
  const submitChoice = useGameStore(s => s.submitChoice)
  const resignStartup = useGameStore(s => s.resignStartup)
  const criticalChoices = useGameStore(s => s.criticalChoices)

  const [allocations, setAllocations] = useState<PlannedAction[]>([])
  const [showPhase2Choice, setShowPhase2Choice] = useState(false)

  const isCritical = state?.timeMode === 'critical'
  const staminaMax = isCritical ? (state?.criticalPeriod?.staminaPerDay ?? 3) : 10
  const staminaUsed = allocations.reduce(
    (sum, a) => sum + getActionCost(a.action),
    0,
  )
  const staminaRemaining = isCritical
    ? (state?.staminaRemaining ?? 0)
    : staminaMax - staminaUsed

  const handleAllocate = useCallback((alloc: PlannedAction) => {
    if (alloc.action === 'resign_startup') {
      if (state?.job.level === 'L8') {
        setShowPhase2Choice(true)
        return
      }
      void resignStartup('startup')
      return
    }
    setAllocations(prev => [...prev, alloc])
  }, [resignStartup, state?.job.level])

  const handleDeallocate = useCallback((index: number) => {
    setAllocations(prev => prev.filter((_, i) => i !== index))
  }, [])

  const handleSubmitQuarter = useCallback(() => {
    if (state?.phase2Path === 'executive') {
      submitQuarter({ actions: allocations } as ExecutiveQuarterPlan)
    } else {
      submitQuarter({ actions: allocations as ActionAllocation[] })
    }
    setAllocations([])
  }, [allocations, state?.phase2Path, submitQuarter])

  const handleChoose = useCallback((choice: CriticalChoice) => {
    submitChoice(choice)
  }, [submitChoice])

  if (!state) return null

  return (
    <div data-testid="action-bar" className="border-t-4 border-[var(--pixel-border)] bg-[var(--pixel-bg-light)] p-4">
      {showPhase2Choice && (
        <Phase2Choice
          onClose={() => setShowPhase2Choice(false)}
          onChoose={(path) => {
            setShowPhase2Choice(false)
            void resignStartup(path)
          }}
        />
      )}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          {isCritical && state.criticalPeriod ? (
            <CriticalChoices
              choices={criticalChoices}
              isLoading={isLoading}
              staminaRemaining={state.staminaRemaining}
              staminaPerDay={state.criticalPeriod.staminaPerDay}
              currentDay={state.criticalPeriod.currentDay}
              maxDays={state.criticalPeriod.maxDays}
              onChoose={handleChoose}
            />
          ) : (
            <QuarterlyActions
              phase={state.phase}
              phase2Path={state.phase2Path}
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
            onSubmit={handleSubmitQuarter}
          />
        </div>
      </div>
    </div>
  )
}
