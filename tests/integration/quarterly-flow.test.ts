import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/ai/orchestration/quarterly', () => ({
  runQuarterlyPipeline: vi.fn(),
}))

import { runQuarterlyPipeline } from '@/ai/orchestration/quarterly'
import { POST as turnPost } from '@/app/api/game/turn/route'
import { POST as statePost } from '@/app/api/game/state/route'
import { createNewGame } from '@/engine/state'
import { useGameStore } from '@/store/gameStore'

const mockedQuarterly = vi.mocked(runQuarterlyPipeline)

const storage: Record<string, string> = {}
vi.stubGlobal('localStorage', {
  getItem: (key: string) => storage[key] ?? null,
  setItem: (key: string, value: string) => { storage[key] = value },
  removeItem: (key: string) => { delete storage[key] },
})

describe('quarterly integration flow', () => {
  beforeEach(() => {
    Object.keys(storage).forEach(key => delete storage[key])
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

    mockedQuarterly.mockResolvedValue({
      state: {
        ...createNewGame(),
        timeMode: 'critical',
        criticalPeriod: {
          type: 'company_crisis',
          currentDay: 1,
          maxDays: 7,
          staminaPerDay: 3,
        },
        staminaRemaining: 3,
        currentQuarter: 1,
      },
      narrative: '季度总结：公司突然进入危机模式。',
      worldContext: {
        economy: 'stable',
        trends: [],
        companyStatus: 'stable',
        newsItems: [],
      },
      events: [
        {
          type: 'crisis',
          title: '现金流警报',
          description: '财务群里突然安静了下来。',
          severity: 'high',
          triggersCritical: true,
          criticalType: 'company_crisis',
        },
      ],
      npcActions: [],
      phoneMessages: [],
      performanceRating: 'A',
      salaryChange: 2000,
      criticalChoices: [
        {
          choiceId: 'company_crisis_d1_a',
          label: '先稳住核心团队',
          staminaCost: 1,
          effects: {},
          category: '应对',
        },
      ],
    })

    vi.stubGlobal('fetch', vi.fn(async (input: string, init?: RequestInit) => {
      if (input === '/api/game/turn') {
        return turnPost(new Request('http://localhost/api/game/turn', {
          method: 'POST',
          headers: init?.headers,
          body: init?.body,
        }))
      }

      if (input === '/api/game/state') {
        return statePost(new Request('http://localhost/api/game/state', {
          method: 'POST',
          headers: init?.headers,
          body: init?.body,
        }))
      }

      throw new Error(`Unexpected fetch: ${input}`)
    }))
  })

  it('updates store from a quarterly API response end-to-end', async () => {
    const state = createNewGame()
    state.timeMode = 'quarterly'
    state.criticalPeriod = null
    state.staminaRemaining = 10
    useGameStore.setState({ state })

    await useGameStore.getState().submitQuarter({
      actions: [{ action: 'work_hard' }],
    } as never)

    const store = useGameStore.getState()
    expect(store.state?.timeMode).toBe('critical')
    expect(store.narrativeQueue).toEqual(['季度总结：公司突然进入危机模式。'])
    expect(store.currentEvent?.title).toBe('现金流警报')
    expect(store.criticalChoices).toHaveLength(1)
    expect(store.showQuarterTransition).toBe(true)
    expect(store.lastPerformance).toEqual({
      rating: 'A',
      salaryChange: 2000,
    })
    expect(storage.office_path_save_auto).toBeDefined()
  })
})
