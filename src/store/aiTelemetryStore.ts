import { create } from "zustand";

import {
  createEmptyAIUsageSummary,
  mergeAIUsageSummaries,
  type AIUsageSummary,
} from "@/lib/aiUsage";

interface AITelemetryStore {
  session: AIUsageSummary;
  lastRequest: AIUsageSummary | null;
  recordRequest: (summary: AIUsageSummary) => void;
  reset: () => void;
}

export const useAITelemetryStore = create<AITelemetryStore>((set) => ({
  session: createEmptyAIUsageSummary(),
  lastRequest: null,
  recordRequest: (summary) =>
    set((state) => ({
      session: mergeAIUsageSummaries(state.session, summary),
      lastRequest: mergeAIUsageSummaries(summary),
    })),
  reset: () =>
    set({
      session: createEmptyAIUsageSummary(),
      lastRequest: null,
    }),
}));
