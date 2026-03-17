import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/ai/agents/narrative', () => ({
  runNarrativeAgent: vi.fn(),
}))

import { runNarrativeAgent } from '@/ai/agents/narrative'
import { POST as newGamePost } from '@/app/api/game/new/route'
import { useGameStore } from '@/store/gameStore'

const mockedNarrative = vi.mocked(runNarrativeAgent)

describe('new game integration flow', () => {
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
      narrative: '你拖着行李箱站在星辰互联的大门口。',
      choices: [
        {
          choiceId: 'onboarding_d1_a',
          label: '先去找工位',
          staminaCost: 1,
          effects: {},
          category: '学习',
        },
      ],
    })

    vi.stubGlobal('fetch', vi.fn(async (input: string, init?: RequestInit) => {
      if (input === '/api/game/new') {
        return newGamePost(new Request('http://localhost/api/game/new', {
          method: 'POST',
          headers: init?.headers,
          body: init?.body,
        }))
      }

      throw new Error(`Unexpected fetch: ${input}`)
    }))
  })

  it('hydrates the store from /api/game/new', async () => {
    await useGameStore.getState().newGame()

    const store = useGameStore.getState()
    expect(store.state).not.toBeNull()
    expect(store.state?.timeMode).toBe('critical')
    expect(store.narrativeQueue).toEqual(['你拖着行李箱站在星辰互联的大门口。'])
    expect(store.criticalChoices).toHaveLength(1)
    expect(store.showQuarterTransition).toBe(true)
  })
})
