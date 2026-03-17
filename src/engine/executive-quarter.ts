import {
  applyQuarterlyHealthDecay,
  applyQuarterlyHousingMood,
  applyStatChanges,
} from "@/engine/attributes";
import {
  processExecutiveAction,
  validateExecutivePlan,
} from "@/engine/executive-actions";
import { applyQuarterlyEconomy, isBroke } from "@/engine/economy";
import { advanceQuarter, getMaxStamina } from "@/engine/time";
import {
  EXECUTIVE_SALARY,
  type ExecutiveQuarterPlan,
  type ExecutiveState,
} from "@/types/executive";
import type { CriticalPeriodType, GameState } from "@/types/game";

export interface ExecutiveQuarterResult {
  state: GameState;
  triggerBoardReview: boolean;
  triggerCriticalType?: CriticalPeriodType;
}

const CLAMPED_EXECUTIVE_FIELDS = new Set<keyof ExecutiveState>([
  "departmentPerformance",
  "boardSupport",
  "teamLoyalty",
  "politicalCapital",
]);

export function calculateStockPriceChange(
  currentPrice: number,
  departmentPerformance: number,
  economyCycle: "boom" | "stable" | "winter",
  randomFn: () => number = Math.random,
): number {
  const baseVolatility = (randomFn() - 0.5) * 10;
  const performanceCoefficient = (departmentPerformance - 50) * 0.1;
  const economyCoefficient =
    economyCycle === "boom" ? 3 : economyCycle === "winter" ? -3 : 0;
  const totalChangePercent =
    baseVolatility + performanceCoefficient + economyCoefficient;

  return currentPrice * (totalChangePercent / 100);
}

export function settleExecutiveQuarter(
  state: GameState,
  plan: ExecutiveQuarterPlan,
): ExecutiveQuarterResult {
  if (!state.executive) {
    throw new Error("Cannot settle executive quarter without executive state");
  }

  const maxStamina = getMaxStamina(
    "quarterly",
    state.housing.type,
    state.phase2Path,
  );
  const validation = validateExecutivePlan(plan, maxStamina);
  if (!validation.valid) {
    throw new Error(validation.error ?? "Invalid executive plan");
  }

  const newState: GameState = JSON.parse(JSON.stringify(state));
  const executive = newState.executive!;
  let triggerCriticalType: CriticalPeriodType | undefined;

  for (const allocation of plan.actions) {
    const result = processExecutiveAction(executive, newState.player, allocation);

    for (const [key, change] of Object.entries(result.executiveChanges)) {
      if (typeof change !== "number") {
        continue;
      }

      const field = key as keyof ExecutiveState;
      const nextValue = (executive[field] as number) + change;
      (
        executive as unknown as Record<string, number>
      )[field] = CLAMPED_EXECUTIVE_FIELDS.has(field)
        ? Math.max(0, Math.min(100, nextValue))
        : nextValue;
    }

    if (Object.keys(result.playerChanges).length > 0) {
      newState.player = applyStatChanges(newState.player, result.playerChanges);
    }

    if (result.triggerCritical) {
      triggerCriticalType = result.triggerCritical;
    }
  }

  newState.player = applyQuarterlyHealthDecay(newState.player, newState.housing.type);
  newState.player = applyQuarterlyHousingMood(newState.player, newState.housing.type);

  const economyResult = applyQuarterlyEconomy(0, newState.housing.type);
  newState.player = applyStatChanges(newState.player, {
    money: -economyResult.expenses.total,
  });

  newState.player = applyStatChanges(newState.player, {
    money: EXECUTIVE_SALARY[executive.stage],
  });

  executive.vestedShares += 0.0025;
  const optionValue = Math.round(executive.stockPrice * executive.vestedShares * 10000);
  newState.player = applyStatChanges(newState.player, { money: optionValue });

  const stockPriceChange = calculateStockPriceChange(
    executive.stockPrice,
    executive.departmentPerformance,
    newState.world.economyCycle,
  );
  executive.stockPrice = Math.max(
    1,
    Math.round((executive.stockPrice + stockPriceChange) * 100) / 100,
  );

  if (isBroke(newState.player.money)) {
    newState.player = applyStatChanges(newState.player, { mood: -10 });
  }

  newState.currentQuarter = advanceQuarter(newState.currentQuarter);
  newState.job.totalQuarters += 1;
  newState.job.quartersAtLevel += 1;
  newState.maimaiPostsThisQuarter = 0;

  if (executive.departmentPerformance < 30) {
    executive.consecutiveLowPerformance += 1;
  } else {
    executive.consecutiveLowPerformance = 0;
  }

  if (executive.departmentPerformance >= 50) {
    executive.onTargetQuarters += 1;
  }

  const triggerBoardReview =
    newState.currentQuarter > 0 && newState.currentQuarter % 4 === 0;

  newState.staminaRemaining = maxStamina;

  return {
    state: newState,
    triggerBoardReview,
    triggerCriticalType,
  };
}
