import { runEventAgent } from "@/ai/agents/event";
import { runNarrativeAgent } from "@/ai/agents/narrative";
import { runNPCAgent } from "@/ai/agents/npc";
import { validateChoices, validateNPCActions } from "@/ai/orchestration/conflict";
import { getRecentHistory } from "@/ai/orchestration/history";
import {
  createAIUsageCollector,
  createEmptyAIUsageSummary,
  type AIUsageSummary,
} from "@/lib/aiUsage";
import type { RequestContext } from "@/lib/observability/request-context";
import { withObservedStep } from "@/lib/observability/timed";
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
import type { AIConfig } from "@/types/settings";

export interface CriticalDayPipelineResult {
  state: GameState;
  narrative: string;
  nextChoices?: CriticalChoice[];
  isComplete: boolean;
  npcActions: Array<{ npcName: string; action: string; favorChange: number }>;
  aiUsage: AIUsageSummary;
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

async function observeStep<T>(
  ctx: RequestContext | undefined,
  step: string,
  fn: () => Promise<T> | T,
  metadata?: Record<string, unknown>,
): Promise<T> {
  if (!ctx) {
    return await fn();
  }

  return withObservedStep(ctx, step, fn, metadata ? { metadata } : undefined);
}

export async function runCriticalDayPipeline(
  state: GameState,
  choice: CriticalChoice,
  aiConfig?: AIConfig,
  ctx?: RequestContext,
): Promise<CriticalDayPipelineResult> {
  const aiUsage = createEmptyAIUsageSummary();
  const collectUsage = createAIUsageCollector(aiUsage);
  const engineResult = await observeStep(ctx, "settle_critical_day", () =>
    settleCriticalDay(state, choice),
  );
  const settledState = engineResult.state;

  const storyState = await observeStep(ctx, "build_story_state", () =>
    buildCriticalStoryState(state, settledState, choice),
  );
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

  const rawNPCOutput = await observeStep(
    ctx,
    "run_npc_agent",
    () =>
      ctx
        ? runNPCAgent(
            agentInput,
            worldContext,
            { events: [], phoneMessages: [] },
            [],
            playerContext,
            aiConfig,
            collectUsage,
            ctx,
          )
        : runNPCAgent(
            agentInput,
            worldContext,
            { events: [], phoneMessages: [] },
            [],
            playerContext,
            aiConfig,
            collectUsage,
          ),
    {
      currentDay: storyState.criticalPeriod?.currentDay ?? null,
    },
  );
  const npcOutput = await observeStep(ctx, "validate_npc_actions", () =>
    validateNPCActions(rawNPCOutput, settledState.npcs),
  );

  for (const action of npcOutput.npcActions) {
    const npc = settledState.npcs.find((candidate) => candidate.name === action.npcName);
    if (npc) {
      npc.favor = Math.max(0, Math.min(100, npc.favor + action.favorChange));
    }
  }

  const eventOutput: EventAgentOutput = await observeStep(
    ctx,
    "run_event_agent",
    () =>
      ctx
        ? runEventAgent(
            agentInput,
            worldContext,
            aiConfig,
            collectUsage,
            ctx,
          )
        : runEventAgent(
            agentInput,
            worldContext,
            aiConfig,
            collectUsage,
          ),
  );

  await observeStep(ctx, "apply_event_effects", () => {
    for (const event of eventOutput.events) {
      if (event.statChanges) {
        settledState.player = applyStatChanges(settledState.player, event.statChanges);
      }
    }
  });

  const allMessages: Array<{ app: PhoneApp; content: string; sender?: string }> = [
    ...eventOutput.phoneMessages,
    ...npcOutput.chatMessages.map((message) => ({
      app: message.app,
      content: message.content,
      sender: message.sender,
    })),
  ];

  await observeStep(ctx, "append_phone_messages", () => {
    for (const message of allMessages) {
      settledState.phoneMessages.push(
        createPhoneMessage(settledState.currentQuarter, message),
      );
    }
  });

  const isCriticalStill = !engineResult.isComplete;
  const narrativeOutput = await observeStep(
    ctx,
    "run_narrative_agent",
    () =>
      ctx
        ? runNarrativeAgent(
            agentInput,
            worldContext,
            eventOutput,
            npcOutput,
            [],
            true,
            playerContext,
            isCriticalStill,
            aiConfig,
            collectUsage,
            ctx,
          )
        : runNarrativeAgent(
            agentInput,
            worldContext,
            eventOutput,
            npcOutput,
            [],
            true,
            playerContext,
            isCriticalStill,
            aiConfig,
            collectUsage,
          ),
    {
      isCriticalStill,
    },
  );

  let nextChoices: CriticalChoice[] | undefined;
  const narrativeChoices = narrativeOutput.choices;
  const criticalPeriod = settledState.criticalPeriod;

  if (isCriticalStill && narrativeChoices && criticalPeriod) {
    nextChoices = await observeStep(ctx, "validate_next_choices", () =>
      validateChoices(
        narrativeChoices,
        settledState.staminaRemaining,
        criticalPeriod.type as CriticalPeriodType,
        settledState.player,
      ),
    );
  }

  return {
    state: settledState,
    narrative: narrativeOutput.narrative,
    nextChoices,
    isComplete: engineResult.isComplete,
    npcActions: npcOutput.npcActions,
    aiUsage,
  };
}
