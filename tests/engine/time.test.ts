import { describe, expect, it } from "vitest";

import {
  advanceCriticalDay,
  advanceQuarter,
  CRITICAL_PERIOD_CONFIG,
  enterCriticalPeriod,
  getMaxStamina,
} from "@/engine/time";

describe("advanceQuarter", () => {
  it("increments quarter numbers", () => {
    expect(advanceQuarter(1)).toBe(2);
    expect(advanceQuarter(10)).toBe(11);
  });
});

describe("getMaxStamina", () => {
  it("returns 10 for quarterly mode", () => {
    expect(getMaxStamina("quarterly", "shared")).toBe(10);
  });

  it("returns 9 for slum housing in quarterly mode", () => {
    expect(getMaxStamina("quarterly", "slum")).toBe(9);
  });

  it("returns 3 for critical mode", () => {
    expect(getMaxStamina("critical", "shared")).toBe(3);
  });
});

describe("enterCriticalPeriod", () => {
  it("creates a critical period from config", () => {
    const criticalPeriod = enterCriticalPeriod("promotion_review");

    expect(criticalPeriod.type).toBe("promotion_review");
    expect(criticalPeriod.currentDay).toBe(1);
    expect(criticalPeriod.maxDays).toBe(3);
    expect(criticalPeriod.staminaPerDay).toBe(3);
  });
});

describe("advanceCriticalDay", () => {
  it("increments the day while incomplete", () => {
    const result = advanceCriticalDay({
      type: "promotion_review",
      currentDay: 1,
      maxDays: 3,
      staminaPerDay: 3,
    });

    expect(result.period.currentDay).toBe(2);
    expect(result.isComplete).toBe(false);
  });

  it("marks the period complete at max day", () => {
    const result = advanceCriticalDay({
      type: "promotion_review",
      currentDay: 3,
      maxDays: 3,
      staminaPerDay: 3,
    });

    expect(result.isComplete).toBe(true);
    expect(result.period.currentDay).toBe(3);
  });
});

describe("CRITICAL_PERIOD_CONFIG", () => {
  it("contains the expected durations", () => {
    expect(CRITICAL_PERIOD_CONFIG.onboarding.maxDays).toBe(5);
    expect(CRITICAL_PERIOD_CONFIG.promotion_review.maxDays).toBe(3);
    expect(CRITICAL_PERIOD_CONFIG.ipo_review.maxDays).toBe(10);
  });
});

describe("executive critical periods", () => {
  it("has config for all new critical period types", () => {
    expect(CRITICAL_PERIOD_CONFIG.executive_onboarding).toEqual({ maxDays: 3 });
    expect(CRITICAL_PERIOD_CONFIG.board_review).toEqual({ maxDays: 3 });
    expect(CRITICAL_PERIOD_CONFIG.power_struggle).toEqual({ maxDays: 5 });
    expect(CRITICAL_PERIOD_CONFIG.major_decision).toEqual({ maxDays: 5 });
    expect(CRITICAL_PERIOD_CONFIG.power_transition).toEqual({ maxDays: 7 });
    expect(CRITICAL_PERIOD_CONFIG.new_company_onboarding).toEqual({
      maxDays: 3,
    });
  });

  it("returns stamina 10 for executives regardless of housing", () => {
    expect(getMaxStamina("quarterly", "slum", "executive")).toBe(10);
    expect(getMaxStamina("quarterly", "shared", "executive")).toBe(10);
  });
});
