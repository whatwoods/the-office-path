import { ECONOMY_COEFFICIENT } from "@/types/agents";
import {
  OFFICE_RENT,
  STAGE_BASE_CUSTOMERS,
  STAGE_BASE_REVENUE,
} from "@/types/company";
import type { CompanyStage, CompanyState } from "@/types/company";
import type { Phase2Action } from "@/types/actions";
import type { EconomyStatus } from "@/types/agents";

const STAGE_AVERAGE_SALARY: Record<CompanyStage, number> = {
  garage: 8000,
  small_team: 12000,
  series_a: 18000,
  growth: 25000,
  pre_ipo: 35000,
  public: 45000,
};

export function calculateQuarterlyRevenue(
  company: CompanyState,
  economy: EconomyStatus,
): number {
  const baseRevenue = STAGE_BASE_REVENUE[company.stage];
  const qualityCoefficient = company.productQuality / 100;
  const marketCoefficient = ECONOMY_COEFFICIENT[economy];
  const customerScale = Math.min(
    company.customerCount / STAGE_BASE_CUSTOMERS[company.stage],
    2,
  );
  const brandBonus = company.brandAwareness / 200;

  return Math.round(
    baseRevenue *
      qualityCoefficient *
      marketCoefficient *
      customerScale *
      (1 + brandBonus),
  );
}

export function calculateQuarterlyCompanyExpenses(
  company: CompanyState,
  founderMonthlySalary: number,
): number {
  const wages = company.employeeCount * STAGE_AVERAGE_SALARY[company.stage] * 3;
  const founderWages = founderMonthlySalary * 3;
  const rent = OFFICE_RENT[company.officeType];
  const operations = company.employeeCount * 2000;

  return wages + founderWages + rent + operations;
}

export function calculateValuation(
  quarterlyRevenue: number,
  peMultiple: number,
): number {
  return Math.round(quarterlyRevenue * 4 * peMultiple);
}

export function processCompanyAction(
  company: CompanyState,
  action: Phase2Action,
  effectMultiplier: number,
): CompanyState {
  const nextCompany = { ...company };

  switch (action) {
    case "improve_product":
      nextCompany.productQuality = Math.min(
        100,
        nextCompany.productQuality + Math.floor(5 * effectMultiplier),
      );
      break;

    case "recruit":
      nextCompany.employeeCount += Math.floor((1 + Math.random() * 2) * effectMultiplier);
      break;

    case "team_manage":
      nextCompany.teamSatisfaction = Math.min(
        100,
        nextCompany.teamSatisfaction + Math.floor(8 * effectMultiplier),
      );
      break;

    case "biz_develop":
      nextCompany.customerCount += Math.floor((2 + Math.random() * 3) * effectMultiplier);
      break;

    case "marketing":
      nextCompany.brandAwareness = Math.min(
        100,
        nextCompany.brandAwareness + Math.floor(5 * effectMultiplier),
      );
      break;

    case "fundraise":
    case "rest":
      break;
  }

  return nextCompany;
}

export function checkCompanyUpgrade(company: CompanyState): boolean {
  switch (company.stage) {
    case "garage":
      return (
        company.quarterlyRevenue >= 100000 &&
        company.consecutiveProfitableQuarters >= 2
      );
    case "small_team":
      return company.quarterlyRevenue >= 500000 && company.teamSatisfaction >= 60;
    case "series_a":
      return company.quarterlyRevenue >= 2000000 && company.hasSeriesAFunding;
    case "growth":
      return company.quarterlyRevenue >= 10000000 && company.annualGrowthRate >= 0.5;
    case "pre_ipo":
    case "public":
      return false;
  }
}

export function applyTeamSatisfactionDecay(company: CompanyState): CompanyState {
  return {
    ...company,
    teamSatisfaction: Math.max(0, company.teamSatisfaction - 3),
  };
}
