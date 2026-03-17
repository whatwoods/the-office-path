import { describe, expect, it } from "vitest";

import {
  checkExecutiveFailure,
  checkExecutivePromotion,
} from "@/engine/executive-promotion";
import type { ExecutiveState } from "@/types/executive";

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

describe("checkExecutiveFailure", () => {
  it("fires when boardSupport reaches zero", () => {
    const executive = { ...baseExec, boardSupport: 0 };

    const result = checkExecutiveFailure(executive);

    expect(result.failed).toBe(true);
    expect(result.reason).toContain("board");
  });

  it("fails after two consecutive low-performance quarters", () => {
    const executive = { ...baseExec, consecutiveLowPerformance: 2 };

    const result = checkExecutiveFailure(executive);

    expect(result.failed).toBe(true);
    expect(result.reason).toContain("performance");
  });

  it("does not fail in a normal state", () => {
    expect(checkExecutiveFailure(baseExec).failed).toBe(false);
  });
});

describe("checkExecutivePromotion", () => {
  it("marks E1 to E2 eligible after 3 on-target quarters and enough board support", () => {
    const executive = {
      ...baseExec,
      boardSupport: 55,
      departmentCount: 1,
      onTargetQuarters: 3,
    };

    const result = checkExecutivePromotion(executive, 3);

    expect(result.eligible).toBe(true);
    expect(result.nextStage).toBe("E2");
  });

  it("does not allow E1 to E2 if board support is too low", () => {
    const executive = { ...baseExec, onTargetQuarters: 3 };

    const result = checkExecutivePromotion(executive, 3);

    expect(result.eligible).toBe(false);
  });
});
