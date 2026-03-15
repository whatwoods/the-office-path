import { clampAttribute } from "@/engine/attributes";
import type { CompanyState } from "@/types/company";
import type { GameState, JobLevel } from "@/types/game";

const STARTUP_ELIGIBLE_LEVELS: JobLevel[] = [
  "L6_tech",
  "L6_mgmt",
  "L7_tech",
  "L7_mgmt",
  "L8",
];

function createInitialCompany(): CompanyState {
  return {
    stage: "garage",
    productQuality: 30,
    teamSatisfaction: 70,
    customerCount: 0,
    brandAwareness: 0,
    employeeCount: 0,
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
  };
}

export function canStartup(level: JobLevel): boolean {
  return STARTUP_ELIGIBLE_LEVELS.includes(level);
}

export function transitionToPhase2(state: GameState): GameState {
  const isExecutivePath = state.job.level === "L8";
  const moneyBonus = isExecutivePath ? 500000 : 0;
  const networkBonus = isExecutivePath ? 20 : 0;

  return {
    ...state,
    phase: 2,
    timeMode: "critical",
    criticalPeriod: {
      type: "startup_launch",
      currentDay: 1,
      maxDays: 7,
      staminaPerDay: 3,
    },
    staminaRemaining: 3,
    player: {
      ...state.player,
      money: state.player.money + moneyBonus,
      network: clampAttribute("network", state.player.network + networkBonus),
    },
    company: createInitialCompany(),
    founderSalary: 5000,
    job: {
      ...state.job,
      companyName: "我的公司",
    },
  };
}
