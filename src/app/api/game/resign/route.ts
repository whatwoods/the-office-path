import { runNarrativeAgent } from "@/ai/agents/narrative";
import { validateChoices } from "@/ai/orchestration/conflict";
import { AgentInputSchema } from "@/ai/schemas";
import { canStartup, transitionToPhase2 } from "@/engine/phase-transition";
import { createAIUsageCollector, createEmptyAIUsageSummary } from "@/lib/aiUsage";
import { createRequestContext } from "@/lib/observability/request-context";
import { withObservedStep } from "@/lib/observability/timed";
import type { AgentInput } from "@/types/agents";
import type { Phase2Path } from "@/types/executive";
import type { CriticalPeriodType, GameState } from "@/types/game";
import type { AIConfig } from "@/types/settings";

export async function POST(request: Request) {
  const ctx = createRequestContext("/api/game/resign", request.method);
  ctx.log.info("request.start", "resign request started");

  try {
    const body = await withObservedStep(ctx, "parse_body", async () => {
      return (await request.json()) as {
        state?: GameState;
        path?: Phase2Path;
        aiConfig?: AIConfig;
      };
    });

    if (!body.state) {
      ctx.log.warn("request.validation_failed", "resign request missing state", {
        errorType: "validation",
      });
      return Response.json({ success: false, error: "Missing state" }, { status: 400 });
    }

    const stateCheck = AgentInputSchema.shape.state.safeParse(body.state);
    if (!stateCheck.success) {
      ctx.log.warn("request.validation_failed", "resign state invalid", {
        errorType: "validation",
        metadata: { issueCount: stateCheck.error.issues.length },
      });
      return Response.json(
        { success: false, error: `Invalid state: ${stateCheck.error.message}` },
        { status: 400 },
      );
    }

    const currentState = body.state;

    if (!canStartup(currentState.job.level)) {
      ctx.log.warn("request.validation_failed", "player level not eligible for startup", {
        errorType: "validation",
        metadata: { level: currentState.job.level },
      });
      return Response.json({ success: false, error: "等级不足以创业" }, { status: 400 });
    }

    const path = body.path ?? "startup";
    const newState = await withObservedStep(ctx, "transition_to_phase2", async () =>
      transitionToPhase2(currentState, path),
    );
    const aiUsage = createEmptyAIUsageSummary();
    const collectUsage = createAIUsageCollector(aiUsage);

    const agentInput: AgentInput = { state: newState, recentHistory: [] };
    const worldContext = {
      economy: newState.world.economyCycle,
      trends: newState.world.industryTrends,
      companyStatus: newState.world.companyStatus,
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
          path === "executive" ? "玩家决定留在公司，转入高管路线。" : "玩家离职创业了。",
          true,
          body.aiConfig,
          collectUsage,
          ctx,
        ),
      {
        metadata: {
          path,
          companyStatus: newState.world.companyStatus,
        },
      },
    );

    let criticalChoices;
    if (narrativeOutput.choices && newState.criticalPeriod) {
      criticalChoices = await withObservedStep(ctx, "validate_critical_choices", async () =>
        validateChoices(
          narrativeOutput.choices,
          newState.staminaRemaining,
          newState.criticalPeriod!.type as CriticalPeriodType,
          newState.player,
        ),
      );
    }

    ctx.finish(200, { metadata: { path, phase2Path: newState.phase2Path } });
    return Response.json({
      success: true,
      state: newState,
      narrative: narrativeOutput.narrative,
      criticalChoices,
      aiUsage,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    ctx.log.error("request.error", "resign request failed", {
      errorType: "unexpected",
      errorMessage: message,
      errorStack: error instanceof Error ? error.stack : undefined,
    });
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
