import { create } from 'zustand'
import type { GameState, PhoneApp } from '@/types/game'
import type { QuarterPlan, CriticalChoice } from '@/types/actions'
import type { ExecutiveQuarterPlan, Phase2Path } from '@/types/executive'
import type { GameEvent } from '@/types/events'
import { executeJobHop } from '@/engine/job-hop'
import {
  addPlayerComment,
  addPlayerLike,
  canPostMaimai,
  createPlayerPost,
} from '@/engine/maimai'
import {
  saveGame as storageSave,
  loadGame as storageLoad,
} from '@/save/storage'
import type { SaveSlot } from '@/save/storage'

interface PromotionInfo {
  eligible: boolean
  nextLevels: string[]
  failReasons: string[]
}

interface PerformanceInfo {
  rating: string
  salaryChange: number
}

interface GameStore {
  // Core state
  state: GameState | null
  isLoading: boolean
  error: string | null

  // UI state
  activePanel: 'attributes' | 'relationships' | 'phone'
  activePhoneApp: PhoneApp | null
  showSaveModal: boolean
  narrativeQueue: string[]
  promotionInfo: PromotionInfo | null
  currentEvent: GameEvent | null
  criticalChoices: CriticalChoice[]
  showQuarterTransition: boolean
  lastPerformance: PerformanceInfo | null

  // Actions
  newGame: () => Promise<void>
  submitQuarter: (plan: QuarterPlan | ExecutiveQuarterPlan) => Promise<void>
  submitChoice: (choice: CriticalChoice) => Promise<void>
  resignStartup: (path?: Phase2Path) => Promise<void>
  postOnMaimai: (content: string) => void
  likePost: (postId: string) => void
  commentOnPost: (postId: string, content: string) => void
  acceptOffer: (offerId: string) => Promise<void>
  ignoreOffer: (offerId: string) => void
  refreshState: () => Promise<void>
  saveGame: (slot: string) => void
  loadGame: (slot: string) => void
  setActivePanel: (panel: 'attributes' | 'relationships' | 'phone') => void
  setActivePhoneApp: (app: PhoneApp | null) => void
  setShowSaveModal: (show: boolean) => void
  dismissCurrentEvent: () => void
  dismissQuarterTransition: () => void
  dismissEvent: () => void
  dismissPerformance: () => void
  replyToPhoneMessage: (messageId: string, reply: string) => void
  clearError: () => void
}

