import { describe, expect, it } from "vitest";

import { migrate } from "@/save/migration";

describe("v1.0 → v1.1 migration", () => {
  const v10State = {
    version: "1.0",
    phase: 1,
    currentQuarter: 0,
    timeMode: "critical",
    criticalPeriod: {
      type: "onboarding",
      currentDay: 1,
      maxDays: 5,
      staminaPerDay: 3,
    },
    player: {
      health: 90,
      professional: 15,
      communication: 20,
      management: 5,
      network: 5,
      mood: 70,
      money: 5000,
      reputation: 0,
    },
    job: {
      companyName: "星辰互联",
      level: "L1",
      salary: 3000,
      careerPath: "undecided",
      quartersAtLevel: 0,
      totalQuarters: 0,
    },
    housing: {
      type: "shared",
      hasMortgage: false,
    },
    npcs: [
      {
        id: "wang",
        name: "王建国",
        role: "领导",
        personality: "test",
        hiddenGoal: "test",
        favor: 50,
        isActive: true,
        currentStatus: "在岗",
      },
    ],
    projectProgress: {
      completed: 0,
      majorCompleted: 0,
      currentProgress: 0,
    },
    performanceWindow: {
      workActionCount: 0,
      quartersInWindow: 0,
      history: [],
    },
    company: null,
    phoneMessages: [],
    history: [],
    world: {
      economyCycle: "stable",
      industryTrends: [],
      companyStatus: "stable",
    },
    staminaRemaining: 3,
    founderSalary: null,
  };

  it("adds all new fields with defaults", () => {
    const result = migrate(v10State, "1.1") as Record<string, unknown>;

    expect(result).not.toBeNull();
    expect(result.version).toBe("1.1");
    expect(result.phase2Path).toBeNull();
    expect(result.executive).toBeNull();
    expect(result.maimaiPosts).toEqual([]);
    expect(result.maimaiPostsThisQuarter).toBe(0);
    expect(result.jobOffers).toEqual([]);
    expect(result.jobHistory).toEqual([]);
  });

  it("adds companyName to all NPCs", () => {
    const result = migrate(v10State, "1.1") as Record<string, unknown>;
    const npcs = result.npcs as Array<Record<string, unknown>>;

    expect(npcs[0].companyName).toBe("星辰互联");
  });
});
