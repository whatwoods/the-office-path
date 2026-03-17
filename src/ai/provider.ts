import { createAnthropic } from "@ai-sdk/anthropic";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createOpenAI } from "@ai-sdk/openai";
import type { AIConfig } from "@/types/settings";

export type { AIConfig } from "@/types/settings";

export type ModelSpec = `${"openai" | "anthropic" | "deepseek"}:${string}`;

const providers = {
  openai: createOpenAI({ apiKey: process.env.OPENAI_API_KEY ?? "" }),
  anthropic: createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" }),
  deepseek: createDeepSeek({ apiKey: process.env.DEEPSEEK_API_KEY ?? "" }),
} as const;

type ProviderName = keyof typeof providers;

const providerFactories = {
  openai: createOpenAI,
  anthropic: createAnthropic,
  deepseek: createDeepSeek,
} as const;

export function getModel(spec: ModelSpec, dynamicApiKey?: string) {
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

  if (dynamicApiKey) {
    const factory = providerFactories[providerName as ProviderName];
    const dynamicProvider = factory({ apiKey: dynamicApiKey });
    return dynamicProvider(modelId);
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

const DEFAULT_MODELS_BY_PROVIDER: Record<
  ProviderName,
  Record<keyof typeof AGENT_MODELS, string>
> = {
  openai: {
    world: "gpt-4o-mini",
    event: "gpt-4o-mini",
    npc: "gpt-4o",
    narrative: "gpt-4o",
  },
  anthropic: {
    world: "claude-sonnet-4-20250514",
    event: "claude-sonnet-4-20250514",
    npc: "claude-sonnet-4-20250514",
    narrative: "claude-sonnet-4-20250514",
  },
  deepseek: {
    world: "deepseek-chat",
    event: "deepseek-chat",
    npc: "deepseek-chat",
    narrative: "deepseek-chat",
  },
};

export function resolveAgentModel(
  agent: keyof typeof AGENT_MODELS,
  aiConfig?: AIConfig,
): ModelSpec {
  if (!aiConfig) {
    return AGENT_MODELS[agent];
  }

  const override = aiConfig.modelOverrides?.[agent];
  if (override) {
    return override as ModelSpec;
  }

  const modelId = DEFAULT_MODELS_BY_PROVIDER[aiConfig.provider][agent];
  return `${aiConfig.provider}:${modelId}` as ModelSpec;
}
