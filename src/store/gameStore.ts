import { create } from "zustand";

import { executeJobHop } from "@/engine/job-hop";
import {
  addPlayerComment,
  addPlayerLike,
  canPostMaimai,
  createPlayerPost,
} from "@/engine/maimai";
import { checkPromotion } from "@/engine/promotion";
import {
  loadGame as storageLoad,
  saveGame as storageSave,
} from "@/save/storage";
import type { SaveSlot } from "@/save/storage";
import { useAITelemetryStore } from "@/store/aiTelemetryStore";
import { useSettingsStore } from "@/store/settingsStore";
import type { CriticalChoice, QuarterPlan } from "@/types/actions";
import type { ExecutiveQuarterPlan, Phase2Path } from "@/types/executive";
import type { GameEvent } from "@/types/events";
import type { GameState, MajorType, PhoneApp } from "@/types/game";
import type { AIConfig } from "@/types/settings";
import type { AIUsageSummary } from "@/lib/aiUsage";

interface PromotionInfo {
  eligible: boolean;
  nextLevels: string[];
  failReasons: string[];
}

interface PerformanceInfo {
  rating: string;
  salaryChange: number;
}

function buildAIConfig(): { aiConfig?: AIConfig } {
  const config = useSettingsStore.getState().getAIConfig();
  return config ? { aiConfig: config } : {};
}

function autoSaveIfEnabled(state: GameState): void {
  if (useSettingsStore.getState().settings.gameplay.autoSave) {
    storageSave(state, "auto");
  }
}

function syncAITelemetry(summary: AIUsageSummary | undefined, reset: boolean = false): void {
  const telemetry = useAITelemetryStore.getState();
  if (reset) {
    telemetry.reset();
  }

  if (summary) {
    telemetry.recordRequest(summary);
  }
}

function buildPromotionInfo(state: GameState | null): PromotionInfo | null {
  if (!state) {
    return null;
  }

  const promotion = checkPromotion(state);
  return {
    eligible: promotion.eligible,
    nextLevels: promotion.nextLevels,
    failReasons: promotion.failReasons,
  };
}

interface GameStore {
  state: GameState | null;
  isLoading: boolean;
  error: string | null;

  activePanel: "attributes" | "relationships" | "phone";
  activePhoneApp: PhoneApp | null;
  showSaveModal: boolean;
  narrativeQueue: string[];
  promotionInfo: PromotionInfo | null;
  currentEvent: GameEvent | null;
  criticalChoices: CriticalChoice[];
  showQuarterTransition: boolean;
  lastPerformance: PerformanceInfo | null;

  newGame: (params?: { major?: MajorType; playerName?: string }) => Promise<void>;
  submitQuarter: (plan: QuarterPlan | ExecutiveQuarterPlan) => Promise<void>;
  submitChoice: (choice: CriticalChoice) => Promise<void>;
  resignStartup: (path?: Phase2Path) => Promise<void>;
  postOnMaimai: (content: string) => void;
  likePost: (postId: string) => void;
  commentOnPost: (postId: string, content: string) => void;
  acceptOffer: (offerId: string) => Promise<void>;
  ignoreOffer: (offerId: string) => void;
  refreshState: () => Promise<void>;
  saveGame: (slot: string) => void;
  loadGame: (slot: string) => boolean;
  setActivePanel: (panel: "attributes" | "relationships" | "phone") => void;
  setActivePhoneApp: (app: PhoneApp | null) => void;
  setShowSaveModal: (show: boolean) => void;
  dismissCurrentEvent: () => void;
  dismissQuarterTransition: () => void;
  dismissEvent: () => void;
  dismissPerformance: () => void;
  replyToPhoneMessage: (messageId: string, reply: string) => void;
  clearError: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  state: null,
  isLoading: false,
  error: null,
  activePanel: "attributes",
  activePhoneApp: null,
  showSaveModal: false,
  narrativeQueue: [],
  promotionInfo: null,
  currentEvent: null,
  criticalChoices: [],
  showQuarterTransition: false,
  lastPerformance: null,

