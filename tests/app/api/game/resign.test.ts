import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/game/resign/route";
import { runNarrativeAgent } from "@/ai/agents/narrative";
import { createNewGame } from "@/engine/state";

vi.mock("@/ai/agents/narrative", () => ({
  runNarrativeAgent: vi.fn().mockResolvedValue({
    narrative: "你决定离职创业。",
    choices: [
      {
        choiceId: "startup_launch_d1_a",
        label: "注册公司",
        staminaCost: 1,
        effects: { statChanges: { professional: 2 } },
        category: "搭建",
      },
    ],
  }),
}));

const mockedRunNarrativeAgent = vi.mocked(runNarrativeAgent);

describe("POST /api/game/resign", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("eligible level returns 200 with state, narrative and criticalChoices", async () => {
    const state = createNewGame();
    state.job.level = "L8";

    const req = new Request("http://localhost/api/game/resign", {
      method: "POST",
      body: JSON.stringify({ state }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.state.phase).toBe(2);
    expect(json.state.timeMode).toBe("critical");
    expect(json.narrative).toBe("你决定离职创业。");
    expect(json.criticalChoices).toBeDefined();
    expect(json.criticalChoices.length).toBe(1);
    expect(json.criticalChoices[0].label).toBe("注册公司");
  });

  it("ineligible level returns 400", async () => {
    const state = createNewGame();
    state.job.level = "L1";

    const req = new Request("http://localhost/api/game/resign", {
      method: "POST",
      body: JSON.stringify({ state }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toBe("等级不足以创业");
  });

  it("supports the executive path when requested", async () => {
    const state = createNewGame();
    state.job.level = "L8";

    const req = new Request("http://localhost/api/game/resign", {
      method: "POST",
      body: JSON.stringify({ state, path: "executive" }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.state.phase2Path).toBe("executive");
    expect(json.state.executive?.stage).toBe("E1");
    expect(json.state.criticalPeriod?.type).toBe("executive_onboarding");
  });

  it("passes aiConfig to the startup narrative agent when provided", async () => {
    const state = createNewGame();
    state.job.level = "L8";
    const aiConfig = {
      provider: "anthropic" as const,
      apiKey: "sk-resign-route",
      modelOverrides: {},
    };

    const req = new Request("http://localhost/api/game/resign", {
      method: "POST",
      body: JSON.stringify({ state, aiConfig }),
    });

    await POST(req);

    expect(mockedRunNarrativeAgent).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Object),
      expect.any(Object),
      expect.any(Object),
      expect.any(Array),
      true,
      "玩家离职创业了。",
      true,
      aiConfig,
    );
  });
});
