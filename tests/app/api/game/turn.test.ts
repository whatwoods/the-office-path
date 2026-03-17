import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/game/turn/route";
import { runCriticalDayPipeline } from "@/ai/orchestration/critical";
import { runQuarterlyPipeline } from "@/ai/orchestration/quarterly";
import { createNewGame } from "@/engine/state";
import type { QuarterPlan } from "@/types/actions";

vi.mock("@/ai/orchestration/quarterly", () => ({
  runQuarterlyPipeline: vi.fn().mockResolvedValue({
    state: { timeMode: "critical", criticalPeriod: { type: "company_crisis", currentDay: 1, maxDays: 7, staminaPerDay: 3 } },
    narrative: "季度总结：遇到了公司危机",
    events: [],
    performanceRating: "A",
    salaryChange: 1000,
    criticalChoices: [
      {
        choiceId: "crisis_d1_a",
        label: "紧急公关",
        staminaCost: 1,
        effects: { statChanges: { reputation: 2 } },
        category: "应对",
      },
    ],
  }),
}));

vi.mock("@/ai/orchestration/critical", () => ({
  runCriticalDayPipeline: vi.fn().mockResolvedValue({
    state: { timeMode: "critical" },
    narrative: "关键期的某一天",
    nextChoices: [],
    isComplete: false,
  }),
}));

const mockedRunQuarterlyPipeline = vi.mocked(runQuarterlyPipeline);
const mockedRunCriticalDayPipeline = vi.mocked(runCriticalDayPipeline);

describe("POST /api/game/turn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns criticalChoices for quarterly mode when critical event triggers", async () => {
    const state = createNewGame();
    state.timeMode = "quarterly";
    const plan: QuarterPlan = { actions: [] };

    const req = new Request("http://localhost/api/game/turn", {
      method: "POST",
      body: JSON.stringify({ state, plan }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.criticalChoices).toBeDefined();
    expect(json.criticalChoices.length).toBe(1);
    expect(json.criticalChoices[0].label).toBe("紧急公关");
    expect(json.worldContext).toBeUndefined();
    expect(json.npcActions).toBeUndefined();
    expect(json.phoneMessages).toBeUndefined();
  });

  it("returns nextChoices as an array for critical mode", async () => {
    const state = createNewGame();

    const req = new Request("http://localhost/api/game/turn", {
      method: "POST",
      body: JSON.stringify({
        state,
        choice: {
          choiceId: "onboarding_d1_a",
          label: "认真听培训",
          staminaCost: 1,
          effects: {},
          category: "学习",
        },
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(Array.isArray(json.nextChoices)).toBe(true);
    expect(json.npcActions).toBeUndefined();
  });

  it("passes aiConfig to the quarterly pipeline when provided", async () => {
    const state = createNewGame();
    state.timeMode = "quarterly";
    const plan: QuarterPlan = { actions: [] };
    const aiConfig = {
      provider: "openai" as const,
      apiKey: "sk-turn-quarterly",
      modelOverrides: {},
    };

    const req = new Request("http://localhost/api/game/turn", {
      method: "POST",
      body: JSON.stringify({ state, plan, aiConfig }),
    });

    await POST(req);

    expect(mockedRunQuarterlyPipeline).toHaveBeenCalledWith(state, plan, aiConfig);
  });

  it("passes aiConfig to the critical-day pipeline when provided", async () => {
    const state = createNewGame();
    const choice = {
      choiceId: "onboarding_d1_a",
      label: "认真听培训",
      staminaCost: 1,
      effects: {},
      category: "学习",
    };
    const aiConfig = {
      provider: "deepseek" as const,
      apiKey: "dk-turn-critical",
      modelOverrides: {},
    };

    const req = new Request("http://localhost/api/game/turn", {
      method: "POST",
      body: JSON.stringify({ state, choice, aiConfig }),
    });

    await POST(req);

    expect(mockedRunCriticalDayPipeline).toHaveBeenCalledWith(
      state,
      choice,
      aiConfig,
    );
  });
});
