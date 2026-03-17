import { AgentInputSchema } from "@/ai/schemas";
import { checkPromotion } from "@/engine/promotion";
import type { GameState } from "@/types/game";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { state?: GameState };

    if (!body.state) {
      return Response.json(
        { success: false, error: "Missing state" },
        { status: 400 },
      );
    }

    const stateCheck = AgentInputSchema.shape.state.safeParse(body.state);
    if (!stateCheck.success) {
      return Response.json(
        { success: false, error: `Invalid state: ${stateCheck.error.message}` },
        { status: 400 },
      );
    }

    const promotion = checkPromotion(body.state);
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
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
