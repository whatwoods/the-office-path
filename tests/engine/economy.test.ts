import { describe, expect, it } from "vitest";

import {
  applyQuarterlyEconomy,
  calculateQuarterlyExpenses,
  calculateQuarterlyIncome,
  isBroke,
} from "@/engine/economy";

describe("calculateQuarterlyIncome", () => {
  it("returns salary multiplied by three", () => {
    expect(calculateQuarterlyIncome(8000)).toBe(24000);
    expect(calculateQuarterlyIncome(15000)).toBe(45000);
  });
});

describe("calculateQuarterlyExpenses", () => {
  it("calculates shared-housing expenses", () => {
    const result = calculateQuarterlyExpenses("shared");

    expect(result.total).toBe(12000);
    expect(result.rent).toBe(6000);
  });

  it("adds extra transport cost for slum housing", () => {
    const result = calculateQuarterlyExpenses("slum");

    expect(result.transport).toBe(2000);
    expect(result.total).toBe(8900);
  });

  it("includes mortgage payments for owned housing", () => {
    const result = calculateQuarterlyExpenses("owned");

    expect(result.rent).toBe(60000);
  });
});

describe("applyQuarterlyEconomy", () => {
  it("returns the correct net change", () => {
    const result = applyQuarterlyEconomy(15000, "shared");

    expect(result.net).toBe(33000);
  });
});

describe("isBroke", () => {
  it("returns true for negative balances", () => {
    expect(isBroke(-100)).toBe(true);
  });

  it("returns false for positive balances", () => {
    expect(isBroke(5000)).toBe(false);
  });

  it("returns false for zero", () => {
    expect(isBroke(0)).toBe(false);
  });
});
