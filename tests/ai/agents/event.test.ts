import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("ai", () => ({
  generateText: vi.fn(),
  Output: { object: vi.fn(({ schema }: { schema: unknown }) => schema) },
}));

import { generateText } from "ai";

import { runEventAgent } from "@/ai/agents/event";
import type { AgentInput, WorldAgentOutput } from "@/types/agents";
import { createNewGame } from "@/engine/state";

const mockedGenerateText = vi.mocked(generateText);

function makeInput(): AgentInput {
  return { state: createNewGame(), recentHistory: [] };
}

const worldContext: WorldAgentOutput = {
  economy: "stable",
  trends: ["AI行业持续发展"],
  companyStatus: "expanding",
  newsItems: ["某大厂裁员"],
};

describe("runEventAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns structured event output", async () => {
    const mockOutput = {
      events: [
        {
          type: "workplace",
          title: "新项目启动",
          description: "团队接到一个重要项目",
          severity: "medium" as const,
          triggersCritical: false,
        },
      ],
      phoneMessages: [
        {
          app: "maimai" as const,
          content: "听说公司要扩招了",
        },
      ],
    };
    mockedGenerateText.mockResolvedValueOnce({ output: mockOutput } as never);

    const result = await runEventAgent(makeInput(), worldContext);

    expect(result).toEqual(mockOutput);
    expect(mockedGenerateText).toHaveBeenCalledOnce();
  });

  it("includes world context in prompt", async () => {
    mockedGenerateText.mockResolvedValueOnce({
      output: { events: [], phoneMessages: [] },
    } as never);

    await runEventAgent(makeInput(), worldContext);

    const call = mockedGenerateText.mock.calls[0][0] as { prompt: string };
    expect(call.prompt).toContain("stable");
    expect(call.prompt).toContain("expanding");
  });

  it("references player stats for event targeting", async () => {
    const input = makeInput();
    input.state.player.health = 20;
    mockedGenerateText.mockResolvedValueOnce({
      output: { events: [], phoneMessages: [] },
    } as never);

    await runEventAgent(input, worldContext);

    const call = mockedGenerateText.mock.calls[0][0] as { prompt: string };
    expect(call.prompt).toContain("20");
  });

  it("uses deterministic JSON-only settings for structured output", async () => {
    mockedGenerateText.mockResolvedValueOnce({
      output: { events: [], phoneMessages: [] },
    } as never);

    await runEventAgent(makeInput(), worldContext);

    const call = mockedGenerateText.mock.calls[0][0] as {
      system: string;
      temperature?: number;
    };
    expect(call.temperature).toBe(0);
    expect(call.system).toContain("只返回单个 JSON 对象");
  });

  it("omits maimai instructions when there is no maimai activity", async () => {
    mockedGenerateText.mockResolvedValueOnce({
      output: { events: [], phoneMessages: [] },
    } as never);

    await runEventAgent(makeInput(), worldContext);

    const call = mockedGenerateText.mock.calls[0][0] as { system: string };
    expect(call.system).not.toContain("麦麦帖子后果分析");
  });

  it("includes maimai instructions only when maimai activity exists", async () => {
    mockedGenerateText.mockResolvedValueOnce({
      output: { events: [], phoneMessages: [] },
    } as never);

    const input = makeInput();
    input.maimaiActivity = {
      playerPosts: [
        {
          id: "post_1",
          quarter: 0,
          author: "player",
          content: "这公司也太卷了",
          likes: 0,
          playerLiked: false,
          comments: [],
        },
      ],
      playerLikes: [],
      playerComments: [],
    };

    await runEventAgent(input, worldContext);

    const call = mockedGenerateText.mock.calls[0][0] as { system: string };
    expect(call.system).toContain("麦麦帖子后果分析");
  });

  it("spells out the exact event schema fields and app enum ids", async () => {
    mockedGenerateText.mockResolvedValueOnce({
      output: { events: [], phoneMessages: [] },
    } as never);

    await runEventAgent(makeInput(), worldContext);

    const call = mockedGenerateText.mock.calls[0][0] as { system: string };
    expect(call.system).toContain("events");
    expect(call.system).toContain("phoneMessages");
    expect(call.system).toContain("app");
    expect(call.system).toContain("sender");
    expect(call.system).toContain("content");
    expect(call.system).toContain("dingding");
    expect(call.system).toContain("maimai");
  });
});