  newGame: async (params) => {
    if (get().isLoading) return;
    set({ isLoading: true, error: null });
    try {
      const res = await fetch("/api/game/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...buildAIConfig(),
          major: params?.major,
          playerName: params?.playerName,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        set({ error: data.error ?? "创建游戏失败", isLoading: false });
        return;
      }
      set({
        state: data.state,
        isLoading: false,
        narrativeQueue: data.narrative ? [data.narrative] : [],
        criticalChoices: data.criticalChoices ?? [],
        promotionInfo: buildPromotionInfo(data.state),
        currentEvent: null,
        showQuarterTransition: true,
        lastPerformance: null,
      });
      syncAITelemetry(data.aiUsage, true);
    } catch {
      set({ error: "网络错误", isLoading: false });
    }
  },

  submitQuarter: async (plan: QuarterPlan | ExecutiveQuarterPlan) => {
    const { state, isLoading } = get();
    if (isLoading) return;
    if (!state) return;
    set({ isLoading: true, error: null });
    try {
      const res = await fetch("/api/game/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state, plan, ...buildAIConfig() }),
      });
      const data = await res.json();
      if (!res.ok) {
        set({ error: data.error ?? "提交失败", isLoading: false });
        return;
      }
      const currentEvent =
        data.events?.find((event: GameEvent) => event.triggersCritical) ?? null;
      set({
        state: data.state,
        isLoading: false,
        narrativeQueue: data.narrative ? [data.narrative] : [],
        showQuarterTransition: true,
        currentEvent,
        criticalChoices: data.criticalChoices ?? [],
        promotionInfo: buildPromotionInfo(data.state),
        lastPerformance: data.performanceRating
          ? {
              rating: data.performanceRating,
              salaryChange: data.salaryChange ?? 0,
            }
          : null,
      });
      syncAITelemetry(data.aiUsage);
      autoSaveIfEnabled(data.state);
    } catch {
      set({ error: "网络错误", isLoading: false });
    }
  },

  submitChoice: async (choice: CriticalChoice) => {
    const { state, isLoading } = get();
    if (isLoading) return;
    if (!state) return;
    set({ isLoading: true, error: null });
    try {
      const res = await fetch("/api/game/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state, choice, ...buildAIConfig() }),
      });
      const data = await res.json();
      if (!res.ok) {
        set({ error: data.error ?? "提交失败", isLoading: false });
        return;
      }
      set({
        state: data.state,
        isLoading: false,
        narrativeQueue: data.narrative ? [data.narrative] : [],
        criticalChoices: data.nextChoices ?? [],
        promotionInfo: buildPromotionInfo(data.state),
        currentEvent: null,
        showQuarterTransition: data.isComplete === true,
      });
      syncAITelemetry(data.aiUsage);
    } catch {
      set({ error: "网络错误", isLoading: false });
    }
  },

  resignStartup: async (path: Phase2Path = "startup") => {
    const { state, isLoading } = get();
    if (isLoading) return;
    if (!state) return;
    set({ isLoading: true, error: null });
    try {
      const res = await fetch("/api/game/resign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state, path, ...buildAIConfig() }),
      });
      const data = await res.json();
      if (!res.ok) {
        set({ error: data.error ?? "创业切换失败", isLoading: false });
        return;
      }
      set({
        state: data.state,
        isLoading: false,
        narrativeQueue: data.narrative ? [data.narrative] : [],
        criticalChoices: data.criticalChoices ?? [],
        promotionInfo: buildPromotionInfo(data.state),
        currentEvent: null,
        showQuarterTransition: true,
        lastPerformance: null,
      });
      syncAITelemetry(data.aiUsage);
    } catch {
      set({ error: "网络错误", isLoading: false });
    }
  },

  postOnMaimai: (content: string) => {
    const { state } = get();
    if (!state) return;

    const trimmed = content.trim();
    if (!trimmed) return;

    const canPost = canPostMaimai(
      state.maimaiPostsThisQuarter,
      state.timeMode,
      state.criticalPeriod?.type ?? null,
    );
    if (!canPost) {
      set({ error: "当前阶段不能再发麦麦了" });
      return;
    }

    const newPost = createPlayerPost(trimmed, state.currentQuarter);
    set({
      state: {
        ...state,
        maimaiPosts: [newPost, ...state.maimaiPosts],
        maimaiPostsThisQuarter: state.maimaiPostsThisQuarter + 1,
      },
      error: null,
    });
  },

  likePost: (postId: string) => {
    const { state } = get();
    if (!state) return;

    set({
      state: {
        ...state,
        maimaiPosts: state.maimaiPosts.map((post) =>
          post.id === postId ? addPlayerLike(post) : post,
        ),
      },
    });
  },

  commentOnPost: (postId: string, content: string) => {
    const { state } = get();
    if (!state) return;

    const trimmed = content.trim();
    if (!trimmed) return;

    set({
      state: {
        ...state,
        maimaiPosts: state.maimaiPosts.map((post) =>
          post.id === postId ? addPlayerComment(post, trimmed) : post,
        ),
      },
    });
  },

  acceptOffer: async (offerId: string) => {
    const { state, isLoading } = get();
    if (isLoading) return;
    if (!state) return;

    const offer = state.jobOffers.find((candidate) => candidate.id === offerId);
    if (!offer) {
      set({ error: "Offer 不存在" });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const nextState = executeJobHop(state, offer);
      set({
        state: nextState,
        isLoading: false,
        narrativeQueue: [`你接受了 ${offer.companyName} 的 offer，开始新的入职适应期。`],
        criticalChoices: [],
        promotionInfo: buildPromotionInfo(nextState),
        currentEvent: null,
        showQuarterTransition: true,
        lastPerformance: null,
      });
      autoSaveIfEnabled(nextState);
    } catch {
      set({ error: "接受 offer 失败", isLoading: false });
    }
  },

  ignoreOffer: (offerId: string) => {
    const { state } = get();
    if (!state) return;

    set({
      state: {
        ...state,
        jobOffers: state.jobOffers.filter((offer) => offer.id !== offerId),
      },
    });
  },

  refreshState: async () => {
    const { state } = get();
    if (!state) return;
    set({ promotionInfo: buildPromotionInfo(state) });
  },

  saveGame: (slot: string) => {
    const { state } = get();
    if (!state) return;
    storageSave(state, slot as SaveSlot);
  },

  loadGame: (slot: string) => {
    const loaded = storageLoad(slot as SaveSlot);
    if (!loaded) {
      set({ error: "存档不存在" });
      return false;
    }
    set({
      state: loaded,
      error: null,
      narrativeQueue: [],
      promotionInfo: buildPromotionInfo(loaded),
      currentEvent: null,
      criticalChoices: [],
      showQuarterTransition: false,
      lastPerformance: null,
    });
    return true;
  },

  setActivePanel: (panel) => set({ activePanel: panel }),
  setActivePhoneApp: (app) =>
    set((store) => {
      if (!app || !store.state) {
        return { activePhoneApp: app };
      }

      return {
        activePhoneApp: app,
        state: {
          ...store.state,
          phoneMessages: store.state.phoneMessages.map((message) =>
            message.app === app ? { ...message, read: true } : message,
          ),
        },
      };
    }),
  setShowSaveModal: (show) => set({ showSaveModal: show }),
  dismissCurrentEvent: () => set({ currentEvent: null }),
  dismissQuarterTransition: () => set({ showQuarterTransition: false }),
  dismissEvent: () => set({ currentEvent: null }),
  dismissPerformance: () => set({ lastPerformance: null }),
  replyToPhoneMessage: (messageId, reply) => {
    const { state } = get();
    if (!state) return;
    set({
      state: {
        ...state,
        phoneMessages: state.phoneMessages.map((message) =>
          message.id === messageId
            ? { ...message, read: true, selectedReply: reply }
            : message,
        ),
      },
    });
  },
  clearError: () => set({ error: null }),
}));
