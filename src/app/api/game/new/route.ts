import { createNewGame } from "@/engine/state";
import { createAIUsageCollector, createEmptyAIUsageSummary } from "@/lib/aiUsage";
import { runNarrativeAgent } from "@/ai/agents/narrative";
import { validateChoices } from "@/ai/orchestration/conflict";
import type { AgentInput } from "@/types/agents";
import type { CriticalPeriodType, MajorType } from "@/types/game";
import type { AIConfig } from "@/types/settings";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      aiConfig?: AIConfig;
      major?: MajorType;
      playerName?: string;
    };
    const state = createNewGame({
      major: body.major,
      playerName: body.playerName,
    });
    const aiUsage = createEmptyAIUsageSummary();
    const collectUsage = createAIUsageCollector(aiUsage);

    const agentInput: AgentInput = { state, recentHistory: [] };
    const worldContext = {
      economy: state.world.economyCycle,
      trends: state.world.industryTrends,
      companyStatus: state.world.companyStatus,
      newsItems: [],
    };

    const narrativeOutput = await runNarrativeAgent(
      agentInput,
      worldContext,
      { events: [], phoneMessages: [] },
      { npcActions: [], chatMessages: [] },
      [],
      true,
      `玩家入职了${state.job.companyName}。`,
      true,
      body.aiConfig,
      collectUsage,
    );

    let criticalChoices;
    if (narrativeOutput.choices && state.criticalPeriod) {
      criticalChoices = validateChoices(
        narrativeOutput.choices,
        state.staminaRemaining,
        state.criticalPeriod.type as CriticalPeriodType,
        state.player,
      );
    }

    return Response.json({
      success: true,
      state,
      narrative: narrativeOutput.narrative,
      criticalChoices,
      aiUsage,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
