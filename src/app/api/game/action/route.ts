import { settleCriticalDay } from "@/engine/critical-day";
import { settleQuarter } from "@/engine/quarter";
import type { CriticalChoice, QuarterPlan } from "@/types/actions";
import type { GameState } from "@/types/game";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      state?: GameState;
      plan?: QuarterPlan;
      choice?: CriticalChoice;
    };

    if (!body.state) {
      return Response.json(
        { success: false, error: "Missing state" },
        { status: 400 },
      );
    }

    if (body.state.timeMode === "critical") {
      if (!body.choice) {
        return Response.json(
          { success: false, error: "Missing choice for critical period action" },
          { status: 400 },
        );
      }

      const result = settleCriticalDay(body.state, body.choice);
      return Response.json({
        success: true,
        state: result.state,
        isComplete: result.isComplete,
      });
    }

    if (!body.plan) {
      return Response.json(
        { success: false, error: "Missing plan for quarterly action" },
        { status: 400 },
      );
    }

    const result = settleQuarter(body.state, body.plan);
    return Response.json({
      success: true,
      state: result.state,
      performanceRating: result.performanceRating,
      salaryChange: result.salaryChange,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ success: false, error: message }, { status: 400 });
  }
}
