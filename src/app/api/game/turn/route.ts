import { runCriticalDayPipeline } from "@/ai/orchestration/critical";
import {
  runExecutiveQuarterlyPipeline,
  runQuarterlyPipeline,
} from "@/ai/orchestration/quarterly";
import { AgentInputSchema } from "@/ai/schemas";
import type { CriticalChoice, QuarterPlan } from "@/types/actions";
import type { ExecutiveQuarterPlan } from "@/types/executive";
import type { GameState } from "@/types/game";
import type { AIConfig } from "@/types/settings";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      state?: GameState;
      plan?: QuarterPlan;
      choice?: CriticalChoice;
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

    const state = body.state;

    if (state.timeMode === "critical") {
      if (!body.choice) {
        return Response.json(
          { success: false, error: "Missing choice for critical period action" },
          { status: 400 },
        );
      }

      const result = await runCriticalDayPipeline(state, body.choice, body.aiConfig);
      return Response.json({
        success: true,
        state: result.state,
        narrative: result.narrative,
        nextChoices: result.nextChoices ?? [],
        isComplete: result.isComplete,
      });
    }

    if (!body.plan) {
      return Response.json(
        { success: false, error: "Missing plan for quarterly action" },
        { status: 400 },
      );
    }

    if (state.phase2Path === "executive") {
      const result = await runExecutiveQuarterlyPipeline(
        state,
        body.plan as ExecutiveQuarterPlan,
        body.aiConfig,
      );
      return Response.json({
        success: true,
        state: result.state,
        narrative: result.narrative,
        events: result.events,
        performanceRating: result.performanceRating ?? null,
        salaryChange: result.salaryChange ?? null,
        criticalChoices: result.criticalChoices ?? [],
      });
    }

    const result = await runQuarterlyPipeline(
      state,
      body.plan as QuarterPlan,
      body.aiConfig,
    );
    return Response.json({
      success: true,
      state: result.state,
      narrative: result.narrative,
      events: result.events,
      performanceRating: result.performanceRating ?? null,
      salaryChange: result.salaryChange ?? null,
      criticalChoices: result.criticalChoices ?? [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
