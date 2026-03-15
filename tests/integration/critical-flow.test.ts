import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/ai/orchestration/critical', () => ({
  runCriticalDayPipeline: vi.fn(),
}))

import { runCriticalDayPipeline } from '@/ai/orchestration/critical'
import { POST as turnPost } from '@/app/api/game/turn/route'
import { createNewGame } from '@/engine/state'
import { useGameStore } from '@/store/gameStore'

const mockedCritical = vi.mocked(runCriticalDayPipeline)

describe('critical integration flow', () => {
  beforeEach(() => {
    useGameStore.setState({
      state: null,
      isLoading: false,
      error: null,
      activePanel: 'attributes',
      activePhoneApp: null,
      showSaveModal: false,
      narrativeQueue: [],
      promotionInfo: null,
      currentEvent: null,
      criticalChoices: [],
      showQuarterTransition: false,
      lastPerformance: null,
    })

    vi.stubGlobal('fetch', vi.fn(async (input: string, init?: RequestInit) => {
      if (input === '/api/game/turn') {
        return turnPost(new Request('http://localhost/api/game/turn', {
          method: 'POST',
          headers: init?.headers,
          body: init?.body,
        }))
      }

      throw new Error(`Unexpected fetch: ${input}`)
    }))
  })

  it('stores nextChoices from the critical API response', async () => {
    const state = createNewGame()
    useGameStore.setState({ state })

    mockedCritical.mockResolvedValueOnce({
      state: {
        ...state,
        criticalPeriod: {
          ...state.criticalPeriod!,
          currentDay: 2,
        },
      },
      narrative: '第二天，你开始摸到这家公司的门道。',
      nextChoices: [
        {
          choiceId: 'onboarding_d2_a',
          label: '继续观察团队氛围',
          staminaCost: 1,
          effects: {},
          category: '社交',
        },
      ],
      isComplete: false,
      npcActions: [],
    })

    await useGameStore.getState().submitChoice({
      choiceId: 'onboarding_d1_a',
      label: '认真听培训',
      staminaCost: 1,
      effects: {},
      category: '学习',
    })

    const store = useGameStore.getState()
    expect(store.narrativeQueue).toEqual(['第二天，你开始摸到这家公司的门道。'])
    expect(store.criticalChoices).toHaveLength(1)
    expect(store.showQuarterTransition).toBe(false)
  })

  it('clears critical choices and triggers transition on the last day', async () => {
    const state = createNewGame()
    useGameStore.setState({
      state,
      criticalChoices: [
        {
          choiceId: 'old',
          label: '旧选择',
          staminaCost: 1,
          effects: {},
          category: '学习',
        },
      ],
    })

    mockedCritical.mockResolvedValueOnce({
      state: {
        ...state,
        timeMode: 'quarterly',
        criticalPeriod: null,
        staminaRemaining: 10,
      },
      narrative: '入职关键期结束，你终于坐稳了工位。',
      nextChoices: [],
      isComplete: true,
      npcActions: [],
    })

    await useGameStore.getState().submitChoice({
      choiceId: 'final',
      label: '完成最后一天',
      staminaCost: 1,
      effects: {},
      category: '表现',
    })

    const store = useGameStore.getState()
    expect(store.criticalChoices).toEqual([])
    expect(store.showQuarterTransition).toBe(true)
    expect(store.state?.timeMode).toBe('quarterly')
  })
})
