import { describe, expect, it } from "vitest";

import {
  processExecutiveAction,
  validateExecutivePlan,
} from "@/engine/executive-actions";
import type { ExecutiveState } from "@/types/executive";
import type { PlayerAttributes } from "@/types/game";

const baseExec: ExecutiveState = {
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

const basePlayer: PlayerAttributes = {
  health: 80,
  professional: 60,
  communication: 50,
  management: 40,
  network: 30,
  mood: 60,
  money: 500000,
  reputation: 40,
};

describe("processExecutiveAction", () => {
  it("push_business increases departmentPerformance by 5", () => {
    const result = processExecutiveAction(baseExec, basePlayer, {
      action: "push_business",
    });

    expect(result.executiveChanges.departmentPerformance).toBe(5);
    expect(result.playerChanges.health).toBe(-1);
  });

  it("manage_board increases boardSupport by 8", () => {
    const result = processExecutiveAction(baseExec, basePlayer, {
      action: "manage_board",
    });

    expect(result.executiveChanges.boardSupport).toBe(8);
    expect(result.playerChanges.communication).toBe(1);
  });

  it("rest gives health and mood recovery", () => {
    const result = processExecutiveAction(baseExec, basePlayer, {
      action: "rest",
    });

    expect(result.playerChanges.health).toBe(3);
    expect(result.playerChanges.mood).toBe(8);
  });
});

describe("validateExecutivePlan", () => {
  it("accepts a plan within the stamina budget", () => {
    const plan = {
      actions: [{ action: "push_business" as const }, { action: "rest" as const }],
    };

    expect(validateExecutivePlan(plan, 10).valid).toBe(true);
  });

  it("rejects a plan that exceeds the stamina budget", () => {
    const plan = {
      actions: Array(6).fill({ action: "push_business" as const }),
    };

    expect(validateExecutivePlan(plan, 10).valid).toBe(false);
  });
});
