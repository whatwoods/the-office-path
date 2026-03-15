import type { ActionAllocation, QuarterPlan } from "@/types/actions";
import { ACTION_STAMINA_COST } from "@/types/actions";
import type { PlayerAttributes } from "@/types/game";

export interface ActionResult {
  statChanges: Partial<PlayerAttributes>;
  projectProgress: number;
  workActionCount: number;
  npcFavorTarget?: string;
  npcFavorAmount?: number;
  sideHustleIncome?: number;
  sideHustleCaught?: boolean;
}

export function processAction(
  attributes: PlayerAttributes,
  allocation: ActionAllocation,
  effectMultiplier: number,
  randomFn?: () => number,
): ActionResult {
  const result: ActionResult = {
    statChanges: {},
    projectProgress: 0,
    workActionCount: 0,
  };

  switch (allocation.action) {
    case "work_hard":
      result.statChanges = {
        professional: Math.floor(3 * effectMultiplier),
        health: -2,
      };
      result.projectProgress = 1;
      result.workActionCount = 1;
      return result;

    case "study":
      if (allocation.target) {
        result.statChanges = {
          [allocation.target]: Math.floor(5 * effectMultiplier),
        } as Partial<PlayerAttributes>;
      }
      return result;

    case "socialize":
      result.statChanges = {
        communication: Math.floor(2 * effectMultiplier),
        network: Math.floor(3 * effectMultiplier),
        money: -500,
      };
      if (allocation.target) {
        result.npcFavorTarget = allocation.target;
        result.npcFavorAmount = Math.floor(
          (5 + attributes.communication / 10) * effectMultiplier,
        );
      }
      return result;

    case "manage_up":
      result.statChanges = { communication: Math.floor(1 * effectMultiplier) };
      result.npcFavorTarget = "__leader__";
      result.npcFavorAmount = 10;
      return result;

    case "slack_off":
      result.statChanges = {
        mood: Math.floor(8 * effectMultiplier),
        health: 3,
      };
      return result;

    case "side_hustle": {
      const rng = randomFn ?? Math.random;
      const income = 2000 + Math.floor(rng() * 6001);
      const caught = rng() < 0.2;
      result.sideHustleIncome = income;
      result.sideHustleCaught = caught;
      result.statChanges = { money: income };
      if (caught) {
        result.statChanges.reputation = -10;
      }
      return result;
    }

    case "job_interview":
      result.statChanges = { network: Math.floor(2 * effectMultiplier) };
      return result;

    case "resign_startup":
    case "improve_product":
    case "recruit":
    case "fundraise":
    case "team_manage":
    case "biz_develop":
    case "marketing":
      return result;

    case "rest":
      result.statChanges = {
        health: 3,
        mood: Math.floor(8 * effectMultiplier),
      };
      return result;
  }
}

export function validateQuarterPlan(
  plan: QuarterPlan,
  maxStamina: number,
): { valid: boolean; totalCost: number; error?: string } {
  const totalCost = getTotalStaminaCost(plan);
  if (totalCost > maxStamina) {
    return {
      valid: false,
      totalCost,
      error: `Total stamina cost ${totalCost} exceeds budget ${maxStamina}`,
    };
  }

  return { valid: true, totalCost };
}

export function getTotalStaminaCost(plan: QuarterPlan): number {
  return plan.actions.reduce((total, action) => {
    return total + (ACTION_STAMINA_COST[action.action] ?? 0);
  }, 0);
}
