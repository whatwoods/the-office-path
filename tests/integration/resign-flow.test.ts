import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/ai/agents/narrative', () => ({
  runNarrativeAgent: vi.fn(),
}))

import { runNarrativeAgent } from '@/ai/agents/narrative'
import { POST as resignPost } from '@/app/api/game/resign/route'
import { createNewGame } from '@/engine/state'
import { useGameStore } from '@/store/gameStore'

const mockedNarrative = vi.mocked(runNarrativeAgent)

describe('resign integration flow', () => {
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

    mockedNarrative.mockResolvedValue({
      narrative: '你推开会议室的门，决定去做自己的公司。',
      choices: [
        {
          choiceId: 'startup_launch_d1_a',
          label: '先搭一个 MVP',
          staminaCost: 1,
          effects: {},
          category: '搭建',
        },
      ],
    })

    vi.stubGlobal('fetch', vi.fn(async (input: string, init?: RequestInit) => {
      if (input === '/api/game/resign') {
        return resignPost(new Request('http://localhost/api/game/resign', {
          method: 'POST',
          headers: init?.headers,
          body: init?.body,
        }))
      }

      throw new Error(`Unexpected fetch: ${input}`)
    }))
  })

  it('transitions the store into phase 2 through /api/game/resign', async () => {
    const state = createNewGame()
    state.timeMode = 'quarterly'
    state.criticalPeriod = null
    state.job.level = 'L8'
    useGameStore.setState({ state })

    await useGameStore.getState().resignStartup()

    const store = useGameStore.getState()
    expect(store.state?.phase).toBe(2)
    expect(store.state?.timeMode).toBe('critical')
    expect(store.narrativeQueue).toEqual(['你推开会议室的门，决定去做自己的公司。'])
    expect(store.criticalChoices).toHaveLength(1)
    expect(store.showQuarterTransition).toBe(true)
  })

  it('transitions an L8 player into the executive path', async () => {
    const state = createNewGame()
    state.timeMode = 'quarterly'
    state.criticalPeriod = null
    state.job.level = 'L8'
    useGameStore.setState({ state })

    await useGameStore.getState().resignStartup('executive')

    const store = useGameStore.getState()
    expect(store.state?.phase).toBe(2)
    expect(store.state?.phase2Path).toBe('executive')
    expect(store.state?.executive?.stage).toBe('E1')
    expect(store.state?.company).toBeNull()
    expect(store.state?.criticalPeriod?.type).toBe('executive_onboarding')
    expect(store.showQuarterTransition).toBe(true)
  })
})
