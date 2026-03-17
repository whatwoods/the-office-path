import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { QuarterTransition } from '@/components/game/QuarterTransition'

describe('QuarterTransition', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    act(() => {
      vi.runOnlyPendingTimers()
    })
    vi.useRealTimers()
  })

  it.each([
    ['new_company_onboarding', '新公司入职'],
    ['executive_onboarding', '高管上任'],
    ['board_review', '董事会审查'],
    ['power_struggle', '权力斗争'],
    ['major_decision', '重大决策'],
    ['power_transition', '权力交接'],
  ] as const)('renders label for %s', (type, label) => {
    render(
      <QuarterTransition
        quarter={3}
        criticalPeriod={{
          type,
          currentDay: 1,
          maxDays: 3,
          staminaPerDay: 3,
        }}
        onComplete={vi.fn()}
      />,
    )

    expect(screen.getByText(label)).toBeDefined()
  })
})
