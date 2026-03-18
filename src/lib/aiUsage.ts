import type { AgentName } from "@/ai/providerCatalog";

export interface AgentUsageSummary {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  model: string;
}

export interface AIUsageSummary {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  byAgent: Record<AgentName, AgentUsageSummary>;
}

export interface AIUsageRecord {
  agent: AgentName;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export type AIUsageCollector = (record: AIUsageRecord) => void;

function createEmptyAgentUsageSummary(): AgentUsageSummary {
  return {
    calls: 0,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    model: "",
  };
}

export function createEmptyAIUsageSummary(): AIUsageSummary {
  return {
    calls: 0,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    byAgent: {
      world: createEmptyAgentUsageSummary(),
      event: createEmptyAgentUsageSummary(),
      npc: createEmptyAgentUsageSummary(),
      narrative: createEmptyAgentUsageSummary(),
    },
  };
}

export function normalizeAIUsage(
  usage:
    | {
        inputTokens?: number;
        outputTokens?: number;
        totalTokens?: number;
      }
    | undefined,
): Pick<AIUsageRecord, "inputTokens" | "outputTokens" | "totalTokens"> {
  const inputTokens = usage?.inputTokens ?? 0;
  const outputTokens = usage?.outputTokens ?? 0;
  const totalTokens = usage?.totalTokens ?? inputTokens + outputTokens;

  return {
    inputTokens,
    outputTokens,
    totalTokens,
  };
}

export function recordAIUsage(
  summary: AIUsageSummary,
  record: AIUsageRecord,
): AIUsageSummary {
  summary.calls += 1;
  summary.inputTokens += record.inputTokens;
  summary.outputTokens += record.outputTokens;
  summary.totalTokens += record.totalTokens;

  const agentSummary = summary.byAgent[record.agent];
  agentSummary.calls += 1;
  agentSummary.inputTokens += record.inputTokens;
  agentSummary.outputTokens += record.outputTokens;
  agentSummary.totalTokens += record.totalTokens;
  agentSummary.model = record.model;

  return summary;
}

export function mergeAIUsageSummaries(
  ...summaries: Array<AIUsageSummary | null | undefined>
): AIUsageSummary {
  const merged = createEmptyAIUsageSummary();

  for (const summary of summaries) {
    if (!summary) {
      continue;
    }

    merged.calls += summary.calls;
    merged.inputTokens += summary.inputTokens;
    merged.outputTokens += summary.outputTokens;
    merged.totalTokens += summary.totalTokens;

    for (const agent of Object.keys(merged.byAgent) as AgentName[]) {
      const source = summary.byAgent[agent];
      const target = merged.byAgent[agent];
      target.calls += source.calls;
      target.inputTokens += source.inputTokens;
      target.outputTokens += source.outputTokens;
      target.totalTokens += source.totalTokens;
      if (source.model) {
        target.model = source.model;
      }
    }
  }

  return merged;
}

export function createAIUsageCollector(summary: AIUsageSummary): AIUsageCollector {
  return (record) => {
    recordAIUsage(summary, record);
  };
}
