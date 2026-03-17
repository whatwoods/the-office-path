import { describe, expect, it } from "vitest";

import { migrate } from "@/save/migration";

describe("v1.1 → v1.2 migration", () => {
  const v11State = {
    version: "1.1",
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
        companyName: "星辰互联",
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
    phase2Path: null,
    executive: null,
    maimaiPosts: [],
    maimaiPostsThisQuarter: 0,
    jobOffers: [],
    jobHistory: [],
  };

  it("adds a default playerName for old saves", () => {
    const result = migrate(v11State, "1.2") as Record<string, unknown>;

    expect(result.version).toBe("1.2");
    expect(result.playerName).toBe("新员工");
  });
});
