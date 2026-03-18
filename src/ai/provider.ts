import type { LanguageModel } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { PROVIDER_CATALOG, type AgentName } from "@/ai/providerCatalog";
import type { AIConfig, AIProvider } from "@/types/settings";

export type { AIConfig } from "@/types/settings";

export type ModelSpec = `${AIProvider}:${string}`;

type ModelProvider = (modelId: string) => LanguageModel;

function getProviderApiKey(providerName: AIProvider): string {
  const envApiKey = PROVIDER_CATALOG[providerName].envApiKey;
  return process.env[envApiKey] ?? "";
}

function createProvider(
  providerName: AIProvider,
  apiKey: string,
  baseUrl?: string,
): ModelProvider {
  const metadata = PROVIDER_CATALOG[providerName];

  if (metadata.kind === "anthropic") {
    return createAnthropic({ apiKey });
  }

  if (metadata.kind === "gemini") {
    return createGoogleGenerativeAI({
      apiKey,
      baseURL: baseUrl,
      name: "gemini",
    });
  }

  return createOpenAI({
    apiKey,
    baseURL: baseUrl,
    name: providerName,
  });
}

const providers = Object.fromEntries(
  (Object.keys(PROVIDER_CATALOG) as AIProvider[]).map((providerName) => {
    const metadata = PROVIDER_CATALOG[providerName];
    return [
      providerName,
      createProvider(
        providerName,
        getProviderApiKey(providerName),
        metadata.defaultBaseUrl,
      ),
    ];
  }),
) as Record<AIProvider, ModelProvider>;

function toModelSpec(providerName: AIProvider, model: string): ModelSpec {
  if (model.includes(":")) {
    return model as ModelSpec;
  }

  return `${providerName}:${model}` as ModelSpec;
}

export function getModel(
  spec: ModelSpec,
  dynamicApiKey?: string,
  dynamicBaseUrl?: string,
): LanguageModel {
  if (!spec.includes(":")) {
    throw new Error(
      `Invalid model spec: "${spec}". Expected format "provider:model-id"`,
    );
  }

  const [providerName, ...rest] = spec.split(":");
  const modelId = rest.join(":");

  if (!modelId) {
    throw new Error(
      `Invalid model spec: "${spec}". Expected format "provider:model-id"`,
    );
  }

  if (!(providerName in PROVIDER_CATALOG)) {
    throw new Error(`Unknown AI provider: ${providerName}`);
  }

  const provider = providerName as AIProvider;
  const metadata = PROVIDER_CATALOG[provider];
  const hasDynamicApiKey = dynamicApiKey !== undefined;
  const normalizedDynamicBaseUrl = dynamicBaseUrl?.trim() || undefined;
  const hasDynamicBaseUrl = normalizedDynamicBaseUrl !== undefined;

  if (hasDynamicApiKey || hasDynamicBaseUrl) {
    const dynamicProvider = createProvider(
      provider,
      dynamicApiKey ?? getProviderApiKey(provider),
      normalizedDynamicBaseUrl ?? metadata.defaultBaseUrl,
    );
    return dynamicProvider(modelId);
  }

  return providers[provider](modelId);
}

export const AGENT_MODELS = {
  world: (process.env.WORLD_AGENT_MODEL ?? "openai:gpt-4o-mini") as ModelSpec,
  event: (process.env.EVENT_AGENT_MODEL ?? "openai:gpt-4o-mini") as ModelSpec,
  npc: (process.env.NPC_AGENT_MODEL ?? "openai:gpt-4o") as ModelSpec,
  narrative: (process.env.NARRATIVE_AGENT_MODEL ?? "openai:gpt-4o") as ModelSpec,
} as const;

export function resolveAgentModel(
  agent: AgentName,
  aiConfig?: AIConfig,
): ModelSpec {
  if (!aiConfig) {
    return AGENT_MODELS[agent];
  }

  const override = aiConfig.modelOverrides?.[agent];
  if (override) {
    return toModelSpec(aiConfig.provider, override);
  }

  if (aiConfig.defaultModel) {
    return toModelSpec(aiConfig.provider, aiConfig.defaultModel);
  }

  const providerDefault = PROVIDER_CATALOG[aiConfig.provider].defaultModels?.[agent];
  if (providerDefault) {
    return `${aiConfig.provider}:${providerDefault}` as ModelSpec;
  }

  if (aiConfig.provider === "custom") {
    throw new Error("Custom provider requires a default model or agent override");
  }

  return AGENT_MODELS[agent];
}
