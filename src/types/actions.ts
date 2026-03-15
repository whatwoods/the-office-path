import type { PlayerAttributes } from "./game";

export type Phase1Action =
  | "work_hard"
  | "study"
  | "socialize"
  | "manage_up"
  | "slack_off"
  | "side_hustle"
  | "job_interview"
  | "resign_startup";

export type Phase2Action =
  | "improve_product"
  | "recruit"
  | "fundraise"
  | "team_manage"
  | "biz_develop"
  | "marketing"
  | "rest";

export type GameAction = Phase1Action | Phase2Action;

export const ACTION_STAMINA_COST: Record<GameAction, number> = {
  work_hard: 2,
  study: 2,
  socialize: 2,
  manage_up: 2,
  slack_off: 1,
  side_hustle: 3,
  job_interview: 3,
  resign_startup: 0,
  improve_product: 2,
  recruit: 2,
  fundraise: 3,
  team_manage: 2,
  biz_develop: 2,
  marketing: 2,
  rest: 1,
};

export interface ActionAllocation {
  action: GameAction;
  target?: string;
}

export interface QuarterPlan {
  actions: ActionAllocation[];
}

export interface CriticalChoice {
  choiceId: string;
  label: string;
  staminaCost: number;
  effects: ChoiceEffects;
  category: string;
}

export interface ChoiceEffects {
  statChanges?: Partial<PlayerAttributes>;
  npcFavorChanges?: Record<string, number>;
  riskEvent?: {
    probability: number;
    description: string;
    statChanges?: Partial<PlayerAttributes>;
  };
}
