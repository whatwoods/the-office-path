import { runCriticalDayPipeline } from "@/ai/orchestration/critical";
import {
  runExecutiveQuarterlyPipeline,
  runQuarterlyPipeline,
} from "@/ai/orchestration/quarterly";
import { AgentInputSchema } from "@/ai/schemas";
import { createRequestContext } from "@/lib/observability/request-context";
import { withObservedStep } from "@/lib/observability/timed";
import type { CriticalChoice, QuarterPlan } from "@/types/actions";
import type { ExecutiveQuarterPlan } from "@/types/executive";
import type { GameState } from "@/types/game";
import type { AIConfig } from "@/types/settings";

export async function POST(request: Request) {
  const ctx = createRequestContext("/api/game/turn", request.method);
  ctx.log.info("request.start", "turn request started");

  try {
    const body = await withObservedStep(ctx, "parse_body", async () => {
      return (await request.json()) as {
        state?: GameState;
        plan?: QuarterPlan;
        choice?: CriticalChoice;
        aiConfig?: AIConfig;
      };
    });

    if (!body.state) {
      ctx.log.warn("request.validation_failed", "turn request missing state", {
        errorType: "validation",
      });
      return Response.json({ success: false, error: "Missing state" }, { status: 400 });
    }

    const stateCheck = AgentInputSchema.shape.state.safeParse(body.state);
    if (!stateCheck.success) {
      ctx.log.warn("request.validation_failed", "turn state invalid", {
        errorType: "validation",
        metadata: { issueCount: stateCheck.error.issues.length },
      });
      return Response.json(
        { success: false, error: `Invalid state: ${stateCheck.error.message}` },
        { status: 400 },
      );
    }

    const state = body.state;

    if (state.timeMode === "critical") {
      if (!body.choice) {
        ctx.log.warn("request.validation_failed", "critical turn missing choice", {
          errorType: "validation",
        });
        return Response.json(
          { success: false, error: "Missing choice for critical period action" },
          { status: 400 },
        );
      }

      const result = await withObservedStep(ctx, "run_critical_day_pipeline", async () =>
        runCriticalDayPipeline(state, body.choice!, body.aiConfig),
      );
      ctx.finish(200, { metadata: { branch: "critical", timeMode: state.timeMode } });
      return Response.json({
        success: true,
        state: result.state,
        narrative: result.narrative,
        nextChoices: result.nextChoices ?? [],
        isComplete: result.isComplete,
        aiUsage: result.aiUsage,
      });
    }

    if (!body.plan) {
      ctx.log.warn("request.validation_failed", "quarterly turn missing plan", {
        errorType: "validation",
      });
      return Response.json(
        { success: false, error: "Missing plan for quarterly action" },
        { status: 400 },
      );
    }

    if (state.phase2Path === "executive") {
      const result = await withObservedStep(ctx, "run_executive_quarterly_pipeline", async () =>
        runExecutiveQuarterlyPipeline(
          state,
          body.plan as ExecutiveQuarterPlan,
          body.aiConfig,
        ),
      );
      ctx.finish(200, { metadata: { branch: "executive", timeMode: state.timeMode } });
      return Response.json({
        success: true,
        state: result.state,
        narrative: result.narrative,
        events: result.events,
        performanceRating: result.performanceRating ?? null,
        salaryChange: result.salaryChange ?? null,
        criticalChoices: result.criticalChoices ?? [],
        aiUsage: result.aiUsage,
      });
    }

    const result = await withObservedStep(ctx, "run_quarterly_pipeline", async () =>
      runQuarterlyPipeline(
        state,
        body.plan as QuarterPlan,
        body.aiConfig,
      ),
    );
    ctx.finish(200, { metadata: { branch: "quarterly", timeMode: state.timeMode } });
    return Response.json({
      success: true,
      state: result.state,
      narrative: result.narrative,
      events: result.events,
      performanceRating: result.performanceRating ?? null,
      salaryChange: result.salaryChange ?? null,
      criticalChoices: result.criticalChoices ?? [],
      aiUsage: result.aiUsage,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    ctx.log.error("request.error", "turn request failed", {
      errorType: "unexpected",
      errorMessage: message,
      errorStack: error instanceof Error ? error.stack : undefined,
    });
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
