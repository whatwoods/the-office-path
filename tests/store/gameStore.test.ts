import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useGameStore } from '@/store/gameStore'
import { createNewGame } from '@/engine/state'

// Mock fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Mock localStorage
const storage: Record<string, string> = {}
vi.stubGlobal('localStorage', {
  getItem: (key: string) => storage[key] ?? null,
  setItem: (key: string, value: string) => { storage[key] = value },
  removeItem: (key: string) => { delete storage[key] },
})

describe('useGameStore', () => {
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
    mockFetch.mockReset()
    Object.keys(storage).forEach(k => delete storage[k])
  })

  it('has correct initial state', () => {
    const store = useGameStore.getState()
    expect(store.state).toBeNull()
    expect(store.isLoading).toBe(false)
    expect(store.activePanel).toBe('attributes')
    expect(store.currentEvent).toBeNull()
    expect(store.criticalChoices).toEqual([])
    expect(store.showQuarterTransition).toBe(false)
    expect(store.lastPerformance).toBeNull()
  })

  it('newGame fetches and stores opening narrative + critical choices', async () => {
    const mockState = createNewGame()
    const openingChoices = [
      {
        choiceId: 'onboarding_d1_a',
        label: '认真听培训',
        staminaCost: 1,
        effects: { statChanges: { professional: 2 } },
        category: '学习',
      },
    ]
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        state: mockState,
        narrative: '入职第一天，你抱着笔记本走进了工位区。',
        criticalChoices: openingChoices,
      }),
    })

    await useGameStore.getState().newGame()

    const store = useGameStore.getState()
    expect(store.state).toEqual(mockState)
    expect(store.narrativeQueue).toEqual(['入职第一天，你抱着笔记本走进了工位区。'])
    expect(store.criticalChoices).toEqual(openingChoices)
    expect(store.isLoading).toBe(false)
    expect(mockFetch).toHaveBeenCalledWith('/api/game/new', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
  })

  it('newGame sets error on failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: '服务器错误' }),
    })

    await useGameStore.getState().newGame()

    expect(useGameStore.getState().error).toBe('服务器错误')
    expect(useGameStore.getState().state).toBeNull()
  })

  it('submitQuarter stores currentEvent and criticalChoices from the API response', async () => {
    const mockState = createNewGame()
    // Put into quarterly mode for testing
    const quarterlyState = {
      ...mockState,
      timeMode: 'quarterly' as const,
      criticalPeriod: null,
      staminaRemaining: 10,
    }
    useGameStore.setState({ state: quarterlyState })

    const returnedState = {
      ...quarterlyState,
      currentQuarter: 2,
      timeMode: 'critical' as const,
      criticalPeriod: {
        type: 'project_sprint' as const,
        currentDay: 1,
        maxDays: 5,
        staminaPerDay: 3,
      },
      staminaRemaining: 3,
    }
    const criticalEvent = {
      type: 'project_deadline',
      title: '大客户项目进入冲刺周',
      description: '老板临时拍板，下周必须交付。',
      severity: 'high' as const,
      triggersCritical: true,
      criticalType: 'project_sprint' as const,
    }
    const nextChoices = [
      {
        choiceId: 'project_sprint_d1_a',
        label: '先拆分任务',
        staminaCost: 1,
        effects: { statChanges: { professional: 1 } },
        category: '协作',
      },
    ]
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        state: returnedState,
        narrative: '这个季度...',
        events: [criticalEvent],
        criticalChoices: nextChoices,
      }),
    })

    const plan = { actions: [{ action: 'work_hard' as const }] }
    await useGameStore.getState().submitQuarter(plan as any)

    expect(mockFetch).toHaveBeenCalledWith('/api/game/turn', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('"plan"'),
    }))
    expect(useGameStore.getState().state).toEqual(returnedState)
    expect(useGameStore.getState().currentEvent).toEqual(criticalEvent)
    expect(useGameStore.getState().criticalChoices).toEqual(nextChoices)
    expect(useGameStore.getState().showQuarterTransition).toBe(true)
    // Auto-save should have fired
    expect(storage['office_path_save_auto']).toBeDefined()
  })

  it('submitQuarter stores performance when present', async () => {
    const mockState = createNewGame()
    const quarterlyState = {
      ...mockState,
      timeMode: 'quarterly' as const,
      criticalPeriod: null,
      staminaRemaining: 10,
    }
    useGameStore.setState({ state: quarterlyState })

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        state: quarterlyState,
        narrative: '评审季度...',
        events: [],
        performanceRating: 'A',
        salaryChange: 5000,
      }),
    })

    const plan = { actions: [{ action: 'work_hard' as const }] }
    await useGameStore.getState().submitQuarter(plan as any)

    expect(useGameStore.getState().lastPerformance).toEqual({
      rating: 'A',
      salaryChange: 5000,
    })
  })

  it('submitChoice stores nextChoices for the next critical day', async () => {
    const mockState = createNewGame()
    useGameStore.setState({ state: mockState })

    const returnedState = { ...mockState }
    const nextChoices = [
      {
        choiceId: 'onboarding_d2_a',
        label: '主动认识同组同事',
        staminaCost: 1,
        effects: { statChanges: { communication: 1 } },
        category: '社交',
      },
    ]
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        state: returnedState,
        narrative: '你选择了...',
        nextChoices,
      }),
    })

    const choice = {
      choiceId: 'test_a',
      label: '认真听培训',
      staminaCost: 1,
      effects: { statChanges: { professional: 2 } },
      category: '学习',
    }
    await useGameStore.getState().submitChoice(choice as any)

    expect(mockFetch).toHaveBeenCalledWith('/api/game/turn', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('"choice"'),
    }))
    expect(useGameStore.getState().criticalChoices).toEqual(nextChoices)
    expect(useGameStore.getState().showQuarterTransition).toBe(false)
  })

  it('submitChoice clears criticalChoices and triggers transition when critical period completes', async () => {
    const mockState = createNewGame()
    useGameStore.setState({
      state: mockState,
      criticalChoices: [
        {
          choiceId: 'old_choice',
          label: '旧选择',
          staminaCost: 1,
          effects: {},
          category: '测试',
        },
      ],
    })

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        state: {
          ...mockState,
          timeMode: 'quarterly',
          criticalPeriod: null,
          staminaRemaining: 10,
        },
        narrative: '关键期结束...',
        nextChoices: [],
        isComplete: true,
      }),
    })

    const choice = {
      choiceId: 'final_choice',
      label: '完成最后一天',
      staminaCost: 1,
      effects: {},
      category: '表现',
    }
    await useGameStore.getState().submitChoice(choice as any)

    expect(useGameStore.getState().criticalChoices).toEqual([])
    expect(useGameStore.getState().showQuarterTransition).toBe(true)
  })

  it('resignStartup calls the dedicated route and stores startup choices', async () => {
    const mockState = {
      ...createNewGame(),
      timeMode: 'quarterly' as const,
      criticalPeriod: null,
      job: {
        ...createNewGame().job,
        level: 'L6_tech' as const,
      },
    }
    useGameStore.setState({ state: mockState })

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        state: {
          ...mockState,
          phase: 2,
          timeMode: 'critical',
          criticalPeriod: {
            type: 'startup_launch',
            currentDay: 1,
            maxDays: 7,
            staminaPerDay: 3,
          },
          staminaRemaining: 3,
        },
        narrative: '你把工牌放在桌上，心里一下子轻了。',
        criticalChoices: [
          {
            choiceId: 'startup_launch_d1_a',
            label: '先把最小可用产品列出来',
            staminaCost: 1,
            effects: { statChanges: { professional: 2 } },
            category: '搭建',
          },
        ],
      }),
    })

    await useGameStore.getState().resignStartup()

    expect(mockFetch).toHaveBeenCalledWith('/api/game/resign', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('"state"'),
    }))
    expect(useGameStore.getState().state?.phase).toBe(2)
    expect(useGameStore.getState().criticalChoices).toHaveLength(1)
  })

  it('saveGame and loadGame work with localStorage', () => {
    const mockState = createNewGame()
    useGameStore.setState({ state: mockState })

    useGameStore.getState().saveGame('slot1')
    expect(storage['office_path_save_slot1']).toBeDefined()

    // Clear state
    useGameStore.setState({ state: null })
    expect(useGameStore.getState().state).toBeNull()

    // Load
    useGameStore.getState().loadGame('slot1')
    expect(useGameStore.getState().state).toEqual(mockState)
  })

  it('loadGame sets error for empty slot', () => {
    useGameStore.getState().loadGame('slot2')
    expect(useGameStore.getState().error).toBe('存档不存在')
  })

  it('refreshState fetches promotion info', async () => {
    const mockState = createNewGame()
    useGameStore.setState({ state: mockState })

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        state: mockState,
        computed: {
          promotionEligible: true,
          promotionNextLevels: ['L2'],
          promotionFailReasons: [],
        },
      }),
    })

    await useGameStore.getState().refreshState()

    expect(useGameStore.getState().promotionInfo).toEqual({
      eligible: true,
      nextLevels: ['L2'],
      failReasons: [],
    })
  })

  it('dismissQuarterTransition clears the flag', () => {
    useGameStore.setState({ showQuarterTransition: true })

    useGameStore.getState().dismissQuarterTransition()

    expect(useGameStore.getState().showQuarterTransition).toBe(false)
  })

  it('dismissEvent clears currentEvent', () => {
    useGameStore.setState({
      currentEvent: {
        type: 'test',
        title: '测试事件',
        description: '说明',
        severity: 'low',
        triggersCritical: false,
      },
    })

    useGameStore.getState().dismissEvent()

    expect(useGameStore.getState().currentEvent).toBeNull()
  })

  it('dismissPerformance clears lastPerformance', () => {
    useGameStore.setState({
      lastPerformance: { rating: 'A', salaryChange: 5000 },
    })

    useGameStore.getState().dismissPerformance()

    expect(useGameStore.getState().lastPerformance).toBeNull()
  })
})
