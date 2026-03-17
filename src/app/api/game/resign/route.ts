import { runNarrativeAgent } from "@/ai/agents/narrative";
import { validateChoices } from "@/ai/orchestration/conflict";
import { AgentInputSchema } from "@/ai/schemas";
import { canStartup, transitionToPhase2 } from "@/engine/phase-transition";
import type { AgentInput } from "@/types/agents";
import type { Phase2Path } from "@/types/executive";
import type { CriticalPeriodType, GameState } from "@/types/game";
import type { AIConfig } from "@/types/settings";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      state?: GameState;
      path?: Phase2Path;
      aiConfig?: AIConfig;
    };

    if (!body.state) {
      return Response.json({ success: false, error: "Missing state" }, { status: 400 });
    }

    const stateCheck = AgentInputSchema.shape.state.safeParse(body.state);
    if (!stateCheck.success) {
      return Response.json(
        { success: false, error: `Invalid state: ${stateCheck.error.message}` },
        { status: 400 },
      );
    }

    const currentState = body.state;

    if (!canStartup(currentState.job.level)) {
      return Response.json({ success: false, error: "等级不足以创业" }, { status: 400 });
    }

    const path = body.path ?? "startup";
    const newState = transitionToPhase2(currentState, path);

    const agentInput: AgentInput = { state: newState, recentHistory: [] };
    const worldContext = {
      economy: newState.world.economyCycle,
      trends: newState.world.industryTrends,
      companyStatus: newState.world.companyStatus,
      newsItems: [],
    };

    const narrativeOutput = await runNarrativeAgent(
      agentInput,
      worldContext,
      { events: [], phoneMessages: [] },
      { npcActions: [], chatMessages: [] },
      [],
      true,
      path === "executive" ? "玩家决定留在公司，转入高管路线。" : "玩家离职创业了。",
      true,
      body.aiConfig,
    );

    let criticalChoices;
    if (narrativeOutput.choices && newState.criticalPeriod) {
      criticalChoices = validateChoices(
        narrativeOutput.choices,
        newState.staminaRemaining,
        newState.criticalPeriod.type as CriticalPeriodType,
        newState.player,
      );
    }

    return Response.json({
      success: true,
      state: newState,
      narrative: narrativeOutput.narrative,
      criticalChoices,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
