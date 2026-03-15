import { describe, expect, it } from "vitest";

import {
  calculatePerformance,
  getPerformanceEffects,
  meetsL3ToL4Performance,
  meetsPromotionPerformance,
  ratingToScore,
} from "@/engine/performance";

describe("calculatePerformance", () => {
  it("returns S for a very high score", () => {
    expect(calculatePerformance(8, 80, 0)).toBe("S");
  });

  it("returns C for low output", () => {
    expect(calculatePerformance(0, 10, 0)).toBe("C");
  });

  it("returns B+ for moderate work", () => {
    expect(calculatePerformance(3, 50, 0)).toBe("B+");
  });
});

describe("meetsPromotionPerformance", () => {
  it("accepts ratings at or above B+", () => {
    expect(meetsPromotionPerformance(["S", "A"], 2)).toBe(true);
    expect(meetsPromotionPerformance(["B+", "B+"], 2)).toBe(true);
    expect(meetsPromotionPerformance(["S", "B+", "A"], 3)).toBe(true);
  });

  it("rejects B and C ratings", () => {
    expect(meetsPromotionPerformance(["A", "B"], 2)).toBe(false);
    expect(meetsPromotionPerformance(["B+", "C"], 2)).toBe(false);
  });

  it("checks only the last N ratings", () => {
    expect(meetsPromotionPerformance(["B", "A", "A"], 2)).toBe(true);
    expect(meetsPromotionPerformance(["A", "A", "B"], 2)).toBe(false);
  });
});

describe("meetsL3ToL4Performance", () => {
  it("passes with one A or S in the last two reviews", () => {
    expect(meetsL3ToL4Performance(["B", "A"])).toBe(true);
    expect(meetsL3ToL4Performance(["S", "B"])).toBe(true);
  });

  it("passes with two B+ ratings", () => {
    expect(meetsL3ToL4Performance(["B+", "B+"])).toBe(true);
  });

  it("fails without enough strong results", () => {
    expect(meetsL3ToL4Performance(["B+", "B"])).toBe(false);
    expect(meetsL3ToL4Performance(["B", "B"])).toBe(false);
    expect(meetsL3ToL4Performance(["C", "B"])).toBe(false);
  });
});

describe("ratingToScore", () => {
  it("maps ratings to ordinals", () => {
    expect(ratingToScore("S")).toBe(5);
    expect(ratingToScore("A")).toBe(4);
    expect(ratingToScore("B+")).toBe(3);
    expect(ratingToScore("B")).toBe(2);
    expect(ratingToScore("C")).toBe(1);
  });
});

describe("getPerformanceEffects", () => {
  it("returns S-tier rewards", () => {
    const effects = getPerformanceEffects("S");

    expect(effects.salaryMultiplier).toBe(1.15);
    expect(effects.reputationChange).toBe(5);
    expect(effects.warning).toBe(false);
  });

  it("returns a warning for C", () => {
    const effects = getPerformanceEffects("C");

    expect(effects.salaryMultiplier).toBe(1);
    expect(effects.warning).toBe(true);
  });

  it("returns B+ rewards", () => {
    const effects = getPerformanceEffects("B+");

    expect(effects.salaryMultiplier).toBe(1.05);
    expect(effects.reputationChange).toBe(0);
  });
});
