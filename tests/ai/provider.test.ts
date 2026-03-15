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

import { getModel, type ModelSpec } from "@/ai/provider";

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
