import { describe, expect, it } from "vitest";

import { createRequestContext } from "@/lib/observability/request-context";
import { withObservedStep } from "@/lib/observability/timed";
import { captureObservabilityLogs } from "../../helpers/observability";

describe("withObservedStep", () => {
  it("logs start and finish around a successful step", async () => {
    const logs = captureObservabilityLogs();
    const ctx = createRequestContext("/api/game/new", "POST");

    const result = await withObservedStep(ctx, "build_state", async () => "ok", {
      metadata: { phase: 1 },
    });

    expect(result).toBe("ok");
    const parsed = logs.all();
    expect(parsed.some((entry) => entry.event === "step.start")).toBe(true);
    expect(parsed.some((entry) => entry.event === "step.finish")).toBe(true);
    logs.restore();
  });

  it("logs step.error and rethrows", async () => {
    const logs = captureObservabilityLogs();
    const ctx = createRequestContext("/api/game/new", "POST");

    await expect(
      withObservedStep(ctx, "explode", async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    const parsed = logs.all();
    expect(parsed.some((entry) => entry.event === "step.error")).toBe(true);
    logs.restore();
  });
});
