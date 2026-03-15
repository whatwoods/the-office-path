import { describe, expect, it } from 'vitest'
import { settleCriticalDay } from '@/engine/critical-day'
import { createNewGame } from '@/engine/state'
import type { CriticalChoice } from '@/types/actions'

describe('settleCriticalDay stamina reset', () => {
  it('resets stamina to staminaPerDay, not hardcoded 3', () => {
    const state = createNewGame()
    state.timeMode = 'critical'
    state.criticalPeriod = {
      type: 'project_sprint',
      currentDay: 1,
      maxDays: 5,
      staminaPerDay: 5,
    }
    state.staminaRemaining = 5

    const choice: CriticalChoice = {
      choiceId: 'test',
      label: '测试',
      staminaCost: 1,
      effects: {},
      category: '测试',
    }

    const result = settleCriticalDay(state, choice)

    expect(result.isComplete).toBe(false)
    expect(result.state.staminaRemaining).toBe(5)
  })
})
