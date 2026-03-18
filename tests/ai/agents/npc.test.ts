import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("ai", () => ({
  generateText: vi.fn(),
  Output: { object: vi.fn(({ schema }: { schema: unknown }) => schema) },
}));

import { generateText } from "ai";

import { runNPCAgent } from "@/ai/agents/npc";
import { createNewGame } from "@/engine/state";
import type {
  AgentInput,
  EventAgentOutput,
  WorldAgentOutput,
} from "@/types/agents";
import type { ActionAllocation } from "@/types/actions";

const mockedGenerateText = vi.mocked(generateText);

function makeInput(): AgentInput {
  return { state: createNewGame(), recentHistory: [] };
}

const worldContext: WorldAgentOutput = {
  economy: "stable",
  trends: [],
  companyStatus: "stable",
  newsItems: [],
};

const eventContext: EventAgentOutput = {
  events: [
    {
      type: "workplace",
      title: "团建",
      description: "公司组织团建",
      severity: "low" as const,
      triggersCritical: false,
    },
  ],
  phoneMessages: [],
};

const playerActions: ActionAllocation[] = [
  { action: "work_hard" },
  { action: "socialize", target: "zhang_wei" },
];

describe("runNPCAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns structured NPC output", async () => {
    const mockOutput = {
      npcActions: [
        {
          npcName: "王建国",
          action: "在周会上点名表扬你",
          dialogue: "最近项目推进得不错",
          favorChange: 5,
          reason: "你埋头工作的表现让他满意",
        },
      ],
      chatMessages: [
        {
          app: "xiaoxin" as const,
          sender: "张伟",
          content: "周五聚餐去不去？",
          replyOptions: ["去！", "这周不行", "下次吧"],
        },
      ],
    };
    mockedGenerateText.mockResolvedValueOnce({ output: mockOutput } as never);

    const result = await runNPCAgent(
      makeInput(),
      worldContext,
      eventContext,
      playerActions,
    );

    expect(result).toEqual(mockOutput);
    expect(mockedGenerateText).toHaveBeenCalledOnce();
  });

  it("includes NPC profiles in prompt", async () => {
    mockedGenerateText.mockResolvedValueOnce({
      output: { npcActions: [], chatMessages: [] },
    } as never);

    await runNPCAgent(makeInput(), worldContext, eventContext, playerActions);

    const call = mockedGenerateText.mock.calls[0][0] as { prompt: string };
    expect(call.prompt).toContain("王建国");
    expect(call.prompt).toContain("张伟");
    expect(call.prompt).toContain("表面和善");
  });

  it("includes player actions and events in prompt", async () => {
    mockedGenerateText.mockResolvedValueOnce({
      output: { npcActions: [], chatMessages: [] },
    } as never);

    await runNPCAgent(makeInput(), worldContext, eventContext, playerActions);

    const call = mockedGenerateText.mock.calls[0][0] as { prompt: string };
    expect(call.prompt).toContain("work_hard");
    expect(call.prompt).toContain("socialize");
    expect(call.prompt).toContain("团建");
  });

  it("includes free-text player context when provided", async () => {
    mockedGenerateText.mockResolvedValueOnce({
      output: { npcActions: [], chatMessages: [] },
    } as never);

    await runNPCAgent(
      makeInput(),
      worldContext,
      eventContext,
      [],
      "玩家选择了：认真听培训（学习）",
    );

    const call = mockedGenerateText.mock.calls[0][0] as { prompt: string };
    expect(call.prompt).toContain("玩家选择了：认真听培训（学习）");
  });

  it("uses deterministic JSON-only settings for structured output", async () => {
    mockedGenerateText.mockResolvedValueOnce({
      output: { npcActions: [], chatMessages: [] },
    } as never);

    await runNPCAgent(makeInput(), worldContext, eventContext, playerActions);

    const call = mockedGenerateText.mock.calls[0][0] as {
      system: string;
      temperature?: number;
    };
    expect(call.temperature).toBe(0);
    expect(call.system).toContain("只返回单个 JSON 对象");
  });

  it("spells out the exact NPC schema fields in the system prompt", async () => {
    mockedGenerateText.mockResolvedValueOnce({
      output: { npcActions: [], chatMessages: [] },
    } as never);

    await runNPCAgent(makeInput(), worldContext, eventContext, playerActions);

    const call = mockedGenerateText.mock.calls[0][0] as { system: string };
    expect(call.system).toContain("npcActions");
    expect(call.system).toContain("chatMessages");
    expect(call.system).toContain("favorChange");
    expect(call.system).toContain("reason");
    expect(call.system).toContain("app");
    expect(call.system).toContain("sender");
  });

  it("spells out chat app enum ids instead of display labels", async () => {
    mockedGenerateText.mockResolvedValueOnce({
      output: { npcActions: [], chatMessages: [] },
    } as never);

    await runNPCAgent(makeInput(), worldContext, eventContext, playerActions);

    const call = mockedGenerateText.mock.calls[0][0] as { system: string };
    expect(call.system).toContain("dingding");
    expect(call.system).toContain("xiaoxin");
  });
});
