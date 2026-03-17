import {
  applyQuarterlyHealthDecay,
  applyQuarterlyHousingMood,
  applyStatChanges,
  getEffectMultiplier,
} from "@/engine/attributes";
import { processAction, validateQuarterPlan } from "@/engine/actions";
import { applyQuarterlyEconomy, isBroke } from "@/engine/economy";
import { calculatePerformance, getPerformanceEffects } from "@/engine/performance";
import { advanceQuarter, getMaxStamina, isPerformanceReviewQuarter } from "@/engine/time";
import type { QuarterPlan } from "@/types/actions";
import type { GameState, PerformanceRating } from "@/types/game";

export interface QuarterResult {
  state: GameState;
  performanceRating?: PerformanceRating;
  salaryChange?: number;
}

export function settleQuarter(state: GameState, plan: QuarterPlan): QuarterResult {
  if (state.phase2Path === "executive") {
    throw new Error("Use settleExecutiveQuarter for executive path");
  }

  const maxStamina = getMaxStamina(
    "quarterly",
    state.housing.type,
    state.phase2Path,
  );
  const validation = validateQuarterPlan(plan, maxStamina);
  if (!validation.valid) {
    throw new Error(validation.error ?? "Invalid plan: exceeds stamina budget");
  }

  const newState: GameState = JSON.parse(JSON.stringify(state));
  const effectMultiplier = getEffectMultiplier(newState.player);
  let workCount = 0;

  for (const allocation of plan.actions) {
    const result = processAction(newState.player, allocation, effectMultiplier);
    if (Object.keys(result.statChanges).length > 0) {
      newState.player = applyStatChanges(newState.player, result.statChanges);
    }

    newState.projectProgress.currentProgress += result.projectProgress;
    if (newState.projectProgress.currentProgress >= 3) {
      newState.projectProgress.completed += 1;
      newState.projectProgress.currentProgress -= 3;
    }

    workCount += result.workActionCount;

    if (result.npcFavorTarget && result.npcFavorAmount) {
      const npc = newState.npcs.find((candidate) =>
        result.npcFavorTarget === "__leader__"
          ? candidate.role === "直属领导" && candidate.isActive
          : candidate.id === result.npcFavorTarget,
      );

      if (npc) {
        npc.favor = Math.max(0, Math.min(100, npc.favor + result.npcFavorAmount));
      }
    }
  }

  newState.player = applyQuarterlyHealthDecay(newState.player, newState.housing.type);
  newState.player = applyQuarterlyHousingMood(newState.player, newState.housing.type);

  const housingReputationBonus: Partial<Record<GameState["housing"]["type"], number>> = {
    luxury: 2,
    owned: 5,
  };
  const reputationBonus = housingReputationBonus[newState.housing.type] ?? 0;
  if (reputationBonus > 0) {
    newState.player = applyStatChanges(newState.player, {
      reputation: reputationBonus,
    });
  }

  const economyResult = applyQuarterlyEconomy(newState.job.salary, newState.housing.type);
  newState.player = applyStatChanges(newState.player, { money: economyResult.net });

  if (isBroke(newState.player.money)) {
    newState.player = applyStatChanges(newState.player, { mood: -10 });
  }

  newState.performanceWindow.workActionCount += workCount;
  newState.performanceWindow.quartersInWindow += 1;
  newState.currentQuarter = advanceQuarter(newState.currentQuarter);
  newState.job.quartersAtLevel += 1;
  newState.job.totalQuarters += 1;

  let performanceRating: PerformanceRating | undefined;
  let salaryChange: number | undefined;
  if (isPerformanceReviewQuarter(newState.currentQuarter)) {
    performanceRating = calculatePerformance(
      newState.performanceWindow.workActionCount,
      newState.player.professional,
    );
    newState.performanceWindow.history.push(performanceRating);

    const performanceEffects = getPerformanceEffects(performanceRating);
    if (performanceEffects.salaryMultiplier > 1) {
      const previousSalary = newState.job.salary;
      newState.job.salary = Math.round(previousSalary * performanceEffects.salaryMultiplier);
      salaryChange = newState.job.salary - previousSalary;
    }
    if (performanceEffects.reputationChange > 0) {
      newState.player = applyStatChanges(newState.player, {
        reputation: performanceEffects.reputationChange,
      });
    }

    newState.performanceWindow.workActionCount = 0;
    newState.performanceWindow.quartersInWindow = 0;
  }

  newState.staminaRemaining = getMaxStamina(
    "quarterly",
    newState.housing.type,
    newState.phase2Path,
  );
  newState.maimaiPostsThisQuarter = 0;

  return { state: newState, performanceRating, salaryChange };
}
