import type { AIProvider } from "@/types/settings";

export type AgentName = "world" | "event" | "npc" | "narrative";

type ProviderKind = "openai-compatible" | "anthropic" | "gemini";

export interface ProviderCatalogEntry {
  label: string;
  kind: ProviderKind;
  envApiKey: string;
  defaultBaseUrl?: string;
  defaultModels?: Partial<Record<AgentName, string>>;
}

export const PROVIDER_CATALOG: Record<AIProvider, ProviderCatalogEntry> = {
  openai: {
    label: "OpenAI",
    kind: "openai-compatible",
    envApiKey: "OPENAI_API_KEY",
    defaultBaseUrl: "https://api.openai.com/v1",
    defaultModels: {
      world: "gpt-4o-mini",
      event: "gpt-4o-mini",
      npc: "gpt-4o",
      narrative: "gpt-4o",
    },
  },
  anthropic: {
    label: "Anthropic",
    kind: "anthropic",
    envApiKey: "ANTHROPIC_API_KEY",
    defaultModels: {
      world: "claude-sonnet-4-20250514",
      event: "claude-sonnet-4-20250514",
      npc: "claude-sonnet-4-20250514",
      narrative: "claude-sonnet-4-20250514",
    },
  },
  deepseek: {
    label: "DeepSeek",
    kind: "openai-compatible",
    envApiKey: "DEEPSEEK_API_KEY",
    defaultBaseUrl: "https://api.deepseek.com/v1",
    defaultModels: {
      world: "deepseek-chat",
      event: "deepseek-chat",
      npc: "deepseek-chat",
      narrative: "deepseek-chat",
    },
  },
  siliconflow: {
    label: "硅基流动",
    kind: "openai-compatible",
    envApiKey: "SILICONFLOW_API_KEY",
    defaultBaseUrl: "https://api.siliconflow.cn/v1",
    defaultModels: {
      world: "deepseek-ai/DeepSeek-V3",
      event: "deepseek-ai/DeepSeek-V3",
      npc: "deepseek-ai/DeepSeek-V3",
      narrative: "deepseek-ai/DeepSeek-V3",
    },
  },
  modelscope: {
    label: "魔搭",
    kind: "openai-compatible",
    envApiKey: "MODELSCOPE_API_KEY",
    defaultBaseUrl: "https://api-inference.modelscope.cn/v1",
    defaultModels: {
      world: "Qwen/Qwen2.5-72B-Instruct",
      event: "Qwen/Qwen2.5-72B-Instruct",
      npc: "Qwen/Qwen2.5-72B-Instruct",
      narrative: "Qwen/Qwen2.5-72B-Instruct",
    },
  },
  bailian: {
    label: "阿里云百炼",
    kind: "openai-compatible",
    envApiKey: "BAILIAN_API_KEY",
    defaultBaseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    defaultModels: {
      world: "qwen-plus",
      event: "qwen-plus",
      npc: "qwen-plus",
      narrative: "qwen-plus",
    },
  },
  longcat: {
    label: "龙猫",
    kind: "openai-compatible",
    envApiKey: "LONGCAT_API_KEY",
    defaultBaseUrl: "https://api.longcat.chat/v1",
    defaultModels: {
      world: "longcat-flash-chat",
      event: "longcat-flash-chat",
      npc: "longcat-flash-chat",
      narrative: "longcat-flash-chat",
    },
  },
  gemini: {
    label: "Gemini",
    kind: "gemini",
    envApiKey: "GOOGLE_GENERATIVE_AI_API_KEY",
    defaultModels: {
      world: "gemini-2.5-flash",
      event: "gemini-2.5-flash",
      npc: "gemini-2.5-pro",
      narrative: "gemini-2.5-pro",
    },
  },
  custom: {
    label: "自定义",
    kind: "openai-compatible",
    envApiKey: "CUSTOM_AI_API_KEY",
  },
};
