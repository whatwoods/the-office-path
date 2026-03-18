import { AgentInputSchema } from "@/ai/schemas";
import { checkPromotion } from "@/engine/promotion";
import { createRequestContext } from "@/lib/observability/request-context";
import { withObservedStep } from "@/lib/observability/timed";
import type { GameState } from "@/types/game";

export async function POST(request: Request) {
  const ctx = createRequestContext("/api/game/state", request.method);
  ctx.log.info("request.start", "state request started");

  try {
    const body = await withObservedStep(ctx, "parse_body", async () => {
      return (await request.json()) as { state?: GameState };
    });

    if (!body.state) {
      ctx.log.warn("request.validation_failed", "state payload missing", {
        errorType: "validation",
      });
      return Response.json(
        { success: false, error: "Missing state" },
        { status: 400 },
      );
    }

    const stateCheck = AgentInputSchema.shape.state.safeParse(body.state);
    if (!stateCheck.success) {
      ctx.log.warn("request.validation_failed", "state payload invalid", {
        errorType: "validation",
        metadata: {
          issueCount: stateCheck.error.issues.length,
        },
      });
      return Response.json(
        { success: false, error: `Invalid state: ${stateCheck.error.message}` },
        { status: 400 },
      );
    }

    const promotion = await withObservedStep(ctx, "check_promotion", async () =>
      checkPromotion(body.state!),
    );
    ctx.finish(200, { metadata: { promotionEligible: promotion.eligible } });

    return Response.json({
      success: true,
      state: body.state,
      computed: {
        promotionEligible: promotion.eligible,
        promotionNextLevels: promotion.nextLevels,
        promotionFailReasons: promotion.failReasons,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    ctx.log.error("request.error", "state request failed", {
      errorType: "unexpected",
      errorMessage: message,
      errorStack: error instanceof Error ? error.stack : undefined,
    });
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
