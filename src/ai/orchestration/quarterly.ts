import { runEventAgent } from "@/ai/agents/event";
import { runNarrativeAgent } from "@/ai/agents/narrative";
import { runNPCAgent } from "@/ai/agents/npc";
import { runWorldAgent } from "@/ai/agents/world";
import {
  validateEventNPCConsistency,
  validateEvents,
  validateNPCActions,
  validateChoices,
} from "@/ai/orchestration/conflict";
import {
  createQuarterSummary,
  getRecentHistory,
} from "@/ai/orchestration/history";
import { applyStatChanges } from "@/engine/attributes";
import { settleQuarter } from "@/engine/quarter";
import { enterCriticalPeriod } from "@/engine/time";
import { buildPhoneReplyContext } from "@/ai/orchestration/phone-context";
import type { QuarterPlan, CriticalChoice } from "@/types/actions";
import type {
  AgentInput,
  EventAgentOutput,
  NPCAgentOutput,
  WorldAgentOutput,
} from "@/types/agents";
import type { GameState, PhoneApp, PhoneMessage } from "@/types/game";

export interface QuarterlyPipelineResult {
  state: GameState;
  narrative: string;
  worldContext: WorldAgentOutput;
  events: EventAgentOutput["events"];
  npcActions: NPCAgentOutput["npcActions"];
  phoneMessages: Array<{
    app: PhoneApp;
    content: string;
    sender?: string;
  }>;
  performanceRating?: string;
  salaryChange?: number;
  criticalChoices?: CriticalChoice[];
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

export function deduplicateMessages(
  messages: Array<{ app: PhoneApp; content: string; sender?: string }>,
): Array<{ app: PhoneApp; content: string; sender?: string }> {
  const seen = new Set<string>();

  return messages.filter((message) => {
    const key = `${message.app}:${message.sender ?? ""}:${message.content}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export async function runQuarterlyPipeline(
  state: GameState,
  plan: QuarterPlan,
): Promise<QuarterlyPipelineResult> {
  const beforeAttributes = { ...state.player };

  const engineResult = settleQuarter(state, plan);
  const settledState = engineResult.state;

  const recentHistory = getRecentHistory(settledState.history);
  const agentInput: AgentInput = { state: settledState, recentHistory };

  const worldOutput = await runWorldAgent(agentInput);

  const rawEventOutput = await runEventAgent(agentInput, worldOutput);
  const worldValidatedEvents = validateEvents(rawEventOutput.events, worldOutput);
  const npcValidatedEvents = validateEventNPCConsistency(
    worldValidatedEvents,
    settledState.npcs,
  );
  const eventOutput: EventAgentOutput = {
    ...rawEventOutput,
    events: npcValidatedEvents,
  };

  for (const event of eventOutput.events) {
    if (event.statChanges) {
      settledState.player = applyStatChanges(settledState.player, event.statChanges);
    }
  }

  const phoneReplyContext = buildPhoneReplyContext(settledState.phoneMessages);

  const rawNPCOutput = await runNPCAgent(
    agentInput,
    worldOutput,
    eventOutput,
    plan.actions,
    phoneReplyContext,
  );
  const npcOutput = validateNPCActions(rawNPCOutput, settledState.npcs);

  for (const action of npcOutput.npcActions) {
    const npc = settledState.npcs.find((candidate) => candidate.name === action.npcName);
    if (npc) {
      npc.favor = Math.max(0, Math.min(100, npc.favor + action.favorChange));
    }
  }

  if (npcOutput.newNpcs) {
    settledState.npcs.push(...npcOutput.newNpcs);
  }

  if (npcOutput.departedNpcs) {
    for (const npcId of npcOutput.departedNpcs) {
      const npc = settledState.npcs.find((candidate) => candidate.id === npcId);
      if (npc) {
        npc.isActive = false;
      }
    }
  }

  settledState.world = {
    economyCycle: worldOutput.economy,
    industryTrends: worldOutput.trends,
    companyStatus: worldOutput.companyStatus,
  };

  const allMessages = deduplicateMessages([
    ...eventOutput.phoneMessages,
    ...npcOutput.chatMessages.map((message) => ({
      app: message.app,
      content: message.content,
      sender: message.sender,
    })),
  ]);

  for (const message of allMessages) {
    settledState.phoneMessages.push(
      createPhoneMessage(settledState.currentQuarter, message),
    );
  }

  const narrativeOutput = await runNarrativeAgent(
    agentInput,
    worldOutput,
    eventOutput,
    npcOutput,
    plan.actions,
    false,
    phoneReplyContext,
  );

  for (const key of Object.keys(settledState.player) as Array<
    keyof GameState["player"]
  >) {
    if (key === "money") {
      continue;
    }

    const value = settledState.player[key];
    settledState.player[key] = Math.max(0, Math.min(100, value));
  }

  for (const npc of settledState.npcs) {
    npc.favor = Math.max(0, Math.min(100, npc.favor));
  }

  const eventTitles = npcValidatedEvents.map((event) => event.title);
  const npcChanges = npcOutput.npcActions.map(
    (action) =>
      `${action.npcName}好感${action.favorChange > 0 ? "+" : ""}${action.favorChange}`,
  );

  const summary = createQuarterSummary(
    settledState.currentQuarter,
    beforeAttributes,
    settledState.player,
    eventTitles,
    npcChanges,
    narrativeOutput.narrativeSummary ?? narrativeOutput.narrative.slice(0, 100),
  );
  settledState.history.push(summary);

  let criticalChoices: CriticalChoice[] | undefined;
  const criticalEvent = npcValidatedEvents.find(e => e.triggersCritical && e.criticalType);
  if (criticalEvent && criticalEvent.criticalType) {
    settledState.timeMode = "critical";
    settledState.criticalPeriod = enterCriticalPeriod(criticalEvent.criticalType);
    settledState.staminaRemaining = settledState.criticalPeriod.staminaPerDay;

    const openingChoices = await runNarrativeAgent(
      { state: settledState, recentHistory: agentInput.recentHistory },
      worldOutput,
      { events: [criticalEvent], phoneMessages: [] },
      { npcActions: [], chatMessages: [] },
      [],
      true,
      `事件触发了关键期：${criticalEvent.title}`,
      true
    );

    if (openingChoices.choices) {
      criticalChoices = validateChoices(
        openingChoices.choices,
        settledState.staminaRemaining,
        settledState.criticalPeriod.type,
        settledState.player
      );
    }
  }

  return {
    state: settledState,
    narrative: narrativeOutput.narrative,
    worldContext: worldOutput,
    events: npcValidatedEvents,
    npcActions: npcOutput.npcActions,
    phoneMessages: allMessages,
    performanceRating: engineResult.performanceRating,
    salaryChange: engineResult.salaryChange,
    criticalChoices,
  };
}
