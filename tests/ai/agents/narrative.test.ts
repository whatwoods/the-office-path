import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("ai", () => ({
  generateText: vi.fn(),
  Output: { object: vi.fn(({ schema }: { schema: unknown }) => schema) },
}));

import { generateText } from "ai";

import { runNarrativeAgent } from "@/ai/agents/narrative";
import { createNewGame } from "@/engine/state";
import type {
  AgentInput,
  EventAgentOutput,
  NPCAgentOutput,
  WorldAgentOutput,
} from "@/types/agents";
import type { ActionAllocation } from "@/types/actions";

const mockedGenerateText = vi.mocked(generateText);

function makeInput(): AgentInput {
  return { state: createNewGame(), recentHistory: [] };
}

const worldCtx: WorldAgentOutput = {
  economy: "stable",
  trends: ["AI发展"],
  companyStatus: "expanding",
  newsItems: [],
};

const eventCtx: EventAgentOutput = {
  events: [
    {
      type: "workplace",
      title: "团建",
      description: "去爬山",
      severity: "low" as const,
      triggersCritical: false,
    },
  ],
  phoneMessages: [],
};

const npcCtx: NPCAgentOutput = {
  npcActions: [
    {
      npcName: "王建国",
      action: "表扬你",
      favorChange: 5,
      reason: "工作好",
    },
  ],
  chatMessages: [],
};

const actions: ActionAllocation[] = [{ action: "work_hard" }, { action: "study" }];

describe("runNarrativeAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates quarterly narrative with summary", async () => {
    const mockOutput = {
      narrative: "这个季度你埋头苦干，终于完成了第一个独立模块...",
      narrativeSummary: "完成第一个独立模块，工作步入正轨",
    };
    mockedGenerateText.mockResolvedValueOnce({ output: mockOutput } as never);

    const result = await runNarrativeAgent(
      makeInput(),
      worldCtx,
      eventCtx,
      npcCtx,
      actions,
      false,
    );

    expect(result.narrativeSummary).toBe("完成第一个独立模块，工作步入正轨");
    expect(result.choices).toBeUndefined();
  });

  it("generates critical period narrative with choices", async () => {
    const input = makeInput();
    const mockOutput = {
      narrative: "入职第一天，你走进星辰互联的大门...",
      choices: [
        {
          choiceId: "onboard_d1_a",
          label: "认真听培训",
          staminaCost: 1,
          effects: { statChanges: { professional: 2 } },
          category: "学习",
        },
        {
          choiceId: "onboard_d1_b",
          label: "主动请同事吃饭",
          staminaCost: 1,
          effects: { npcFavorChanges: { 张伟: 10 } },
          category: "社交",
        },
        {
          choiceId: "onboard_d1_c",
          label: "加班表现积极",
          staminaCost: 2,
          effects: {
            statChanges: { professional: 3 },
            riskEvent: {
              probability: 0.2,
              description: "太紧张，第一天就出错",
            },
          },
          category: "表现",
        },
      ],
    };
    mockedGenerateText.mockResolvedValueOnce({ output: mockOutput } as never);

    const result = await runNarrativeAgent(
      input,
      worldCtx,
      eventCtx,
      npcCtx,
      actions,
      true,
    );

    expect(result.choices).toHaveLength(3);
    expect(result.choices?.[0].category).toBe("学习");
  });

  it("includes all agent outputs in its prompt", async () => {
    mockedGenerateText.mockResolvedValueOnce({
      output: { narrative: "test" },
    } as never);

    await runNarrativeAgent(
      makeInput(),
      worldCtx,
      eventCtx,
      npcCtx,
      actions,
      false,
    );

    const call = mockedGenerateText.mock.calls[0][0] as { prompt: string };
    expect(call.prompt).toContain("团建");
    expect(call.prompt).toContain("王建国");
    expect(call.prompt).toContain("work_hard");
    expect(call.prompt).toContain("expanding");
  });

  it("can skip choices on the final critical day", async () => {
    mockedGenerateText.mockResolvedValueOnce({
      output: { narrative: "你终于完成了入职关键期的最后一天。" },
    } as never);

    await runNarrativeAgent(
      makeInput(),
      worldCtx,
      eventCtx,
      npcCtx,
      actions,
      true,
      "完成最后一天",
      false,
    );

    const call = mockedGenerateText.mock.calls[0][0] as {
      system: string;
      prompt: string;
    };
    expect(call.system).toContain("不要生成choices");
    expect(call.prompt).toContain("完成最后一天");
  });
});
