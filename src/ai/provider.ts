import { createAnthropic } from "@ai-sdk/anthropic";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createOpenAI } from "@ai-sdk/openai";

export type ModelSpec = `${"openai" | "anthropic" | "deepseek"}:${string}`;

const providers = {
  openai: createOpenAI({ apiKey: process.env.OPENAI_API_KEY ?? "" }),
  anthropic: createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" }),
  deepseek: createDeepSeek({ apiKey: process.env.DEEPSEEK_API_KEY ?? "" }),
} as const;

type ProviderName = keyof typeof providers;

export function getModel(spec: ModelSpec) {
  if (!spec.includes(":")) {
    throw new Error(
      `Invalid model spec: "${spec}". Expected format "provider:model-id"`,
    );
  }

  const [providerName, ...rest] = spec.split(":");
  const modelId = rest.join(":");

  if (!(providerName in providers)) {
    throw new Error(`Unknown AI provider: ${providerName}`);
  }

  const provider = providers[providerName as ProviderName];
  return provider(modelId);
}

export const AGENT_MODELS = {
  world: (process.env.WORLD_AGENT_MODEL ?? "openai:gpt-4o-mini") as ModelSpec,
  event: (process.env.EVENT_AGENT_MODEL ?? "openai:gpt-4o-mini") as ModelSpec,
  npc: (process.env.NPC_AGENT_MODEL ?? "openai:gpt-4o") as ModelSpec,
  narrative: (process.env.NARRATIVE_AGENT_MODEL ?? "openai:gpt-4o") as ModelSpec,
} as const;
