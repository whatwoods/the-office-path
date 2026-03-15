import { CRITICAL_PERIOD_CATEGORIES } from "@/ai/schemas";
import type { NPCAgentOutput, WorldAgentOutput } from "@/types/agents";
import type { CriticalChoice } from "@/types/actions";
import type { GameEvent } from "@/types/events";
import type { CriticalPeriodType, NPC, PlayerAttributes } from "@/types/game";

const MAX_DISCARDS_PER_QUARTER = 2;
const MAX_FAVOR_CHANGE_PER_ACTION = 20;
const BOOM_INCOMPATIBLE_KEYWORDS = ["裁员", "倒闭", "破产", "大萧条", "寒冬"];

const PERSONALITY_CONTRADICTION_MAP: Record<string, string[]> = {
  和善: ["暴怒", "大骂", "破口大骂", "发飙", "暴打"],
  内向: ["公开演讲", "高调", "大声宣布"],
  精于算计: ["冲动", "鲁莽"],
  热心: ["冷漠", "拒绝帮忙", "袖手旁观"],
};

export function validateEvents(
  events: GameEvent[],
  worldContext: WorldAgentOutput,
): GameEvent[] {
  if (worldContext.economy !== "boom") {
    return events;
  }

  return events.filter((event) => {
    if (event.type !== "industry" && event.severity !== "critical") {
      return true;
    }

    const text = `${event.title}${event.description}`;
    return !BOOM_INCOMPATIBLE_KEYWORDS.some((keyword) => text.includes(keyword));
  });
}

export function validateEventNPCConsistency(
  events: GameEvent[],
  npcs: NPC[],
): GameEvent[] {
  let discardCount = 0;

  return events.filter((event) => {
    if (discardCount >= MAX_DISCARDS_PER_QUARTER) {
      return true;
    }

    const text = `${event.title}${event.description}`;

    for (const npc of npcs) {
      if (!npc.isActive || !text.includes(npc.name)) {
        continue;
      }

      for (const [trait, contradictions] of Object.entries(
        PERSONALITY_CONTRADICTION_MAP,
      )) {
        if (
          npc.personality.includes(trait) &&
          contradictions.some((contradiction) => text.includes(contradiction))
        ) {
          discardCount += 1;
          return false;
        }
      }
    }

    return true;
  });
}

export function validateNPCActions(
  npcOutput: NPCAgentOutput,
  activeNpcs: NPC[],
): NPCAgentOutput {
  const activeNames = new Set(
    activeNpcs.filter((npc) => npc.isActive).map((npc) => npc.name),
  );
  let discardCount = 0;

  const npcActions = npcOutput.npcActions
    .filter((action) => {
      if (activeNames.has(action.npcName)) {
        return true;
      }

      if (discardCount < MAX_DISCARDS_PER_QUARTER) {
        discardCount += 1;
        return false;
      }

      return true;
    })
    .map((action) => ({
      ...action,
      favorChange: Math.max(
        -MAX_FAVOR_CHANGE_PER_ACTION,
        Math.min(MAX_FAVOR_CHANGE_PER_ACTION, action.favorChange),
      ),
    }));

  const chatMessages = npcOutput.chatMessages.filter((message) =>
    activeNames.has(message.sender),
  );

  return {
    ...npcOutput,
    npcActions,
    chatMessages,
  };
}

function clampStatChanges(
  statChanges: Partial<PlayerAttributes> | undefined,
  playerAttributes: PlayerAttributes,
): Partial<PlayerAttributes> | undefined {
  if (!statChanges) {
    return undefined;
  }

  const clampedEntries = Object.entries(statChanges).map(([key, value]) => {
    if (key === "money") {
      return [key, value];
    }

    const currentValue = playerAttributes[key as keyof PlayerAttributes] ?? 0;
    const numericValue = value ?? 0;
    const clampedValue = Math.max(
      -currentValue,
      Math.min(100 - currentValue, numericValue),
    );

    return [key, clampedValue];
  });

  return Object.fromEntries(clampedEntries) as Partial<PlayerAttributes>;
}

function sanitizeChoice(
  choice: CriticalChoice,
  playerAttributes: PlayerAttributes,
): CriticalChoice {
  return {
    ...choice,
    effects: {
      ...choice.effects,
      statChanges: clampStatChanges(choice.effects.statChanges, playerAttributes),
      riskEvent: choice.effects.riskEvent
        ? {
            ...choice.effects.riskEvent,
            statChanges: clampStatChanges(
              choice.effects.riskEvent.statChanges,
              playerAttributes,
            ),
          }
        : undefined,
    },
  };
}

export function validateChoices(
  choices: CriticalChoice[],
  remainingStamina: number,
  criticalType: CriticalPeriodType,
  playerAttributes: PlayerAttributes,
): CriticalChoice[] {
  const allowedCategories = CRITICAL_PERIOD_CATEGORIES[criticalType] ?? [];

  let validChoices = choices
    .filter((choice) => {
      if (choice.staminaCost > remainingStamina) {
        return false;
      }

      if (
        allowedCategories.length > 0 &&
        !allowedCategories.includes(choice.category)
      ) {
        return false;
      }

      return true;
    })
    .map((choice) => sanitizeChoice(choice, playerAttributes));

  if (validChoices.length === 0 && choices.length > 0) {
    const fallback = sanitizeChoice(choices[0], playerAttributes);
    validChoices = [
      {
        ...fallback,
        staminaCost: Math.min(fallback.staminaCost, remainingStamina),
        category:
          allowedCategories.length > 0
            ? allowedCategories[0]
            : fallback.category,
      },
    ];
  }

  return validChoices;
}
