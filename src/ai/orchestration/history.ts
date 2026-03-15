import type { PlayerAttributes, QuarterSummary } from "@/types/game";

const MAX_RECENT_HISTORY = 3;

export function getRecentHistory(history: QuarterSummary[]): QuarterSummary[] {
  if (history.length <= MAX_RECENT_HISTORY) {
    return history;
  }

  return history.slice(-MAX_RECENT_HISTORY);
}

export function createQuarterSummary(
  quarter: number,
  before: PlayerAttributes,
  after: PlayerAttributes,
  keyEvents: string[],
  npcChanges: string[],
  narrativeSummary: string,
): QuarterSummary {
  const statChanges: Partial<PlayerAttributes> = {};

  for (const key of Object.keys(before) as Array<keyof PlayerAttributes>) {
    const diff = after[key] - before[key];
    if (diff !== 0) {
      statChanges[key] = diff;
    }
  }

  return {
    quarter,
    keyEvents,
    statChanges,
    npcChanges,
    narrativeSummary,
  };
}
