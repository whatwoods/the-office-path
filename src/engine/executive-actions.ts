import type { PlayerAttributes } from "@/types/game";
import type { CriticalPeriodType } from "@/types/game";
import {
  EXECUTIVE_ACTION_STAMINA_COST,
  type ExecutiveActionAllocation,
  type ExecutiveQuarterPlan,
  type ExecutiveState,
} from "@/types/executive";

export interface ExecutiveActionResult {
  executiveChanges: Partial<ExecutiveState>;
  playerChanges: Partial<PlayerAttributes>;
  triggerCritical?: CriticalPeriodType;
}

export function processExecutiveAction(
  _exec: ExecutiveState,
  _player: PlayerAttributes,
  allocation: ExecutiveActionAllocation,
  randomFn: () => number = Math.random,
): ExecutiveActionResult {
  switch (allocation.action) {
    case "push_business":
      return {
        executiveChanges: { departmentPerformance: 5 },
        playerChanges: { health: -1 },
      };

    case "manage_board":
      return {
        executiveChanges: { boardSupport: 8 },
        playerChanges: { communication: 1 },
      };

    case "build_team":
      return {
        executiveChanges: { teamLoyalty: 8 },
        playerChanges: { management: 2 },
      };

    case "political_maneuvering": {
      const exposed = randomFn() < 0.2;

      return {
        executiveChanges: { politicalCapital: 10 },
        playerChanges: exposed ? { reputation: -5 } : {},
      };
    }

    case "strategic_planning":
      return {
        executiveChanges: {},
        playerChanges: {},
        triggerCritical: "major_decision",
      };

    case "industry_networking":
      return {
        executiveChanges: {},
        playerChanges: {
          reputation: 5,
          network: 3,
          money: -2000,
        },
      };

    case "rest":
      return {
        executiveChanges: {},
        playerChanges: {
          health: 3,
          mood: 8,
        },
      };
  }
}

export function validateExecutivePlan(
  plan: ExecutiveQuarterPlan,
  maxStamina: number,
): { valid: boolean; error?: string } {
  const totalCost = plan.actions.reduce((sum, allocation) => {
    return sum + EXECUTIVE_ACTION_STAMINA_COST[allocation.action];
  }, 0);

  if (totalCost > maxStamina) {
    return {
      valid: false,
      error: `Stamina ${totalCost} exceeds budget ${maxStamina}`,
    };
  }

  return { valid: true };
}
