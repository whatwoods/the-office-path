import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/game/new/route";
import { runNarrativeAgent } from "@/ai/agents/narrative";

vi.mock("@/ai/agents/narrative", () => ({
  runNarrativeAgent: vi.fn().mockImplementation(async (...args: unknown[]) => {
    const collector = args[9] as ((usage: unknown) => void) | undefined
    collector?.({
      agent: "narrative",
      model: "openai:gpt-4o",
      inputTokens: 120,
      outputTokens: 80,
      totalTokens: 200,
    })

    return {
      narrative: "你入职了新公司。",
      choices: [
        {
          choiceId: "onboarding_d1_a",
          label: "参加培训",
          staminaCost: 1,
          effects: { statChanges: { professional: 2 } },
          category: "学习",
        },
      ],
    }
  }),
}));

const mockedRunNarrativeAgent = vi.mocked(runNarrativeAgent);

describe("POST /api/game/new", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns narrative and criticalChoices along with new state", async () => {
    const req = new Request("http://localhost/api/game/new", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.state).toBeDefined();
    expect(json.state.timeMode).toBe("critical");
    expect(json.narrative).toBe("你入职了新公司。");
    expect(json.criticalChoices).toBeDefined();
    expect(json.criticalChoices.length).toBe(1);
    expect(json.aiUsage.totalTokens).toBe(200);
  });

  it("creates the selected company and player name from intro params", async () => {
    const req = new Request("http://localhost/api/game/new", {
      method: "POST",
      body: JSON.stringify({ major: "finance", playerName: "小红" }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(json.state.job.companyName).toBe("鼎信金融");
    expect(json.state.playerName).toBe("小红");
    expect(mockedRunNarrativeAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        state: expect.objectContaining({
          playerName: "小红",
          job: expect.objectContaining({ companyName: "鼎信金融" }),
        }),
      }),
      expect.any(Object),
      expect.any(Object),
      expect.any(Object),
      expect.any(Array),
      true,
      "玩家入职了鼎信金融。",
      true,
      undefined,
      expect.any(Function),
    );
  });

  it("passes aiConfig to the narrative agent when provided", async () => {
    const aiConfig = {
      provider: "anthropic" as const,
      apiKey: "sk-new-route",
      modelOverrides: { narrative: "anthropic:claude-sonnet-4-20250514" },
    };
    const req = new Request("http://localhost/api/game/new", {
      method: "POST",
      body: JSON.stringify({ aiConfig, major: "tech", playerName: "小明" }),
    });

    await POST(req);

    expect(mockedRunNarrativeAgent).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Object),
      expect.any(Object),
      expect.any(Object),
      expect.any(Array),
      true,
      "玩家入职了星云科技。",
      true,
      aiConfig,
      expect.any(Function),
    );
  });

  it("returns a JSON 500 response when the narrative agent throws", async () => {
    mockedRunNarrativeAgent.mockRejectedValueOnce(new Error("AI provider missing key"));

    const req = new Request("http://localhost/api/game/new", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.success).toBe(false);
    expect(json.error).toBe("AI provider missing key");
  });
});
