import { describe, expect, it } from "vitest";

import { settleCriticalDay } from "@/engine/critical-day";
import { createNewGame } from "@/engine/state";
import type { CriticalChoice } from "@/types/actions";

describe("settleCriticalDay", () => {
  it("applies choice effects and advances the day", () => {
    const state = createNewGame();
    const choice: CriticalChoice = {
      choiceId: "onboard_day1_a",
      label: "认真听培训",
      staminaCost: 1,
      effects: {
        statChanges: { professional: 2 },
      },
      category: "学习",
    };

    const result = settleCriticalDay(state, choice);

    expect(result.state.player.professional).toBe(state.player.professional + 2);
    expect(result.state.staminaRemaining).toBe(3);
    expect(result.state.criticalPeriod?.currentDay).toBe(2);
    expect(result.isComplete).toBe(false);
  });

  it("rejects choices that exceed remaining stamina", () => {
    const state = createNewGame();
    state.staminaRemaining = 1;

    const choice: CriticalChoice = {
      choiceId: "test",
      label: "大动作",
      staminaCost: 2,
      effects: { statChanges: {} },
      category: "表现",
    };

    expect(() => settleCriticalDay(state, choice)).toThrow("stamina");
  });

  it("completes the critical period on the last day", () => {
    const state = createNewGame();
    state.criticalPeriod!.currentDay = 5;

    const choice: CriticalChoice = {
      choiceId: "onboard_day5",
      label: "最后一天",
      staminaCost: 1,
      effects: { statChanges: {} },
      category: "表现",
    };

    const result = settleCriticalDay(state, choice);

    expect(result.isComplete).toBe(true);
    expect(result.state.timeMode).toBe("quarterly");
    expect(result.state.criticalPeriod).toBeNull();
    expect(result.state.staminaRemaining).toBe(10);
  });

  it("applies NPC favor changes", () => {
    const state = createNewGame();
    const choice: CriticalChoice = {
      choiceId: "onboard_social",
      label: "请同事吃饭",
      staminaCost: 1,
      effects: {
        statChanges: { communication: 1 },
        npcFavorChanges: { 王建国: 5 },
      },
      category: "社交",
    };

    const result = settleCriticalDay(state, choice);
    const wang = result.state.npcs.find((npc) => npc.name === "王建国");

    expect(wang?.favor).toBe(55);
  });

  it("applies risk event penalties when triggered", () => {
    const state = createNewGame();
    const choice: CriticalChoice = {
      choiceId: "onboard_risky",
      label: "加班到深夜",
      staminaCost: 2,
      effects: {
        statChanges: { professional: 3 },
        riskEvent: { probability: 1, description: "熬夜，健康-3" },
      },
      category: "表现",
    };

    const result = settleCriticalDay(state, choice);

    expect(result.state.player.health).toBe(state.player.health - 4);
  });

  it("rejects non-critical mode", () => {
    const state = createNewGame();
    state.timeMode = "quarterly";
    state.criticalPeriod = null;

    const choice: CriticalChoice = {
      choiceId: "test",
      label: "test",
      staminaCost: 1,
      effects: { statChanges: {} },
      category: "学习",
    };

    expect(() => settleCriticalDay(state, choice)).toThrow("critical");
  });
});
