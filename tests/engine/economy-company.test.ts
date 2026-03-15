import { describe, expect, it } from "vitest";

import {
  applyTeamSatisfactionDecay,
  calculateQuarterlyCompanyExpenses,
  calculateQuarterlyRevenue,
  calculateValuation,
  checkCompanyUpgrade,
  processCompanyAction,
} from "@/engine/economy-company";
import type { CompanyState } from "@/types/company";

function makeCompany(overrides: Partial<CompanyState> = {}): CompanyState {
  return {
    stage: "garage",
    productQuality: 50,
    teamSatisfaction: 60,
    customerCount: 5,
    brandAwareness: 10,
    employeeCount: 2,
    quarterlyRevenue: 0,
    quarterlyExpenses: 0,
    cashFlow: 0,
    valuation: 0,
    officeType: "home",
    founderEquity: 100,
    consecutiveNegativeCashFlow: 0,
    consecutiveProfitableQuarters: 0,
    hasSeriesAFunding: false,
    annualGrowthRate: 0,
    ...overrides,
  };
}

describe("calculateQuarterlyRevenue", () => {
  it("calculates revenue using all coefficients", () => {
    const company = makeCompany({
      productQuality: 50,
      customerCount: 5,
      brandAwareness: 20,
    });

    expect(calculateQuarterlyRevenue(company, "stable")).toBe(27500);
  });

  it("caps customer scale at 2.0", () => {
    const company = makeCompany({ customerCount: 100 });
    const base = 50000 * (50 / 100) * 1 * 2 * (1 + 10 / 200);

    expect(calculateQuarterlyRevenue(company, "stable")).toBe(Math.round(base));
  });
});

describe("calculateQuarterlyCompanyExpenses", () => {
  it("sums wages, founder salary, rent, and operations", () => {
    const company = makeCompany({ employeeCount: 3, officeType: "home" });

    expect(calculateQuarterlyCompanyExpenses(company, 5000)).toBe(
      72000 + 15000 + 3000 + 6000,
    );
  });
});

describe("processCompanyAction", () => {
  it("improves product quality", () => {
    const result = processCompanyAction(makeCompany(), "improve_product", 1);

    expect(result.productQuality).toBe(55);
  });

  it("raises brand awareness through marketing", () => {
    const result = processCompanyAction(makeCompany(), "marketing", 1);

    expect(result.brandAwareness).toBe(15);
  });

  it("adds customers through business development", () => {
    const result = processCompanyAction(
      makeCompany({ brandAwareness: 40 }),
      "biz_develop",
      1,
    );

    expect(result.customerCount).toBeGreaterThanOrEqual(7);
    expect(result.customerCount).toBeLessThanOrEqual(10);
  });

  it("improves team satisfaction", () => {
    const result = processCompanyAction(makeCompany(), "team_manage", 1);

    expect(result.teamSatisfaction).toBe(68);
  });
});

describe("calculateValuation", () => {
  it("calculates valuation as annual revenue times the multiplier", () => {
    expect(calculateValuation(100000, 15)).toBe(400000 * 15);
  });
});

describe("checkCompanyUpgrade", () => {
  it("upgrades garage stage with enough revenue and profitable quarters", () => {
    const company = makeCompany({
      stage: "garage",
      quarterlyRevenue: 100000,
      consecutiveProfitableQuarters: 2,
    });

    expect(checkCompanyUpgrade(company)).toBe(true);
  });

  it("does not upgrade garage stage with only one profitable quarter", () => {
    const company = makeCompany({
      stage: "garage",
      quarterlyRevenue: 100000,
      consecutiveProfitableQuarters: 1,
    });

    expect(checkCompanyUpgrade(company)).toBe(false);
  });

  it("requires funding for the series_a upgrade", () => {
    const unfunded = makeCompany({
      stage: "series_a",
      quarterlyRevenue: 2000000,
      hasSeriesAFunding: false,
    });
    const funded = makeCompany({
      stage: "series_a",
      quarterlyRevenue: 2000000,
      hasSeriesAFunding: true,
    });

    expect(checkCompanyUpgrade(unfunded)).toBe(false);
    expect(checkCompanyUpgrade(funded)).toBe(true);
  });

  it("requires 50% annual growth at the growth stage", () => {
    const slowGrowth = makeCompany({
      stage: "growth",
      quarterlyRevenue: 10000000,
      annualGrowthRate: 0.3,
    });
    const fastGrowth = makeCompany({
      stage: "growth",
      quarterlyRevenue: 10000000,
      annualGrowthRate: 0.6,
    });

    expect(checkCompanyUpgrade(slowGrowth)).toBe(false);
    expect(checkCompanyUpgrade(fastGrowth)).toBe(true);
  });
});

describe("applyTeamSatisfactionDecay", () => {
  it("reduces satisfaction by 3", () => {
    expect(applyTeamSatisfactionDecay(makeCompany({ teamSatisfaction: 50 })).teamSatisfaction).toBe(47);
  });

  it("does not go below zero", () => {
    expect(applyTeamSatisfactionDecay(makeCompany({ teamSatisfaction: 1 })).teamSatisfaction).toBe(0);
  });
});
