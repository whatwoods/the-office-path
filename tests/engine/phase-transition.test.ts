import { describe, expect, it } from "vitest";

import { createNewGame } from "@/engine/state";
import { canStartup, transitionToPhase2 } from "@/engine/phase-transition";

describe("canStartup", () => {
  it("allows L6 and above to start up", () => {
    expect(canStartup("L6_tech")).toBe(true);
    expect(canStartup("L6_mgmt")).toBe(true);
    expect(canStartup("L7_tech")).toBe(true);
    expect(canStartup("L8")).toBe(true);
  });

  it("blocks L5 and below", () => {
    expect(canStartup("L5")).toBe(false);
    expect(canStartup("L3")).toBe(false);
  });
});

describe("transitionToPhase2", () => {
  it("creates company state from L8 with a bonus and startup critical period", () => {
    const game = createNewGame();
    game.job.level = "L8";
    game.player.money = 200000;
    game.player.network = 50;
    game.timeMode = "quarterly";
    game.criticalPeriod = null;

    const result = transitionToPhase2(game);

    expect(result.phase).toBe(2);
    expect(result.company).not.toBeNull();
    expect(result.company?.stage).toBe("garage");
    expect(result.company?.founderEquity).toBe(100);
    expect(result.player.money).toBe(700000);
    expect(result.player.network).toBe(70);
    expect(result.timeMode).toBe("critical");
    expect(result.criticalPeriod?.type).toBe("startup_launch");
    expect(result.criticalPeriod?.maxDays).toBe(7);
    expect(result.staminaRemaining).toBe(3);
  });

  it("creates company state from L6 without the L8 bonus", () => {
    const game = createNewGame();
    game.job.level = "L6_tech";
    game.player.money = 100000;
    game.player.network = 30;
    game.timeMode = "quarterly";
    game.criticalPeriod = null;

    const result = transitionToPhase2(game);

    expect(result.player.money).toBe(100000);
    expect(result.player.network).toBe(30);
    expect(result.criticalPeriod?.type).toBe("startup_launch");
  });
});

describe("createNewGame", () => {
  it("creates a valid initial game state in onboarding", () => {
    const game = createNewGame();

    expect(game.phase).toBe(1);
    expect(game.currentQuarter).toBe(0);
    expect(game.player.health).toBe(90);
    expect(game.job.level).toBe("L1");
    expect(game.housing.type).toBe("shared");
    expect(game.npcs).toHaveLength(5);
    expect(game.timeMode).toBe("critical");
    expect(game.criticalPeriod?.type).toBe("onboarding");
    expect(game.criticalPeriod?.currentDay).toBe(1);
    expect(game.criticalPeriod?.maxDays).toBe(5);
    expect(game.staminaRemaining).toBe(3);
    expect(game.world.economyCycle).toBe("stable");
  });
});
