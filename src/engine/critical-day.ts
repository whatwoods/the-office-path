import { applyStatChanges } from "@/engine/attributes";
import { advanceCriticalDay, getMaxStamina } from "@/engine/time";
import type { CriticalChoice } from "@/types/actions";
import type { GameState } from "@/types/game";

export interface CriticalDayResult {
  state: GameState;
  isComplete: boolean;
}

export function settleCriticalDay(
  state: GameState,
  choice: CriticalChoice,
): CriticalDayResult {
  if (state.timeMode !== "critical" || !state.criticalPeriod) {
    throw new Error("Game is not in critical period mode");
  }

  if (choice.staminaCost > state.staminaRemaining) {
    throw new Error(
      `Not enough stamina: need ${choice.staminaCost}, have ${state.staminaRemaining}`,
    );
  }

  const newState: GameState = JSON.parse(JSON.stringify(state));
  newState.staminaRemaining -= choice.staminaCost;

  if (choice.effects.statChanges && Object.keys(choice.effects.statChanges).length > 0) {
    newState.player = applyStatChanges(newState.player, choice.effects.statChanges);
  }

  if (choice.effects.npcFavorChanges) {
    for (const [npcName, delta] of Object.entries(choice.effects.npcFavorChanges)) {
      const npc = newState.npcs.find((candidate) => candidate.name === npcName);
      if (npc) {
        npc.favor = Math.max(0, Math.min(100, npc.favor + delta));
      }
    }
  }

  if (choice.effects.riskEvent && Math.random() < choice.effects.riskEvent.probability) {
    const riskChanges = choice.effects.riskEvent.statChanges ?? { health: -3 };
    newState.player = applyStatChanges(newState.player, riskChanges);
  }

  newState.player = applyStatChanges(newState.player, { health: -1 });

  const dayResult = advanceCriticalDay(newState.criticalPeriod!);
  if (dayResult.isComplete) {
    newState.timeMode = "quarterly";
    newState.criticalPeriod = null;
    newState.staminaRemaining = getMaxStamina(
      "quarterly",
      newState.housing.type,
      newState.phase2Path,
    );
  } else {
    newState.criticalPeriod = dayResult.period;
    newState.staminaRemaining = newState.criticalPeriod.staminaPerDay;
  }

  return {
    state: newState,
    isComplete: dayResult.isComplete,
  };
}
