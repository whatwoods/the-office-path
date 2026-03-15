import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/ai/orchestration/quarterly", () => ({
  runQuarterlyPipeline: vi.fn(),
}));
vi.mock("@/ai/orchestration/critical", () => ({
  runCriticalDayPipeline: vi.fn(),
}));

import { runCriticalDayPipeline } from "@/ai/orchestration/critical";
import { runQuarterlyPipeline } from "@/ai/orchestration/quarterly";
import { POST } from "@/app/api/game/turn/route";
import { createNewGame } from "@/engine/state";

const mockedQuarterly = vi.mocked(runQuarterlyPipeline);
const mockedCritical = vi.mocked(runCriticalDayPipeline);

function makeRequest(body: object): Request {
  return new Request("http://localhost/api/game/turn", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/game/turn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when state is missing", async () => {
    const res = await POST(makeRequest({}));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it("dispatches to quarterly pipeline for quarterly mode", async () => {
    const state = createNewGame();
    state.timeMode = "quarterly";
    state.criticalPeriod = null;
    state.staminaRemaining = 10;

    const mockResult = {
      state,
      narrative: "故事",
      worldContext: {} as never,
      events: [],
      npcActions: [],
      phoneMessages: [],
    };
    mockedQuarterly.mockResolvedValueOnce(mockResult);

    const res = await POST(
      makeRequest({
        state,
        plan: {
          actions: [
            { action: "work_hard" },
            { action: "work_hard" },
            { action: "study" },
            { action: "socialize" },
            { action: "slack_off" },
          ],
        },
      }),
    );
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.narrative).toBe("故事");
    expect(mockedQuarterly).toHaveBeenCalledOnce();
  });

  it("dispatches to critical pipeline for critical mode", async () => {
    const state = createNewGame();

    const mockResult = {
      state,
      narrative: "入职第一天",
      isComplete: false,
      npcActions: [],
      nextChoices: [
        {
          choiceId: "a",
          label: "A",
          staminaCost: 1,
          effects: {},
          category: "学习",
        },
      ],
    };
    mockedCritical.mockResolvedValueOnce(mockResult);

    const res = await POST(
      makeRequest({
        state,
        choice: {
          choiceId: "a",
          label: "A",
          staminaCost: 1,
          effects: {},
          category: "学习",
        },
      }),
    );
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.narrative).toBe("入职第一天");
    expect(data.nextChoices).toHaveLength(1);
    expect(mockedCritical).toHaveBeenCalledOnce();
  });

  it("returns 400 when quarterly mode lacks plan", async () => {
    const state = createNewGame();
    state.timeMode = "quarterly";
    state.criticalPeriod = null;

    const res = await POST(makeRequest({ state }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("plan");
  });

  it("returns 400 when critical mode lacks choice", async () => {
    const state = createNewGame();

    const res = await POST(makeRequest({ state }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("choice");
  });
});
