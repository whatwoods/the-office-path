import { describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/game/new/route";

vi.mock("@/ai/agents/narrative", () => ({
  runNarrativeAgent: vi.fn().mockResolvedValue({
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
  }),
}));

describe("POST /api/game/new", () => {
  it("returns narrative and criticalChoices along with new state", async () => {
    const res = await POST();
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.state).toBeDefined();
    expect(json.state.timeMode).toBe("critical");
    expect(json.narrative).toBe("你入职了新公司。");
    expect(json.criticalChoices).toBeDefined();
    expect(json.criticalChoices.length).toBe(1);
  });
});
