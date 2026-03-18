import { describe, expect, it } from "vitest";

import { createRequestContext } from "@/lib/observability/request-context";
import { captureObservabilityLogs } from "../../helpers/observability";

describe("createRequestContext", () => {
  it("creates a requestId and logs request lifecycle events", () => {
    const logs = captureObservabilityLogs();
    const ctx = createRequestContext("/api/game/state", "POST");

    ctx.log.info("request.start", "start");
    ctx.finish(200, { metadata: { branch: "state" } });

    const parsed = logs.all();
    expect(ctx.requestId).toMatch(/^req_/);
    expect(parsed[0].event).toBe("request.start");
    expect(parsed[1].event).toBe("request.finish");
    expect(parsed[1].statusCode).toBe(200);
    logs.restore();
  });
});
