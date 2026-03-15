/**
 * Manual smoke test for the AI pipeline.
 * Run with: npx tsx scripts/test-ai-pipeline.ts
 * Requires: OPENAI_API_KEY (or matching provider keys) in .env.local
 */

import { loadEnvConfig } from "@next/env";

import { runCriticalDayPipeline } from "../src/ai/orchestration/critical";
import { createNewGame } from "../src/engine/state";
import type { CriticalChoice } from "../src/types/actions";

loadEnvConfig(process.cwd());

async function main() {
  console.log("=== AI Pipeline Smoke Test ===\n");

  if (
    !process.env.OPENAI_API_KEY &&
    !process.env.ANTHROPIC_API_KEY &&
    !process.env.DEEPSEEK_API_KEY
  ) {
    throw new Error(
      "Missing AI provider API key. Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or DEEPSEEK_API_KEY in .env.local.",
    );
  }

  const state = createNewGame();
  console.log(`Game created: ${state.job.companyName}, ${state.job.level}`);
  console.log(`Mode: ${state.timeMode}, Critical: ${state.criticalPeriod?.type}`);
  console.log(
    `Day: ${state.criticalPeriod?.currentDay}/${state.criticalPeriod?.maxDays}\n`,
  );

  const choice: CriticalChoice = {
    choiceId: "smoke_test_1",
    label: "认真听入职培训",
    staminaCost: 1,
    effects: {
      statChanges: { professional: 2 },
    },
    category: "学习",
  };

  console.log(
    `Making choice: "${choice.label}" (cost: ${choice.staminaCost} stamina)\n`,
  );

  try {
    const result = await runCriticalDayPipeline(state, choice);

    console.log("--- Narrative ---");
    console.log(result.narrative);
    console.log("\n--- NPC Actions ---");
    for (const action of result.npcActions) {
      console.log(
        `  ${action.npcName}: ${action.action} (好感${action.favorChange > 0 ? "+" : ""}${action.favorChange})`,
      );
    }

    if (result.nextChoices) {
      console.log("\n--- Next Choices ---");
      for (const nextChoice of result.nextChoices) {
        console.log(
          `  [${nextChoice.category}] ${nextChoice.label} (${nextChoice.staminaCost}点体力)`,
        );
      }
    }

    console.log("\n--- Status ---");
    console.log(`Complete: ${result.isComplete}`);
    console.log(
      `Health: ${result.state.player.health}, Mood: ${result.state.player.mood}`,
    );
    console.log(`Professional: ${result.state.player.professional}`);
    console.log("\nSmoke test passed.");
  } catch (error) {
    console.error("\nSmoke test failed:", error);
    process.exit(1);
  }
}

void main();
