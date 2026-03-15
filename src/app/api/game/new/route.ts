import { createNewGame } from "@/engine/state";

export async function POST() {
  const state = createNewGame();
  return Response.json({ success: true, state });
}
