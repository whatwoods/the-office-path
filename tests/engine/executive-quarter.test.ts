import { describe, expect, it } from "vitest";

import {
  calculateStockPriceChange,
  settleExecutiveQuarter,
} from "@/engine/executive-quarter";
import { createNewGame } from "@/engine/state";

describe("calculateStockPriceChange", () => {
  it("applies base volatility and department performance coefficient", () => {
    const change = calculateStockPriceChange(100, 70, "stable", () => 0.5);

    expect(change).toBeCloseTo(2, 0);
  });

  it("applies economy coefficient", () => {
    const boom = calculateStockPriceChange(100, 50, "boom", () => 0.5);
    const winter = calculateStockPriceChange(100, 50, "winter", () => 0.5);

    expect(boom).toBeGreaterThan(winter);
  });
});

describe("settleExecutiveQuarter", () => {
  it("processes actions and pays executive salary", () => {
    const state = createNewGame();
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

    const plan = {
      actions: [{ action: "push_business" as const }, { action: "rest" as const }],
    };

    const result = settleExecutiveQuarter(state, plan);

    expect(result.state.player.money).toBeGreaterThan(state.player.money);
    expect(result.state.executive?.departmentPerformance).toBeGreaterThan(50);
  });
});
