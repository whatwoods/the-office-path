import type { CriticalChoice } from "./actions";
import type { GameEvent } from "./events";
import type { GameState, NPC, PhoneApp, QuarterSummary } from "./game";

export type EconomyStatus = "boom" | "stable" | "winter";

export type CompanyTrend = "expanding" | "stable" | "shrinking";

export const ECONOMY_COEFFICIENT: Record<EconomyStatus, number> = {
  boom: 1.3,
  stable: 1.0,
  winter: 0.6,
};

export interface AgentInput {
  state: GameState;
  recentHistory: QuarterSummary[];
}

export interface WorldAgentOutput {
  economy: EconomyStatus;
  trends: string[];
  companyStatus: CompanyTrend;
  newsItems: string[];
}

export interface EventAgentOutput {
  events: GameEvent[];
  phoneMessages: Array<{
    app: PhoneApp;
    content: string;
    sender?: string;
  }>;
}

export interface NPCAgentOutput {
  npcActions: Array<{
    npcName: string;
    action: string;
    dialogue?: string;
    favorChange: number;
    reason: string;
  }>;
  chatMessages: Array<{
    app: PhoneApp;
    sender: string;
    content: string;
    replyOptions?: string[];
  }>;
  newNpcs?: NPC[];
  departedNpcs?: string[];
}

export interface NarrativeAgentOutput {
  narrative: string;
  narrativeSummary?: string;
  choices?: CriticalChoice[];
}
