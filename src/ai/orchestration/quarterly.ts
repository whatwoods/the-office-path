import { runEventAgent } from "@/ai/agents/event";
import { runNarrativeAgent } from "@/ai/agents/narrative";
import { runNPCAgent } from "@/ai/agents/npc";
import { runWorldAgent } from "@/ai/agents/world";
import {
  validateChoices,
  validateEventNPCConsistency,
  validateExecutiveEvents,
  validateEvents,
  validateNPCActions,
} from "@/ai/orchestration/conflict";
import {
  createQuarterSummary,
  getRecentHistory,
} from "@/ai/orchestration/history";
import {
  createAIUsageCollector,
  createEmptyAIUsageSummary,
  type AIUsageSummary,
} from "@/lib/aiUsage";
import type { RequestContext } from "@/lib/observability/request-context";
import { withObservedStep } from "@/lib/observability/timed";
import { buildPhoneReplyContext } from "@/ai/orchestration/phone-context";
import { applyStatChanges } from "@/engine/attributes";
import { settleExecutiveQuarter } from "@/engine/executive-quarter";
import { settleQuarter } from "@/engine/quarter";
import { enterCriticalPeriod } from "@/engine/time";
import type { CriticalChoice, QuarterPlan } from "@/types/actions";
import type {
  AgentInput,
  EventAgentOutput,
  NPCAgentOutput,
  WorldAgentOutput,
} from "@/types/agents";
import type { ExecutiveQuarterPlan } from "@/types/executive";
import type {
  CriticalPeriodType,
  GameState,
  PhoneApp,
  PhoneMessage,
} from "@/types/game";
import type { AIConfig } from "@/types/settings";

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
  aiUsage: AIUsageSummary;
}

type PromptAction = Array<{ action: string; target?: string }>;

