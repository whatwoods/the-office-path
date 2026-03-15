import { createNewGame } from "@/engine/state";
import { runNarrativeAgent } from "@/ai/agents/narrative";
import { validateChoices } from "@/ai/orchestration/conflict";
import type { AgentInput } from "@/types/agents";
import type { CriticalPeriodType } from "@/types/game";

export async function POST() {
  const state = createNewGame();
  
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
    "玩家入职了新公司。",
    true
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
    criticalChoices 
  });
}
