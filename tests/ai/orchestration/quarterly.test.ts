import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/ai/agents/world", () => ({
  runWorldAgent: vi.fn(),
}));
vi.mock("@/ai/agents/event", () => ({
  runEventAgent: vi.fn(),
}));
vi.mock("@/ai/agents/npc", () => ({
  runNPCAgent: vi.fn(),
}));
vi.mock("@/ai/agents/narrative", () => ({
  runNarrativeAgent: vi.fn(),
}));

import { runEventAgent } from "@/ai/agents/event";
import { runNarrativeAgent } from "@/ai/agents/narrative";
import { runNPCAgent } from "@/ai/agents/npc";
import { runWorldAgent } from "@/ai/agents/world";
import { runQuarterlyPipeline } from "@/ai/orchestration/quarterly";
import { createNewGame } from "@/engine/state";
import type { QuarterPlan } from "@/types/actions";
import type { GameState } from "@/types/game";

const mockedWorld = vi.mocked(runWorldAgent);
const mockedEvent = vi.mocked(runEventAgent);
const mockedNPC = vi.mocked(runNPCAgent);
const mockedNarrative = vi.mocked(runNarrativeAgent);

function makeQuarterlyState(): GameState {
  const state = createNewGame();
  state.timeMode = "quarterly";
  state.criticalPeriod = null;
  state.staminaRemaining = 10;
  state.currentQuarter = 1;
  return state;
}

const plan: QuarterPlan = {
  actions: [
    { action: "work_hard" },
    { action: "work_hard" },
    { action: "study", target: "professional" },
    { action: "socialize", target: "zhang_wei" },
    { action: "slack_off" },
  ],
};

describe("runQuarterlyPipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockedWorld.mockResolvedValue({
      economy: "stable",
      trends: ["AI发展"],
      companyStatus: "stable",
      newsItems: ["新闻1"],
    });
    mockedEvent.mockResolvedValue({
      events: [
        {
          type: "workplace",
          title: "团建",
          description: "爬山",
          severity: "low" as const,
          triggersCritical: false,
        },
      ],
      phoneMessages: [{ app: "maimai" as const, content: "爆料" }],
    });
    mockedNPC.mockResolvedValue({
      npcActions: [{ npcName: "王建国", action: "表扬", favorChange: 5, reason: "好" }],
      chatMessages: [{ app: "xiaoxin" as const, sender: "张伟", content: "你好" }],
    });
    mockedNarrative.mockResolvedValue({
      narrative: "这个季度过得波澜不惊...",
      narrativeSummary: "完成了一个平稳季度",
    });
  });

  it("calls all 4 agents in correct order", async () => {
    const state = makeQuarterlyState();
    const callOrder: string[] = [];

    mockedWorld.mockImplementation(async () => {
      callOrder.push("world");
      return {
        economy: "stable",
        trends: [],
        companyStatus: "stable",
        newsItems: [],
      };
    });
    mockedEvent.mockImplementation(async () => {
      callOrder.push("event");
      return { events: [], phoneMessages: [] };
    });
    mockedNPC.mockImplementation(async () => {
      callOrder.push("npc");
      return { npcActions: [], chatMessages: [] };
    });
    mockedNarrative.mockImplementation(async () => {
      callOrder.push("narrative");
      return { narrative: "test" };
    });

    await runQuarterlyPipeline(state, plan);

    expect(callOrder).toEqual(["world", "event", "npc", "narrative"]);
  });

  it("returns combined result with narrative and updated state", async () => {
    const state = makeQuarterlyState();
    const result = await runQuarterlyPipeline(state, plan);

    expect(result.narrative).toBeDefined();
    expect(result.state).toBeDefined();
    expect(result.worldContext).toBeDefined();
    expect(result.events).toBeDefined();
    expect(result.npcActions).toBeDefined();
    expect(result.phoneMessages).toBeDefined();
  });

  it("passes world output to event agent", async () => {
    const state = makeQuarterlyState();
    await runQuarterlyPipeline(state, plan);

    expect(mockedEvent).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ economy: "stable" }),
    );
  });

  it("passes world and events to NPC agent", async () => {
    const state = makeQuarterlyState();
    await runQuarterlyPipeline(state, plan);

    expect(mockedNPC).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ economy: "stable" }),
      expect.objectContaining({ events: expect.any(Array) }),
      expect.any(Array),
    );
  });

  it("applies game engine settlement to the returned state", async () => {
    const state = makeQuarterlyState();
    const result = await runQuarterlyPipeline(state, plan);

    expect(result.state.currentQuarter).toBeGreaterThan(state.currentQuarter);
  });
});
