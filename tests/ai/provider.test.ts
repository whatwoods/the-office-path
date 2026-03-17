import { describe, expect, it, vi } from "vitest";

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: vi.fn((config?: { baseURL?: string; name?: string }) => {
    const provider = (modelId: string) => ({
      modelId,
      provider: config?.name ?? "openai",
      baseURL: config?.baseURL,
    });
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

vi.mock("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: vi.fn(() => {
    const provider = (modelId: string) => ({ modelId, provider: "gemini" });
    return provider;
  }),
}));

import { createOpenAI } from "@ai-sdk/openai";
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

  it("supports custom provider with dynamic baseUrl", () => {
    const model = getModel(
      "custom:office-custom-model",
      "sk-custom-123",
      "https://custom.provider",
    );

    expect(model).toBeDefined();
    expect(model).toHaveProperty("modelId", "office-custom-model");
    expect(model).toHaveProperty("provider", "custom");
    expect(model).toHaveProperty("baseURL", "https://custom.provider");
    expect(vi.mocked(createOpenAI)).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: "sk-custom-123",
        baseURL: "https://custom.provider",
        name: "custom",
      }),
    );
  });

  it("falls back to the provider default base URL when dynamicBaseUrl is blank", () => {
    const model = getModel("deepseek:deepseek-chat", "dk-dynamic-123", "");

    expect(model).toBeDefined();
    expect(model).toHaveProperty("modelId", "deepseek-chat");
    expect(model).toHaveProperty("baseURL", "https://api.deepseek.com/v1");
  });

  it("falls back to env-based provider when no dynamic key", () => {
    const model = getModel("openai:gpt-4o");
    expect(model).toBeDefined();
    expect(model).toHaveProperty("modelId", "gpt-4o");
  });

  it('returns a Gemini model for "gemini:gemini-2.5-flash"', () => {
    const model = getModel("gemini:gemini-2.5-flash");
    expect(model).toBeDefined();
    expect(model).toHaveProperty("modelId", "gemini-2.5-flash");
    expect(model).toHaveProperty("provider", "gemini");
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

  it("uses defaultModel when aiConfig has no override", () => {
    const config: AIConfig = {
      provider: "anthropic",
      apiKey: "sk-test",
      defaultModel: "claude-3-7-sonnet-latest",
    };
    const spec = resolveAgentModel("narrative", config);
    expect(spec).toBe("anthropic:claude-3-7-sonnet-latest");
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

  it("requires a default model or override for custom providers", () => {
    const config: AIConfig = {
      provider: "custom",
      apiKey: "sk-test",
      baseUrl: "https://example.com/v1",
    };

    expect(() => resolveAgentModel("world", config)).toThrow(
      "Custom provider requires a default model or agent override",
    );
  });
});
