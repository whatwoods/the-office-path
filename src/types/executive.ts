import type { PlayerAttributes } from "./game";

export type ExecutiveStage = "E1" | "E2" | "E3";

export type ExecutiveAction =
  | "push_business"
  | "manage_board"
  | "build_team"
  | "political_maneuvering"
  | "strategic_planning"
  | "industry_networking"
  | "rest";

export type Phase2Path = "startup" | "executive";

export interface ExecutiveState {
  stage: ExecutiveStage;
  departmentPerformance: number;
  boardSupport: number;
  teamLoyalty: number;
  politicalCapital: number;
  stockPrice: number;
  departmentCount: number;
  consecutiveLowPerformance: number;
  vestedShares: number;
  onTargetQuarters: number;
}

export const EXECUTIVE_ACTION_STAMINA_COST: Record<ExecutiveAction, number> = {
  push_business: 2,
  manage_board: 2,
  build_team: 2,
  political_maneuvering: 3,
  strategic_planning: 3,
  industry_networking: 2,
  rest: 1,
};

export const EXECUTIVE_SALARY: Record<ExecutiveStage, number> = {
  E1: 450000,
  E2: 750000,
  E3: 1250000,
};

export interface ExecutiveActionAllocation {
  action: ExecutiveAction;
}

export interface ExecutiveQuarterPlan {
  actions: ExecutiveActionAllocation[];
}

export type { PlayerAttributes };
