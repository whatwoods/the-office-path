import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("ai", () => ({
  generateText: vi.fn(),
  Output: { object: vi.fn(({ schema }: { schema: unknown }) => schema) },
}));

import { generateText } from "ai";

import { runWorldAgent } from "@/ai/agents/world";
import { createRequestContext } from "@/lib/observability/request-context";
import type { AgentInput } from "@/types/agents";
import { createNewGame } from "@/engine/state";
import { captureObservabilityLogs } from "../../helpers/observability";

const mockedGenerateText = vi.mocked(generateText);

function makeInput(): AgentInput {
  return { state: createNewGame(), recentHistory: [] };
}

describe("runWorldAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns structured world output", async () => {
    const mockOutput = {
      economy: "stable" as const,
      trends: ["AI技术持续发展"],
      companyStatus: "expanding" as const,
      newsItems: ["星辰互联获得新一轮融资"],
    };
    mockedGenerateText.mockResolvedValueOnce({ output: mockOutput } as never);

    const result = await runWorldAgent(makeInput());

    expect(result).toEqual(mockOutput);
    expect(mockedGenerateText).toHaveBeenCalledOnce();
  });

  it("logs model and aiUsage for successful world-agent calls", async () => {
    mockedGenerateText.mockResolvedValueOnce({
      output: {
        economy: "stable",
        trends: [],
        companyStatus: "stable",
        newsItems: [],
      },
      usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
    } as never);

    const logs = captureObservabilityLogs();
    const ctx = createRequestContext("/api/game/turn", "POST");

    await runWorldAgent(makeInput(), undefined, undefined, ctx);

    const parsed = logs.all();
    expect(
      parsed.some((entry) => entry.step === "run_world_agent" && entry.event === "step.finish"),
    ).toBe(true);
    expect(parsed.some((entry) => entry.model === "openai:gpt-4o-mini")).toBe(true);
    logs.restore();
  });

  it("passes game phase info in the prompt", async () => {
    const mockOutput = {
      economy: "winter" as const,
      trends: [],
      companyStatus: "shrinking" as const,
      newsItems: [],
    };
    mockedGenerateText.mockResolvedValueOnce({ output: mockOutput } as never);

    await runWorldAgent(makeInput());

    const call = mockedGenerateText.mock.calls[0][0] as {
      system: string;
      prompt: string;
    };
    expect(call.system).toContain("第1阶段");
    expect(call.prompt).toContain(makeInput().state.job.companyName);
  });

  it("adjusts prompt for phase 2", async () => {
    const input = makeInput();
    input.state.phase = 2;
    input.state.company = {
      stage: "garage",
      productQuality: 30,
      teamSatisfaction: 70,
      customerCount: 0,
      brandAwareness: 0,
      employeeCount: 0,
      quarterlyRevenue: 0,
      quarterlyExpenses: 0,
      cashFlow: 0,
      valuation: 0,
      officeType: "home",
      founderEquity: 100,
      consecutiveNegativeCashFlow: 0,
      consecutiveProfitableQuarters: 0,
      hasSeriesAFunding: false,
      annualGrowthRate: 0,
    };
    const mockOutput = {
      economy: "boom" as const,
      trends: ["创业热潮"],
      companyStatus: "expanding" as const,
      newsItems: [],
    };
    mockedGenerateText.mockResolvedValueOnce({ output: mockOutput } as never);

    await runWorldAgent(input);

    const call = mockedGenerateText.mock.calls[0][0] as { system: string };
    expect(call.system).toContain("第2阶段");
  });
});
