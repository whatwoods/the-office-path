import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CriticalChoices } from '@/components/game/CriticalChoices'
import type { CriticalChoice } from '@/types/actions'

const mockChoices: CriticalChoice[] = [
  {
    choiceId: 'test_a',
    label: '认真听培训',
    staminaCost: 1,
    effects: { statChanges: { professional: 2 } },
    category: '学习',
  },
  {
    choiceId: 'test_b',
    label: '主动请同事吃饭',
    staminaCost: 1,
    effects: { npcFavorChanges: { '张伟': 10 } },
    category: '社交',
  },
  {
    choiceId: 'test_c',
    label: '加班表现积极',
    staminaCost: 2,
    effects: {
      statChanges: { professional: 3 },
      riskEvent: { probability: 0.2, description: '太紧张，出错了' },
    },
    category: '表现',
  },
]

describe('CriticalChoices', () => {
  it('renders all choice cards', () => {
    render(
      <CriticalChoices
        choices={mockChoices}
        staminaRemaining={3}
        staminaPerDay={3}
        currentDay={1}
        maxDays={5}
        onChoose={vi.fn()}
      />,
    )
    expect(screen.getByText('认真听培训')).toBeDefined()
    expect(screen.getByText('主动请同事吃饭')).toBeDefined()
    expect(screen.getByText('加班表现积极')).toBeDefined()
  })

  it('shows risk warning on choices with riskEvent', () => {
    render(
      <CriticalChoices
        choices={mockChoices}
        staminaRemaining={3}
        staminaPerDay={3}
        currentDay={1}
        maxDays={5}
        onChoose={vi.fn()}
      />,
    )
    expect(screen.getByText(/20%/)).toBeDefined()
  })

  it('disables choices that exceed remaining stamina', () => {
    render(
      <CriticalChoices
        choices={mockChoices}
        staminaRemaining={1}
        staminaPerDay={3}
        currentDay={1}
        maxDays={5}
        onChoose={vi.fn()}
      />,
    )
    // test_c costs 2, only 1 remaining
    const card = screen.getByText('加班表现积极').closest('button')
    expect(card?.disabled).toBe(true)
  })

  it('calls onChoose when card is clicked', async () => {
    const user = userEvent.setup()
    const onChoose = vi.fn()
    render(
      <CriticalChoices
        choices={mockChoices}
        staminaRemaining={3}
        staminaPerDay={3}
        currentDay={1}
        maxDays={5}
        onChoose={onChoose}
      />,
    )

    await user.click(screen.getByText('认真听培训'))
    expect(onChoose).toHaveBeenCalledWith(mockChoices[0])
  })

  it('displays day and stamina info', () => {
    render(
      <CriticalChoices
        choices={mockChoices}
        staminaRemaining={3}
        staminaPerDay={3}
        currentDay={2}
        maxDays={5}
        onChoose={vi.fn()}
      />,
    )
    expect(screen.getByText(/第 2 \/ 5 天/)).toBeDefined()
    expect(screen.getByText(/今日体力: 3 \/ 3/)).toBeDefined()
  })
})
