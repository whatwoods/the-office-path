import { describe, expect, it } from "vitest";

import { settleQuarter } from "@/engine/quarter";
import { createNewGame } from "@/engine/state";
import type { QuarterPlan } from "@/types/actions";

function makeQuarterlyState() {
  const state = createNewGame();
  state.timeMode = "quarterly";
  state.criticalPeriod = null;
  state.staminaRemaining = 10;
  return state;
}

describe("settleQuarter", () => {
  it("applies actions and advances the quarter", () => {
    const state = makeQuarterlyState();
    state.currentQuarter = 1;
    state.job.level = "L2";
    state.job.salary = 8000;

    const plan: QuarterPlan = {
      actions: [
        { action: "work_hard" },
        { action: "work_hard" },
        { action: "study", target: "communication" },
        { action: "slack_off" },
      ],
    };

    const result = settleQuarter(state, plan);

    expect(result.state.currentQuarter).toBe(2);
    expect(result.state.player.professional).toBeGreaterThan(state.player.professional);
    expect(result.state.player.communication).toBeGreaterThan(state.player.communication);
    expect(result.state.player.mood).toBeGreaterThan(state.player.mood);
    expect(result.state.player.money).not.toBe(state.player.money);
  });

  it("rejects invalid plans", () => {
    const state = makeQuarterlyState();
    const plan: QuarterPlan = {
      actions: [
        { action: "side_hustle" },
        { action: "side_hustle" },
        { action: "side_hustle" },
        { action: "work_hard" },
      ],
    };

    expect(() => settleQuarter(state, plan)).toThrow("exceeds");
  });

  it("triggers performance review every two quarters", () => {
    const state = makeQuarterlyState();
    state.currentQuarter = 1;
    state.job.level = "L2";
    state.job.salary = 8000;
    state.performanceWindow.workActionCount = 5;
    state.performanceWindow.quartersInWindow = 1;

    const plan: QuarterPlan = {
      actions: [{ action: "work_hard" }, { action: "slack_off" }],
    };

    const result = settleQuarter(state, plan);

    expect(result.state.performanceWindow.history.length).toBe(1);
    expect(result.state.performanceWindow.workActionCount).toBe(0);
    expect(result.state.performanceWindow.quartersInWindow).toBe(0);
    expect(result.performanceRating).toBeDefined();
  });

  it("resets the MaiMai post counter after settlement", () => {
    const state = makeQuarterlyState();
    state.maimaiPostsThisQuarter = 2;

    const plan: QuarterPlan = {
      actions: [{ action: "slack_off" }],
    };

    const result = settleQuarter(state, plan);

    expect(result.state.maimaiPostsThisQuarter).toBe(0);
  });

  it("throws when used for the executive path", () => {
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

    const plan: QuarterPlan = {
      actions: [{ action: "slack_off" }],
    };

    expect(() => settleQuarter(state, plan)).toThrow("Use settleExecutiveQuarter");
  });
});
