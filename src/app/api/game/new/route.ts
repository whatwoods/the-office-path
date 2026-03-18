import { createNewGame } from "@/engine/state";
import { createAIUsageCollector, createEmptyAIUsageSummary } from "@/lib/aiUsage";
import { createRequestContext } from "@/lib/observability/request-context";
import { withObservedStep } from "@/lib/observability/timed";
import { runNarrativeAgent } from "@/ai/agents/narrative";
import { validateChoices } from "@/ai/orchestration/conflict";
import type { CriticalChoice } from "@/types/actions";
import type { AgentInput } from "@/types/agents";
import type { CriticalPeriodType, MajorType } from "@/types/game";
import type { AIConfig } from "@/types/settings";

export async function POST(request: Request) {
  const ctx = createRequestContext("/api/game/new", request.method);
  ctx.log.info("request.start", "new game request started");

  try {
    const body = await withObservedStep(ctx, "parse_body", async () => {
      return (await request.json()) as {
        aiConfig?: AIConfig;
        major?: MajorType;
        playerName?: string;
      };
    });
    const state = await withObservedStep(ctx, "create_new_game_state", async () =>
      createNewGame({
        major: body.major,
        playerName: body.playerName,
      }),
    );
    const aiUsage = createEmptyAIUsageSummary();
    const collectUsage = createAIUsageCollector(aiUsage);

    const agentInput: AgentInput = { state, recentHistory: [] };
    const worldContext = {
      economy: state.world.economyCycle,
      trends: state.world.industryTrends,
      companyStatus: state.world.companyStatus,
      newsItems: [],
    };

    const narrativeOutput = await withObservedStep(
      ctx,
      "run_narrative_agent",
      async () =>
        runNarrativeAgent(
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
          ctx,
        ),
      {
        metadata: {
          companyName: state.job.companyName,
          phase: state.phase,
        },
      },
    );

    let criticalChoices: CriticalChoice[] | undefined;
    const narrativeChoices = narrativeOutput.choices;
    const criticalPeriod = state.criticalPeriod;

    if (narrativeChoices && criticalPeriod) {
      criticalChoices = await withObservedStep(ctx, "validate_critical_choices", async () =>
        validateChoices(
          narrativeChoices,
          state.staminaRemaining,
          criticalPeriod.type as CriticalPeriodType,
          state.player,
        ),
      );
    }

    ctx.finish(200, { metadata: { criticalChoices: criticalChoices?.length ?? 0 } });

    return Response.json({
      success: true,
      state,
      narrative: narrativeOutput.narrative,
      criticalChoices,
      aiUsage,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    ctx.log.error("request.error", "new game request failed", {
      errorType: "unexpected",
      errorMessage: message,
      errorStack: error instanceof Error ? error.stack : undefined,
    });
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