export const useGameStore = create<GameStore>((set, get) => ({
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

  newGame: async () => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch('/api/game/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (!res.ok) {
        set({ error: data.error ?? '创建游戏失败', isLoading: false })
        return
      }
      set({
        state: data.state,
        isLoading: false,
        narrativeQueue: data.narrative ? [data.narrative] : [],
        criticalChoices: data.criticalChoices ?? [],
        currentEvent: null,
        showQuarterTransition: true,
        lastPerformance: null,
      })
    } catch {
      set({ error: '网络错误', isLoading: false })
    }
  },

  submitQuarter: async (plan: QuarterPlan | ExecutiveQuarterPlan) => {
    const { state } = get()
    if (!state) return
    set({ isLoading: true, error: null })
    try {
      const res = await fetch('/api/game/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state, plan }),
      })
      const data = await res.json()
      if (!res.ok) {
        set({ error: data.error ?? '提交失败', isLoading: false })
        return
      }
      const currentEvent =
        data.events?.find((event: GameEvent) => event.triggersCritical) ?? null
      set({
        state: data.state,
        isLoading: false,
        narrativeQueue: data.narrative ? [data.narrative] : [],
        showQuarterTransition: true,
        currentEvent,
        criticalChoices: data.criticalChoices ?? [],
        lastPerformance: data.performanceRating
          ? {
              rating: data.performanceRating,
              salaryChange: data.salaryChange ?? 0,
            }
          : null,
      })
      // Auto-save after quarter
      storageSave(data.state, 'auto')
      void get().refreshState()
    } catch {
      set({ error: '网络错误', isLoading: false })
    }
  },

  submitChoice: async (choice: CriticalChoice) => {
    const { state } = get()
    if (!state) return
    set({ isLoading: true, error: null })
    try {
      const res = await fetch('/api/game/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state, choice }),
      })
      const data = await res.json()
      if (!res.ok) {
        set({ error: data.error ?? '提交失败', isLoading: false })
        return
      }
      set({
        state: data.state,
        isLoading: false,
        narrativeQueue: data.narrative ? [data.narrative] : [],
        criticalChoices: data.nextChoices ?? [],
        currentEvent: null,
        showQuarterTransition: data.isComplete === true,
      })
    } catch {
      set({ error: '网络错误', isLoading: false })
    }
  },

  resignStartup: async (path: Phase2Path = 'startup') => {
    const { state } = get()
    if (!state) return
    set({ isLoading: true, error: null })
    try {
      const res = await fetch('/api/game/resign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state, path }),
      })
      const data = await res.json()
      if (!res.ok) {
        set({ error: data.error ?? '创业切换失败', isLoading: false })
        return
      }
      set({
        state: data.state,
        isLoading: false,
        narrativeQueue: data.narrative ? [data.narrative] : [],
        criticalChoices: data.criticalChoices ?? [],
        currentEvent: null,
        showQuarterTransition: true,
        lastPerformance: null,
      })
    } catch {
      set({ error: '网络错误', isLoading: false })
    }
  },

  postOnMaimai: (content: string) => {
    const { state } = get()
    if (!state) return

    const trimmed = content.trim()
    if (!trimmed) return

    const canPost = canPostMaimai(
      state.maimaiPostsThisQuarter,
      state.timeMode,
      state.criticalPeriod?.type ?? null,
    )
    if (!canPost) {
      set({ error: '当前阶段不能再发麦麦了' })
      return
    }

    const newPost = createPlayerPost(trimmed, state.currentQuarter)
    set({
      state: {
        ...state,
        maimaiPosts: [newPost, ...state.maimaiPosts],
        maimaiPostsThisQuarter: state.maimaiPostsThisQuarter + 1,
      },
      error: null,
    })
  },

  likePost: (postId: string) => {
    const { state } = get()
    if (!state) return

    set({
      state: {
        ...state,
        maimaiPosts: state.maimaiPosts.map((post) =>
          post.id === postId ? addPlayerLike(post) : post,
        ),
      },
    })
  },

  commentOnPost: (postId: string, content: string) => {
    const { state } = get()
    if (!state) return

    const trimmed = content.trim()
    if (!trimmed) return

    set({
      state: {
        ...state,
        maimaiPosts: state.maimaiPosts.map((post) =>
          post.id === postId ? addPlayerComment(post, trimmed) : post,
        ),
      },
    })
  },

  acceptOffer: async (offerId: string) => {
    const { state } = get()
    if (!state) return

    const offer = state.jobOffers.find((candidate) => candidate.id === offerId)
    if (!offer) {
      set({ error: 'Offer 不存在' })
      return
    }

    set({ isLoading: true, error: null })
    try {
      const nextState = executeJobHop(state, offer)
      set({
        state: nextState,
        isLoading: false,
        narrativeQueue: [`你接受了 ${offer.companyName} 的 offer，开始新的入职适应期。`],
        criticalChoices: [],
        currentEvent: null,
        showQuarterTransition: true,
        lastPerformance: null,
      })
      storageSave(nextState, 'auto')
    } catch {
      set({ error: '接受 offer 失败', isLoading: false })
    }
  },

  ignoreOffer: (offerId: string) => {
    const { state } = get()
    if (!state) return

    set({
      state: {
        ...state,
        jobOffers: state.jobOffers.filter((offer) => offer.id !== offerId),
      },
    })
  },

  refreshState: async () => {
    const { state } = get()
    if (!state) return
    try {
      const res = await fetch('/api/game/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state }),
      })
      const data = await res.json()
      if (res.ok && data.computed) {
        set({
          promotionInfo: {
            eligible: data.computed.promotionEligible,
            nextLevels: data.computed.promotionNextLevels,
            failReasons: data.computed.promotionFailReasons,
          },
        })
      }
    } catch {
      // Silent fail for promotion check
    }
  },

  saveGame: (slot: string) => {
    const { state } = get()
    if (!state) return
    storageSave(state, slot as SaveSlot)
  },

  loadGame: (slot: string) => {
    const loaded = storageLoad(slot as SaveSlot)
    if (!loaded) {
      set({ error: '存档不存在' })
      return
    }
    set({
      state: loaded,
      error: null,
      narrativeQueue: [],
      currentEvent: null,
      criticalChoices: [],
      showQuarterTransition: false,
      lastPerformance: null,
    })
  },

  setActivePanel: (panel) => set({ activePanel: panel }),
  setActivePhoneApp: (app) => set({ activePhoneApp: app }),
  setShowSaveModal: (show) => set({ showSaveModal: show }),
  dismissCurrentEvent: () => set({ currentEvent: null }),
  dismissQuarterTransition: () => set({ showQuarterTransition: false }),
  dismissEvent: () => set({ currentEvent: null }),
  dismissPerformance: () => set({ lastPerformance: null }),
  replyToPhoneMessage: (messageId, reply) => {
    const { state } = get()
    if (!state) return
    set({
      state: {
        ...state,
        phoneMessages: state.phoneMessages.map(m =>
          m.id === messageId ? { ...m, read: true, selectedReply: reply } : m,
        ),
      },
    })
  },
  clearError: () => set({ error: null }),
}))
