import { describe, expect, it } from "vitest";

import {
  JOB_LEVEL_ORDER,
  calculateOfferSalary,
  executeJobHop,
  isLevelDowngrade,
  validateOffer,
} from "@/engine/job-hop";
import { createNewGame } from "@/engine/state";
import type { GameState } from "@/types/game";
import type { JobOffer } from "@/types/job-offer";

describe("JOB_LEVEL_ORDER", () => {
  it("orders levels correctly", () => {
    expect(JOB_LEVEL_ORDER.L1).toBeLessThan(JOB_LEVEL_ORDER.L2);
    expect(JOB_LEVEL_ORDER.L5).toBeLessThan(JOB_LEVEL_ORDER.L6_tech);
    expect(JOB_LEVEL_ORDER.L6_tech).toBe(JOB_LEVEL_ORDER.L6_mgmt);
    expect(JOB_LEVEL_ORDER.L7_tech).toBe(JOB_LEVEL_ORDER.L7_mgmt);
    expect(JOB_LEVEL_ORDER.L7_tech).toBeLessThan(JOB_LEVEL_ORDER.L8);
  });
});

describe("calculateOfferSalary", () => {
  it("applies 15% base premium", () => {
    const result = calculateOfferSalary(10000, 0, 0);

    expect(result).toBe(11500);
  });

  it("adds reputation bonus", () => {
    const result = calculateOfferSalary(10000, 80, 0);

    expect(result).toBe(13900);
  });

  it("adds professional bonus", () => {
    const result = calculateOfferSalary(10000, 0, 80);

    expect(result).toBe(13100);
  });

  it("caps at 50% premium", () => {
    const result = calculateOfferSalary(10000, 100, 100);

    expect(result).toBe(15000);
  });
});

describe("isLevelDowngrade", () => {
  it("returns true for downgrade", () => {
    expect(isLevelDowngrade("L3", "L2")).toBe(true);
  });

  it("returns false for same level", () => {
    expect(isLevelDowngrade("L3", "L3")).toBe(false);
  });

  it("returns false for upgrade", () => {
    expect(isLevelDowngrade("L3", "L4")).toBe(false);
  });

  it("handles tech and management equivalence", () => {
    expect(isLevelDowngrade("L6_tech", "L6_mgmt")).toBe(false);
  });
});

describe("validateOffer", () => {
  it("rejects downgrade offers", () => {
    const offer = { offeredLevel: "L2" as const, offeredSalary: 5000 };

    expect(validateOffer(offer, "L3", 3000, 0, 0).valid).toBe(false);
  });

  it("rejects offers exceeding salary cap", () => {
    const offer = { offeredLevel: "L3" as const, offeredSalary: 99999 };

    expect(validateOffer(offer, "L3", 3000, 0, 0).valid).toBe(false);
  });

  it("accepts valid offers", () => {
    const offer = { offeredLevel: "L3" as const, offeredSalary: 3400 };

    expect(validateOffer(offer, "L3", 3000, 0, 0).valid).toBe(true);
  });
});

describe("executeJobHop", () => {
  function createTestState(): GameState {
    const state = createNewGame();
    state.job.level = "L3";
    state.job.salary = 15000;
    state.job.companyName = "星辰互联";
    state.projectProgress.currentProgress = 0;
    return state;
  }

  const testOffer: JobOffer = {
    id: "offer1",
    companyName: "新公司",
    companyProfile: "test",
    offeredLevel: "L3",
    offeredSalary: 18000,
    companyStatus: "stable",
    expiresAtQuarter: 10,
    negotiated: false,
  };

  it("deactivates all old NPCs and creates new ones", () => {
    const state = createTestState();

    const result = executeJobHop(state, testOffer);
    const oldNpcs = result.npcs.filter((npc) => npc.companyName === "星辰互联");
    const newNpcs = result.npcs.filter((npc) => npc.companyName === "新公司");

    expect(oldNpcs.every((npc) => !npc.isActive)).toBe(true);
    expect(newNpcs).toHaveLength(5);
    expect(newNpcs.every((npc) => npc.isActive)).toBe(true);
  });

  it("updates job state to new company", () => {
    const state = createTestState();

    const result = executeJobHop(state, testOffer);

    expect(result.job.companyName).toBe("新公司");
    expect(result.job.salary).toBe(18000);
    expect(result.job.quartersAtLevel).toBe(0);
    expect(result.job.totalQuarters).toBe(state.job.totalQuarters);
  });

  it("adds past job to history", () => {
    const state = createTestState();

    const result = executeJobHop(state, testOffer);

    expect(result.jobHistory).toHaveLength(1);
    expect(result.jobHistory[0].companyName).toBe("星辰互联");
    expect(result.jobHistory[0].reasonLeft).toBe("job_hop");
  });

  it("penalizes reputation when leaving with active project", () => {
    const state = createTestState();
    state.player.reputation = 20;
    state.projectProgress.currentProgress = 2;

    const result = executeJobHop(state, testOffer);

    expect(result.player.reputation).toBe(10);
  });

  it("enters new_company_onboarding critical period", () => {
    const state = createTestState();

    const result = executeJobHop(state, testOffer);

    expect(result.timeMode).toBe("critical");
    expect(result.criticalPeriod?.type).toBe("new_company_onboarding");
  });
});
