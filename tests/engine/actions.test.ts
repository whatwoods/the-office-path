import { describe, expect, it } from "vitest";

import {
  getTotalStaminaCost,
  processAction,
  validateQuarterPlan,
} from "@/engine/actions";
import { INITIAL_ATTRIBUTES } from "@/engine/attributes";
import type { QuarterPlan } from "@/types/actions";

describe("processAction", () => {
  const baseAttributes = { ...INITIAL_ATTRIBUTES };

  it("processes work_hard", () => {
    const result = processAction(baseAttributes, { action: "work_hard" }, 1);

    expect(result.statChanges.professional).toBe(3);
    expect(result.statChanges.health).toBe(-2);
    expect(result.projectProgress).toBe(1);
    expect(result.workActionCount).toBe(1);
  });

  it("applies study to the selected attribute", () => {
    const result = processAction(
      baseAttributes,
      { action: "study", target: "communication" },
      1,
    );

    expect(result.statChanges.communication).toBe(5);
  });

  it("processes socialize", () => {
    const result = processAction(
      baseAttributes,
      { action: "socialize", target: "npc_1" },
      1,
    );

    expect(result.statChanges.communication).toBe(2);
    expect(result.statChanges.network).toBe(3);
    expect(result.statChanges.money).toBe(-500);
    expect(result.npcFavorTarget).toBe("npc_1");
  });

  it("processes slack_off", () => {
    const result = processAction(baseAttributes, { action: "slack_off" }, 1);

    expect(result.statChanges.mood).toBe(8);
    expect(result.statChanges.health).toBe(3);
  });

  it("applies the effect multiplier", () => {
    const result = processAction(
      { ...baseAttributes, health: 20 },
      { action: "study", target: "professional" },
      0.5,
    );

    expect(result.statChanges.professional).toBe(2);
  });

  it("processes manage_up", () => {
    const result = processAction(baseAttributes, { action: "manage_up" }, 1);

    expect(result.npcFavorTarget).toBe("__leader__");
    expect(result.npcFavorAmount).toBe(10);
    expect(result.statChanges.communication).toBe(1);
  });

  it("processes job_interview", () => {
    const result = processAction(baseAttributes, { action: "job_interview" }, 1);

    expect(result.statChanges.network).toBe(2);
  });

  it("triggers offer generation for successful interviews", () => {
    const result = processAction(
      baseAttributes,
      { action: "job_interview" },
      1,
      () => 0.3,
    );

    expect(result.triggerOfferGeneration).toBe(true);
  });

  it("does not trigger offer generation when the roll misses", () => {
    const result = processAction(
      baseAttributes,
      { action: "job_interview" },
      1,
      () => 0.6,
    );

    expect(result.triggerOfferGeneration).toBe(false);
  });

  it("processes side_hustle income without getting caught", () => {
    const rng = () => 0.5;
    const result = processAction(baseAttributes, { action: "side_hustle" }, 1, rng);

    expect(result.sideHustleIncome).toBe(2000 + Math.floor(0.5 * 6001));
    expect(result.statChanges.money).toBe(result.sideHustleIncome);
    expect(result.sideHustleCaught).toBe(false);
  });

  it("applies penalties when side_hustle gets caught", () => {
    const values = [0.1, 0.1];
    const rng = () => values.shift() ?? 0.1;
    const result = processAction(baseAttributes, { action: "side_hustle" }, 1, rng);

    expect(result.sideHustleCaught).toBe(true);
    expect(result.statChanges.money).toBe(result.sideHustleIncome);
    expect(result.statChanges.reputation).toBe(-10);
  });
});

describe("validateQuarterPlan", () => {
  it("rejects plans exceeding the stamina budget", () => {
    const plan: QuarterPlan = {
      actions: [
        { action: "side_hustle" },
        { action: "side_hustle" },
        { action: "side_hustle" },
        { action: "work_hard" },
      ],
    };

    expect(validateQuarterPlan(plan, 10).valid).toBe(false);
  });

  it("accepts plans within the stamina budget", () => {
    const plan: QuarterPlan = {
      actions: [
        { action: "work_hard" },
        { action: "work_hard" },
        { action: "study", target: "professional" },
        { action: "slack_off" },
        { action: "socialize", target: "npc_1" },
      ],
    };

    const result = validateQuarterPlan(plan, 10);

    expect(result.valid).toBe(true);
    expect(result.totalCost).toBe(9);
  });
});

describe("getTotalStaminaCost", () => {
  it("sums action costs", () => {
    const plan: QuarterPlan = {
      actions: [
        { action: "work_hard" },
        { action: "side_hustle" },
        { action: "slack_off" },
      ],
    };

    expect(getTotalStaminaCost(plan)).toBe(6);
  });
});
