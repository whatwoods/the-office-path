import { describe, expect, it } from "vitest";

import { POST } from "@/app/api/game/state/route";
import { createNewGame } from "@/engine/state";
import { captureObservabilityLogs } from "../../../helpers/observability";

describe("POST /api/game/state", () => {
  it("returns computed promotion info for a valid state", async () => {
    const state = createNewGame();
    state.job.totalQuarters = 1;

    const req = new Request("http://localhost/api/game/state", {
      method: "POST",
      body: JSON.stringify({ state }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.computed).toEqual({
      promotionEligible: true,
      promotionNextLevels: ["L2"],
      promotionFailReasons: [],
    });
  });

  it("returns 400 for an invalid state payload", async () => {
    const req = new Request("http://localhost/api/game/state", {
      method: "POST",
      body: JSON.stringify({
        state: {
          phase: 1,
          currentQuarter: "bad-quarter",
        },
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toContain("Invalid state");
  });

  it("logs validation failures for invalid state payloads", async () => {
    const logs = captureObservabilityLogs();

    await POST(
      new Request("http://localhost/api/game/state", {
        method: "POST",
        body: JSON.stringify({
          state: {
            phase: 1,
            currentQuarter: "bad-quarter",
          },
        }),
      }),
    );

    expect(logs.all().some((entry) => entry.event === "request.validation_failed")).toBe(true);
    logs.restore();
  });
});
