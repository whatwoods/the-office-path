import { runEventAgent } from "@/ai/agents/event";
import { runNarrativeAgent } from "@/ai/agents/narrative";
import { runNPCAgent } from "@/ai/agents/npc";
import { validateChoices, validateNPCActions } from "@/ai/orchestration/conflict";
import { getRecentHistory } from "@/ai/orchestration/history";
import { buildPhoneReplyContext } from "@/ai/orchestration/phone-context";
import { applyStatChanges } from "@/engine/attributes";
import { settleCriticalDay } from "@/engine/critical-day";
import type { CriticalChoice } from "@/types/actions";
import type {
  AgentInput,
  EventAgentOutput,
  WorldAgentOutput,
} from "@/types/agents";
import type { CriticalPeriodType, GameState, PhoneApp, PhoneMessage } from "@/types/game";

export interface CriticalDayPipelineResult {
  state: GameState;
  narrative: string;
  nextChoices?: CriticalChoice[];
  isComplete: boolean;
  npcActions: Array<{ npcName: string; action: string; favorChange: number }>;
}

function buildCriticalStoryState(
  originalState: GameState,
  settledState: GameState,
  choice: CriticalChoice,
): GameState {
  const storyState: GameState = JSON.parse(JSON.stringify(originalState));

  storyState.player = JSON.parse(JSON.stringify(settledState.player));
  storyState.npcs = JSON.parse(JSON.stringify(settledState.npcs));
  storyState.world = JSON.parse(JSON.stringify(settledState.world));
  storyState.phoneMessages = JSON.parse(JSON.stringify(settledState.phoneMessages));
  storyState.history = JSON.parse(JSON.stringify(settledState.history));
  storyState.staminaRemaining = Math.max(
    0,
    originalState.staminaRemaining - choice.staminaCost,
  );

  return storyState;
}

function createPhoneMessage(
  quarter: number,
  message: { app: PhoneApp; content: string; sender?: string },
): PhoneMessage {
  const randomSuffix = Math.random().toString(36).slice(2, 8);

  return {
    id: `msg_q${quarter}_${randomSuffix}`,
    app: message.app,
    sender: message.sender ?? "系统",
    content: message.content,
    read: false,
    quarter,
  };
}

export async function runCriticalDayPipeline(
  state: GameState,
  choice: CriticalChoice,
): Promise<CriticalDayPipelineResult> {
  const engineResult = settleCriticalDay(state, choice);
  const settledState = engineResult.state;

  const storyState = buildCriticalStoryState(state, settledState, choice);
  const recentHistory = getRecentHistory(storyState.history);
  const agentInput: AgentInput = { state: storyState, recentHistory };

  const worldContext: WorldAgentOutput = {
    economy: storyState.world.economyCycle,
    trends: storyState.world.industryTrends,
    companyStatus: storyState.world.companyStatus,
    newsItems: [],
  };

  const phoneReplyContext = buildPhoneReplyContext(storyState.phoneMessages);

  const playerContext = [
    `玩家选择了：${choice.label}（${choice.category}）`,
    phoneReplyContext,
  ].filter(Boolean).join('\n');

  const rawNPCOutput = await runNPCAgent(
    agentInput,
    worldContext,
    { events: [], phoneMessages: [] },
    [],
    playerContext,
  );
  const npcOutput = validateNPCActions(rawNPCOutput, settledState.npcs);

  for (const action of npcOutput.npcActions) {
    const npc = settledState.npcs.find((candidate) => candidate.name === action.npcName);
    if (npc) {
      npc.favor = Math.max(0, Math.min(100, npc.favor + action.favorChange));
    }
  }

  const eventOutput: EventAgentOutput = await runEventAgent(agentInput, worldContext);

  for (const event of eventOutput.events) {
    if (event.statChanges) {
      settledState.player = applyStatChanges(settledState.player, event.statChanges);
    }
  }

  const allMessages: Array<{ app: PhoneApp; content: string; sender?: string }> = [
    ...eventOutput.phoneMessages,
    ...npcOutput.chatMessages.map((message) => ({
      app: message.app,
      content: message.content,
      sender: message.sender,
    })),
  ];

  for (const message of allMessages) {
    settledState.phoneMessages.push(
      createPhoneMessage(settledState.currentQuarter, message),
    );
  }

  const isCriticalStill = !engineResult.isComplete;
  const narrativeOutput = await runNarrativeAgent(
    agentInput,
    worldContext,
    eventOutput,
    npcOutput,
    [],
    true,
    playerContext,
    isCriticalStill,
  );

  let nextChoices: CriticalChoice[] | undefined;
  if (isCriticalStill && narrativeOutput.choices && settledState.criticalPeriod) {
    nextChoices = validateChoices(
      narrativeOutput.choices,
      settledState.staminaRemaining,
      settledState.criticalPeriod.type as CriticalPeriodType,
      settledState.player,
    );
  }

  return {
    state: settledState,
    narrative: narrativeOutput.narrative,
    nextChoices,
    isComplete: engineResult.isComplete,
    npcActions: npcOutput.npcActions,
  };
}
