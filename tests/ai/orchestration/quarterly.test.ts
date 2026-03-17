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
import type { ExecutiveQuarterPlan } from "@/types/executive";
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
      undefined
    );
  });

  it("applies game engine settlement to the returned state", async () => {
    const state = makeQuarterlyState();
    const result = await runQuarterlyPipeline(state, plan);

    expect(result.state.currentQuarter).toBeGreaterThan(state.currentQuarter);
  });

  it("processes MaiMai consequences returned by the event agent", async () => {
    const state = makeQuarterlyState();
    state.maimaiPosts = [
      {
        id: "post-1",
        quarter: 1,
        author: "player",
        content: "这家公司管理真有问题",
        likes: 0,
        playerLiked: false,
        comments: [],
      },
    ];
    state.player.reputation = 10;
    mockedNPC.mockResolvedValueOnce({
      npcActions: [],
      chatMessages: [],
    });

    mockedEvent.mockResolvedValueOnce({
      events: [],
      phoneMessages: [],
      maimaiResults: {
        postResults: [
          {
            postId: "post-1",
            aiAnalysis: "匿名吐槽在圈内小范围发酵",
            viralLevel: "small_buzz",
            consequences: {
              playerEffects: { reputation: 5 },
              npcReactions: [{ npcName: "王建国", favorChange: -5 }],
              identityExposed: true,
              exposedTo: ["王建国"],
            },
            generatedReplies: [{ sender: "匿名用户A", content: "确实离谱" }],
          },
        ],
        interactionResults: [],
      },
    });

    const result = await runQuarterlyPipeline(state, plan);
    const post = result.state.maimaiPosts.find((entry) => entry.id === "post-1");
    const leader = result.state.npcs.find((npc) => npc.name === "王建国");

    expect(post?.viralLevel).toBe("small_buzz");
    expect(post?.identityExposed).toBe(true);
    expect(post?.comments.some((comment) => comment.content === "确实离谱")).toBe(true);
    expect(result.state.player.reputation).toBeGreaterThan(state.player.reputation);
    expect(leader?.favor).toBeLessThan(50);
  });

  it("routes executive states through the executive quarterly engine", async () => {
    const state = makeQuarterlyState();
    state.phase = 2;
    state.phase2Path = "executive";
    state.executive = {
      stage: "E1",
      departmentPerformance: 50,
      boardSupport: 40,
      teamLoyalty: 60,
      politicalCapital: 20,
      stockPrice: 100,
      departmentCount: 1,
      consecutiveLowPerformance: 0,
      vestedShares: 0,
      onTargetQuarters: 0,
    };

    const executivePlan: ExecutiveQuarterPlan = {
      actions: [{ action: "push_business" }, { action: "rest" }],
    };

    const result = await runQuarterlyPipeline(
      state,
      executivePlan as unknown as QuarterPlan,
    );

    expect(result.state.currentQuarter).toBeGreaterThan(state.currentQuarter);
    expect(result.state.executive?.departmentPerformance).toBeGreaterThan(50);
  });
});