interface FinalizePipelineOptions {
  originalState: GameState;
  settledState: GameState;
  beforeAttributes: GameState["player"];
  playerActions: PromptAction;
  performanceRating?: string;
  salaryChange?: number;
  forcedCriticalType?: CriticalPeriodType | null;
  aiConfig?: AIConfig;
  ctx?: RequestContext;
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

function collectMaimaiActivity(
  state: GameState,
): AgentInput["maimaiActivity"] | undefined {
  const currentQuarterPosts = state.maimaiPosts.filter(
    (post) => post.quarter === state.currentQuarter,
  );
  const playerPosts = currentQuarterPosts.filter((post) => post.author === "player");
  const playerLikes = currentQuarterPosts
    .filter((post) => post.playerLiked)
    .map((post) => post.id);
  const playerComments = currentQuarterPosts.flatMap((post) =>
    post.comments
      .filter((comment) => comment.author === "player")
      .map((comment) => ({
        postId: post.id,
        content: comment.content,
      })),
  );

  if (
    playerPosts.length === 0 &&
    playerLikes.length === 0 &&
    playerComments.length === 0
  ) {
    return undefined;
  }

  return {
    playerPosts,
    playerLikes,
    playerComments,
  };
}

function applyNamedNpcReactions(
  state: GameState,
  reactions: Array<{ npcName: string; favorChange: number }> | undefined,
): void {
  if (!reactions) {
    return;
  }

  for (const reaction of reactions) {
    const npc = state.npcs.find((candidate) => candidate.name === reaction.npcName);
    if (!npc) {
      continue;
    }

    npc.favor = Math.max(0, Math.min(100, npc.favor + reaction.favorChange));
  }
}

function applyEventEffects(
  state: GameState,
  eventOutput: EventAgentOutput,
): void {
  for (const event of eventOutput.events) {
    if (event.statChanges) {
      state.player = applyStatChanges(state.player, event.statChanges);
    }
  }
}

function applyMaimaiResults(
  state: GameState,
  maimaiResults: EventAgentOutput["maimaiResults"],
): void {
  if (!maimaiResults) {
    return;
  }

  for (const result of maimaiResults.postResults) {
    if (result.consequences.playerEffects) {
      state.player = applyStatChanges(state.player, result.consequences.playerEffects);
    }

    applyNamedNpcReactions(state, result.consequences.npcReactions);

    const post = state.maimaiPosts.find((entry) => entry.id === result.postId);
    if (!post) {
      continue;
    }

    post.viralLevel = result.viralLevel;
    post.identityExposed = result.consequences.identityExposed;

    for (const reply of result.generatedReplies) {
      post.comments.push({
        id: `reply_${post.id}_${Math.random().toString(36).slice(2, 8)}`,
        author: "anonymous",
        content: reply.content,
        authorName: reply.sender,
      });
    }
  }

  for (const interaction of maimaiResults.interactionResults) {
    if (interaction.consequences.playerEffects) {
      state.player = applyStatChanges(
        state.player,
        interaction.consequences.playerEffects,
      );
    }

    applyNamedNpcReactions(state, interaction.consequences.npcReactions);
  }
}

function applyNPCOutput(state: GameState, npcOutput: NPCAgentOutput): void {
  for (const action of npcOutput.npcActions) {
    const npc = state.npcs.find((candidate) => candidate.name === action.npcName);
    if (npc) {
      npc.favor = Math.max(0, Math.min(100, npc.favor + action.favorChange));
    }
  }

  if (npcOutput.newNpcs) {
    state.npcs.push(...npcOutput.newNpcs);
  }

  if (npcOutput.departedNpcs) {
    for (const npcId of npcOutput.departedNpcs) {
      const npc = state.npcs.find((candidate) => candidate.id === npcId);
      if (npc) {
        npc.isActive = false;
      }
    }
  }
}

function appendPhoneMessages(
  state: GameState,
  eventOutput: EventAgentOutput,
  npcOutput: NPCAgentOutput,
): Array<{ app: PhoneApp; content: string; sender?: string }> {
  const allMessages = deduplicateMessages([
    ...eventOutput.phoneMessages,
    ...npcOutput.chatMessages.map((message) => ({
      app: message.app,
      content: message.content,
      sender: message.sender,
    })),
  ]);

  for (const message of allMessages) {
    state.phoneMessages.push(createPhoneMessage(state.currentQuarter, message));
  }

  return allMessages;
}

function clampState(state: GameState): void {
  for (const key of Object.keys(state.player) as Array<keyof GameState["player"]>) {
    if (key === "money") {
      continue;
    }

    const value = state.player[key];
    state.player[key] = Math.max(0, Math.min(100, value));
  }

  for (const npc of state.npcs) {
    npc.favor = Math.max(0, Math.min(100, npc.favor));
  }
}

async function maybeGenerateCriticalChoices(
  state: GameState,
  worldOutput: WorldAgentOutput,
  eventOutput: EventAgentOutput,
  forcedCriticalType: CriticalPeriodType | null | undefined,
  aiConfig?: AIConfig,
  aiUsage?: AIUsageSummary,
): Promise<CriticalChoice[] | undefined> {
  const criticalEvent = eventOutput.events.find(
    (event) => event.triggersCritical && event.criticalType,
  );
  const criticalToEnter =
    forcedCriticalType ?? criticalEvent?.criticalType ?? null;

  if (!criticalToEnter) {
    return undefined;
  }

  state.timeMode = "critical";
  state.criticalPeriod = enterCriticalPeriod(criticalToEnter);
  state.staminaRemaining = state.criticalPeriod.staminaPerDay;
  const collectUsage =
    aiUsage ? createAIUsageCollector(aiUsage) : undefined;

  const openingChoices = await runNarrativeAgent(
    { state, recentHistory: getRecentHistory(state.history) },
    worldOutput,
    {
      events: criticalEvent ? [criticalEvent] : [],
      phoneMessages: [],
      maimaiResults: eventOutput.maimaiResults,
    },
    { npcActions: [], chatMessages: [] },
    [],
    true,
    criticalEvent
      ? `事件触发了关键期：${criticalEvent.title}`
      : `进入关键期：${criticalToEnter}`,
    true,
    aiConfig,
    collectUsage,
  );

  if (!openingChoices.choices || !state.criticalPeriod) {
    return undefined;
  }

  return validateChoices(
    openingChoices.choices,
    state.staminaRemaining,
    state.criticalPeriod.type,
    state.player,
  );
}

async function finalizePipeline({
  originalState,
  settledState,
  beforeAttributes,
  playerActions,
  performanceRating,
  salaryChange,
  forcedCriticalType,
  aiConfig,
  ctx,
}: FinalizePipelineOptions): Promise<QuarterlyPipelineResult> {
  const aiUsage = createEmptyAIUsageSummary();
  const collectUsage = createAIUsageCollector(aiUsage);
  const recentHistory = getRecentHistory(settledState.history);
  const agentInput: AgentInput = {
    state: settledState,
    recentHistory,
    maimaiActivity: collectMaimaiActivity(originalState),
  };

  const worldOutput = await observeStep(
    ctx,
    "run_world_agent",
    () => runWorldAgent(agentInput, aiConfig, collectUsage),
    {
      phase: settledState.phase,
      currentQuarter: settledState.currentQuarter,
    },
  );

  const rawEventOutput = await observeStep(
    ctx,
    "run_event_agent",
    () =>
      runEventAgent(
        agentInput,
        worldOutput,
        aiConfig,
        collectUsage,
      ),
    {
      phase: settledState.phase,
      currentQuarter: settledState.currentQuarter,
    },
  );
  const worldValidatedEvents = await observeStep(ctx, "validate_events", () =>
    validateEvents(rawEventOutput.events, worldOutput),
  );
  const npcValidatedEvents = await observeStep(ctx, "validate_event_npc_consistency", () =>
    validateEventNPCConsistency(
      worldValidatedEvents,
      settledState.npcs,
    ),
  );
  let eventOutput: EventAgentOutput = {
    ...rawEventOutput,
    events: npcValidatedEvents,
  };

  if (settledState.phase2Path === "executive") {
    eventOutput = validateExecutiveEvents(eventOutput, settledState.npcs);
  }

  await observeStep(ctx, "apply_event_effects", () => {
    applyEventEffects(settledState, eventOutput);
    applyMaimaiResults(settledState, eventOutput.maimaiResults);
  });

  const phoneReplyContext = buildPhoneReplyContext(settledState.phoneMessages);

  const rawNPCOutput = await observeStep(
    ctx,
    "run_npc_agent",
    () =>
      runNPCAgent(
        agentInput,
        worldOutput,
        eventOutput,
        playerActions,
        phoneReplyContext,
        aiConfig,
        collectUsage,
      ),
    {
      playerActionCount: playerActions.length,
    },
  );
  const npcOutput = await observeStep(ctx, "validate_npc_actions", () =>
    validateNPCActions(rawNPCOutput, settledState.npcs),
  );

  applyNPCOutput(settledState, npcOutput);

  settledState.world = {
    economyCycle: worldOutput.economy,
    industryTrends: worldOutput.trends,
    companyStatus: worldOutput.companyStatus,
  };

  const allMessages = await observeStep(ctx, "append_phone_messages", () =>
    appendPhoneMessages(settledState, eventOutput, npcOutput),
  );

  const narrativeOutput = await observeStep(
    ctx,
    "run_narrative_agent",
    () =>
      runNarrativeAgent(
        agentInput,
        worldOutput,
        eventOutput,
        npcOutput,
        playerActions,
        false,
        phoneReplyContext,
        undefined,
        aiConfig,
        collectUsage,
      ),
    {
      messageCount: allMessages.length,
    },
  );

  clampState(settledState);

  const eventTitles = npcValidatedEvents.map((event) => event.title);
  const npcChanges = npcOutput.npcActions.map(
    (action) =>
      `${action.npcName}好感${action.favorChange > 0 ? "+" : ""}${action.favorChange}`,
  );

  const summary = await observeStep(ctx, "create_history_summary", () =>
    createQuarterSummary(
      settledState.currentQuarter,
      beforeAttributes,
      settledState.player,
      eventTitles,
      npcChanges,
      narrativeOutput.narrativeSummary ?? narrativeOutput.narrative.slice(0, 100),
    ),
  );
  settledState.history.push(summary);

  const criticalChoices = await observeStep(
    ctx,
    "maybe_generate_critical_choices",
    () =>
      maybeGenerateCriticalChoices(
        settledState,
        worldOutput,
        eventOutput,
        forcedCriticalType,
        aiConfig,
        aiUsage,
      ),
    {
      forcedCriticalType: forcedCriticalType ?? null,
    },
  );

  return {
    state: settledState,
    narrative: narrativeOutput.narrative,
    worldContext: worldOutput,
    events: npcValidatedEvents,
    npcActions: npcOutput.npcActions,
    phoneMessages: allMessages,
    performanceRating,
    salaryChange,
    criticalChoices,
    aiUsage,
  };
}

export async function runExecutiveQuarterlyPipeline(
  state: GameState,
  plan: ExecutiveQuarterPlan,
  aiConfig?: AIConfig,
  ctx?: RequestContext,
): Promise<QuarterlyPipelineResult> {
  const beforeAttributes = { ...state.player };
  const engineResult = await observeStep(ctx, "settle_executive_quarter_engine", () =>
    settleExecutiveQuarter(state, plan),
  );

  return finalizePipeline({
    originalState: state,
    settledState: engineResult.state,
    beforeAttributes,
    playerActions: plan.actions,
    forcedCriticalType:
      engineResult.triggerCriticalType ??
      (engineResult.triggerBoardReview ? "board_review" : null),
    aiConfig,
    ctx,
  });
}

export async function runQuarterlyPipeline(
  state: GameState,
  plan: QuarterPlan,
  aiConfig?: AIConfig,
  ctx?: RequestContext,
): Promise<QuarterlyPipelineResult> {
  if (state.phase2Path === "executive") {
    return runExecutiveQuarterlyPipeline(
      state,
      plan as unknown as ExecutiveQuarterPlan,
      aiConfig,
      ctx,
    );
  }

  const beforeAttributes = { ...state.player };
  const engineResult = await observeStep(ctx, "settle_quarter_engine", () =>
    settleQuarter(state, plan),
  );

  return finalizePipeline({
    originalState: state,
    settledState: engineResult.state,
    beforeAttributes,
    playerActions: plan.actions,
    performanceRating: engineResult.performanceRating,
    salaryChange: engineResult.salaryChange,
    aiConfig,
    ctx,
  });
}
