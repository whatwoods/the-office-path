import { beforeEach, describe, expect, it, vi } from "vitest";

import { emitLog } from "@/lib/observability/logger";

describe("emitLog", () => {
  const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes one-line JSON for info logs", () => {
    emitLog("info", {
      event: "request.start",
      message: "request started",
      requestId: "req_1",
      route: "/api/game/new",
      method: "POST",
    });

    const raw = infoSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(raw);
    expect(parsed.level).toBe("info");
    expect(parsed.event).toBe("request.start");
    expect(parsed.requestId).toBe("req_1");
    expect(parsed.timestamp).toBeTypeOf("string");
  });

  it("drops undefined fields", () => {
    emitLog("info", {
      event: "step.finish",
      message: "done",
      requestId: "req_2",
      durationMs: 12,
      metadata: { kept: true, skipped: undefined },
    });

    const parsed = JSON.parse(infoSpy.mock.calls[0][0] as string);
    expect(parsed.route).toBeUndefined();
    expect(parsed.metadata).toEqual({ kept: true });
  });

  it("omits errorStack in production logs", () => {
    emitLog(
      "error",
      {
        event: "request.error",
        message: "boom",
        requestId: "req_3",
        errorStack: "stack trace",
      },
      { environment: "production" },
    );

    const parsed = JSON.parse(errorSpy.mock.calls[0][0] as string);
    expect(parsed.errorStack).toBeUndefined();
  });
});
