import { describe, expect, it, vi } from "vitest";

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: vi.fn(() => {
    const provider = (modelId: string) => ({ modelId, provider: "openai" });
    return provider;
  }),
}));

vi.mock("@ai-sdk/anthropic", () => ({
  createAnthropic: vi.fn(() => {
    const provider = (modelId: string) => ({ modelId, provider: "anthropic" });
    return provider;
  }),
}));

vi.mock("@ai-sdk/deepseek", () => ({
  createDeepSeek: vi.fn(() => {
    const provider = (modelId: string) => ({ modelId, provider: "deepseek" });
    return provider;
  }),
}));

import { getModel, resolveAgentModel, type ModelSpec } from "@/ai/provider";
import type { AIConfig } from "@/types/settings";

describe("getModel", () => {
  it('returns an OpenAI model for "openai:gpt-4o" spec', () => {
    const model = getModel("openai:gpt-4o");
    expect(model).toBeDefined();
    expect(model).toHaveProperty("modelId", "gpt-4o");
  });

  it('returns an Anthropic model for "anthropic:claude-sonnet-4-20250514"', () => {
    const model = getModel("anthropic:claude-sonnet-4-20250514");
    expect(model).toBeDefined();
    expect(model).toHaveProperty("modelId", "claude-sonnet-4-20250514");
  });

  it('returns a DeepSeek model for "deepseek:deepseek-chat"', () => {
    const model = getModel("deepseek:deepseek-chat");
    expect(model).toBeDefined();
    expect(model).toHaveProperty("modelId", "deepseek-chat");
  });

  it("throws for unknown provider prefix", () => {
    expect(() => getModel("unknown:model" as ModelSpec)).toThrow(
      "Unknown AI provider: unknown",
    );
  });

  it("throws for malformed spec without colon", () => {
    expect(() => getModel("gpt4o" as ModelSpec)).toThrow("Invalid model spec");
  });
});

describe("getModel with dynamic API key", () => {
  it("creates a model with dynamic key when provided", () => {
    const model = getModel("openai:gpt-4o", "sk-dynamic-123");
    expect(model).toBeDefined();
    expect(model).toHaveProperty("modelId", "gpt-4o");
  });

  it("falls back to env-based provider when no dynamic key", () => {
    const model = getModel("openai:gpt-4o");
    expect(model).toBeDefined();
    expect(model).toHaveProperty("modelId", "gpt-4o");
  });
});

describe("resolveAgentModel", () => {
  it("returns env-based model when no aiConfig", () => {
    const spec = resolveAgentModel("world");
    expect(spec).toBe("openai:gpt-4o-mini");
  });

  it("uses provider default model when aiConfig has no override", () => {
    const config: AIConfig = { provider: "anthropic", apiKey: "sk-test" };
    const spec = resolveAgentModel("narrative", config);
    expect(spec).toBe("anthropic:claude-sonnet-4-20250514");
  });

  it("uses modelOverride when provided", () => {
    const config: AIConfig = {
      provider: "openai",
      apiKey: "sk-test",
      modelOverrides: { world: "openai:gpt-4o" },
    };
    const spec = resolveAgentModel("world", config);
    expect(spec).toBe("openai:gpt-4o");
  });

  it("ignores override for unrelated agent", () => {
    const config: AIConfig = {
      provider: "deepseek",
      apiKey: "dk-test",
      modelOverrides: { world: "openai:gpt-4o" },
    };
    const spec = resolveAgentModel("event", config);
    expect(spec).toBe("deepseek:deepseek-chat");
  });
});
