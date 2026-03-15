import { describe, expect, it } from "vitest";

import { INITIAL_ATTRIBUTES } from "@/engine/attributes";
import { checkPromotion, getNextLevels } from "@/engine/promotion";
import type { GameState } from "@/types/game";

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: "1.0",
    phase: 1,
    currentQuarter: 4,
    timeMode: "quarterly",
    criticalPeriod: null,
    player: { ...INITIAL_ATTRIBUTES },
    job: {
      companyName: "TestCorp",
      level: "L2",
      salary: 8000,
      careerPath: "undecided",
      quartersAtLevel: 3,
      totalQuarters: 4,
    },
    housing: { type: "shared", hasMortgage: false },
    npcs: [],
    projectProgress: { completed: 2, majorCompleted: 0, currentProgress: 0 },
    performanceWindow: { workActionCount: 0, quartersInWindow: 0, history: [] },
    company: null,
    phoneMessages: [],
    history: [],
    world: { economyCycle: "stable", industryTrends: [], companyStatus: "stable" },
    staminaRemaining: 10,
    founderSalary: null,
    ...overrides,
  };
}

describe("checkPromotion", () => {
  it("passes L2 to L3 when all conditions are met", () => {
    const state = makeState({
      player: { ...INITIAL_ATTRIBUTES, professional: 35 },
      job: {
        companyName: "X",
        level: "L2",
        salary: 8000,
        careerPath: "undecided",
        quartersAtLevel: 3,
        totalQuarters: 3,
      },
      projectProgress: { completed: 3, majorCompleted: 0, currentProgress: 0 },
    });

    const result = checkPromotion(state);

    expect(result.eligible).toBe(true);
    expect(result.nextLevels).toContain("L3");
  });

  it("fails L2 to L3 when professional ability is too low", () => {
    const state = makeState({
      player: { ...INITIAL_ATTRIBUTES, professional: 20 },
      projectProgress: { completed: 3, majorCompleted: 0, currentProgress: 0 },
    });

    expect(checkPromotion(state).eligible).toBe(false);
  });

  it("returns both L6 options from L5 when both paths qualify", () => {
    const state = makeState({
      player: {
        ...INITIAL_ATTRIBUTES,
        professional: 75,
        communication: 55,
        management: 45,
        network: 35,
        reputation: 35,
      },
      job: {
        companyName: "X",
        level: "L5",
        salary: 35000,
        careerPath: "undecided",
        quartersAtLevel: 4,
        totalQuarters: 12,
      },
      projectProgress: { completed: 5, majorCompleted: 1, currentProgress: 0 },
      performanceWindow: {
        workActionCount: 0,
        quartersInWindow: 0,
        history: ["A", "A"],
      },
      npcs: [
        {
          id: "leader",
          name: "王建国",
          role: "直属领导",
          personality: "",
          hiddenGoal: "",
          favor: 65,
          isActive: true,
          currentStatus: "在岗",
        },
      ],
    });

    const result = checkPromotion(state);

    expect(result.eligible).toBe(true);
    expect(result.nextLevels).toContain("L6_tech");
    expect(result.nextLevels).toContain("L6_mgmt");
  });
});

describe("getNextLevels", () => {
  it("returns the correct next levels", () => {
    expect(getNextLevels("L1")).toEqual(["L2"]);
    expect(getNextLevels("L4")).toEqual(["L5"]);
    expect(getNextLevels("L5")).toEqual(["L6_tech", "L6_mgmt"]);
    expect(getNextLevels("L8")).toEqual([]);
  });
});
