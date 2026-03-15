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
import { runCriticalDayPipeline } from "@/ai/orchestration/critical";
import { createNewGame } from "@/engine/state";
import type { CriticalChoice } from "@/types/actions";

const mockedNPC = vi.mocked(runNPCAgent);
const mockedEvent = vi.mocked(runEventAgent);
const mockedNarrative = vi.mocked(runNarrativeAgent);

describe("runCriticalDayPipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockedNPC.mockResolvedValue({
      npcActions: [{ npcName: "王建国", action: "鼓励", favorChange: 3, reason: "好" }],
      chatMessages: [],
    });
    mockedEvent.mockResolvedValue({
      events: [],
      phoneMessages: [],
    });
    mockedNarrative.mockResolvedValue({
      narrative: "入职第一天...",
      choices: [
        { choiceId: "a", label: "认真听", staminaCost: 1, effects: {}, category: "学习" },
        { choiceId: "b", label: "主动社交", staminaCost: 1, effects: {}, category: "社交" },
      ],
    });
  });

  it("processes a critical day choice and returns next day narrative", async () => {
    const state = createNewGame();
    const choice: CriticalChoice = {
      choiceId: "onboard_d1_a",
      label: "认真听培训",
      staminaCost: 1,
      effects: { statChanges: { professional: 2 } },
      category: "学习",
    };

    const result = await runCriticalDayPipeline(state, choice);

    expect(result.narrative).toBeDefined();
    expect(result.state).toBeDefined();
    expect(result.nextChoices).toBeDefined();
  });

  it("advances the critical period day", async () => {
    const state = createNewGame();
    const choice: CriticalChoice = {
      choiceId: "a",
      label: "A",
      staminaCost: 1,
      effects: {},
      category: "学习",
    };

    const result = await runCriticalDayPipeline(state, choice);

    if (!result.isComplete) {
      expect(result.state.criticalPeriod?.currentDay).toBe(2);
    }
  });

  it("signals completion when critical period ends", async () => {
    const state = createNewGame();
    state.criticalPeriod!.currentDay = 5;
    state.criticalPeriod!.maxDays = 5;

    const choice: CriticalChoice = {
      choiceId: "a",
      label: "A",
      staminaCost: 1,
      effects: {},
      category: "学习",
    };

    const result = await runCriticalDayPipeline(state, choice);

    expect(result.isComplete).toBe(true);
    expect(result.state.timeMode).toBe("quarterly");
  });

  it("keeps narrative generation in critical-day mode on the final day, but skips next-day choices", async () => {
    const state = createNewGame();
    state.criticalPeriod!.currentDay = 5;
    state.criticalPeriod!.maxDays = 5;

    const choice: CriticalChoice = {
      choiceId: "final_day",
      label: "完成最后一天",
      staminaCost: 1,
      effects: {},
      category: "表现",
    };

    await runCriticalDayPipeline(state, choice);

    expect(mockedNarrative).toHaveBeenCalledWith(
      expect.objectContaining({
        state: expect.objectContaining({
          timeMode: "critical",
          criticalPeriod: expect.objectContaining({ currentDay: 5 }),
        }),
      }),
      expect.any(Object),
      expect.any(Object),
      expect.any(Object),
      expect.any(Array),
      true,
      expect.stringContaining("完成最后一天"),
      false,
    );
  });

  it("calls NPC, event, and narrative in order", async () => {
    const callOrder: string[] = [];

    mockedNPC.mockImplementation(async () => {
      callOrder.push("npc");
      return { npcActions: [], chatMessages: [] };
    });
    mockedEvent.mockImplementation(async () => {
      callOrder.push("event");
      return { events: [], phoneMessages: [] };
    });
    mockedNarrative.mockImplementation(async () => {
      callOrder.push("narrative");
      return { narrative: "test", choices: [] };
    });

    const state = createNewGame();
    const choice: CriticalChoice = {
      choiceId: "a",
      label: "A",
      staminaCost: 1,
      effects: {},
      category: "学习",
    };

    await runCriticalDayPipeline(state, choice);

    expect(callOrder).toEqual(["npc", "event", "narrative"]);
  });
});
