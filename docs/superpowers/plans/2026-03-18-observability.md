# Observability Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add lightweight server-side observability so every `/api/game/*` request can be traced through route handling, orchestration, and AI agent execution via structured stdout logs.

**Architecture:** Introduce a thin observability layer under `src/lib/observability` for JSON logging, per-request context, and timed step helpers. Thread that context through the four game API routes and the critical/quarterly + AI agent paths, while keeping `src/engine/*` pure and reusing existing AI usage aggregation from `src/lib/aiUsage.ts`.

**Tech Stack:** Next.js route handlers, TypeScript, Vitest, Vercel AI SDK agents, existing AI usage utilities

---

## File Map

### Create

- `src/lib/observability/logger.ts`
  Structured JSON logger, shared log types, environment-based redaction.
- `src/lib/observability/request-context.ts`
  `requestId` creation plus request-scoped logging helpers.
- `src/lib/observability/timed.ts`
  `withObservedStep()` helper for start/finish/error timing.
- `tests/lib/observability/logger.test.ts`
  Logger output shape and redaction coverage.
- `tests/lib/observability/request-context.test.ts`
  Request context creation and request lifecycle coverage.
- `tests/lib/observability/timed.test.ts`
  Timed helper success/failure coverage.
- `tests/helpers/observability.ts`
  Shared console-capture helper for route/orchestration/agent log assertions.

### Modify

- `src/app/api/game/new/route.ts`
  Add request lifecycle logs and narrative/choice step timing.
- `src/app/api/game/turn/route.ts`
  Add request lifecycle logs, branch logs, pipeline timing, validation logs.
- `src/app/api/game/state/route.ts`
  Add request lifecycle logs and promotion-check timing.
- `src/app/api/game/resign/route.ts`
  Add request lifecycle logs, eligibility logs, narrative/choice timing.
- `src/ai/orchestration/quarterly.ts`
  Add observed steps around settle/apply/agent/narrative/history/critical-choice flow.
- `src/ai/orchestration/critical.ts`
  Add observed steps around settle/npc/event/narrative/choice flow.
- `src/ai/agents/world.ts`
  Add start/finish/error logging with model and usage summary.
- `src/ai/agents/event.ts`
  Add start/finish/error logging with model and usage summary.
- `src/ai/agents/npc.ts`
  Add start/finish/error logging with model and usage summary.
- `src/ai/agents/narrative.ts`
  Add start/finish/error logging with model and usage summary.
- `tests/app/api/game/new.test.ts`
- `tests/app/api/game/turn.test.ts`
- `tests/app/api/game/state.test.ts`
- `tests/app/api/game/resign.test.ts`
- `tests/ai/orchestration/quarterly.test.ts`
- `tests/ai/orchestration/critical.test.ts`
- `tests/ai/agents/world.test.ts`
- `tests/ai/agents/event.test.ts`
- `tests/ai/agents/npc.test.ts`
- `tests/ai/agents/narrative.test.ts`

## Execution Notes

- Execute this plan in an isolated worktree or branch because the main workspace already has unrelated local edits.
- Follow `@superpowers:test-driven-development` discipline: write the failing test first, then the minimal code, then rerun the narrowest relevant tests.
- Keep observability parameters optional and append-only in function signatures so existing call sites and tests continue to work during the migration.

## Chunk 1: Observability Primitives

### Task 1: Base Logger

**Files:**
- Create: `src/lib/observability/logger.ts`
- Test: `tests/lib/observability/logger.test.ts`

- [ ] **Step 1: Write failing tests for logger shape and redaction**

Create `tests/lib/observability/logger.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run the logger tests and confirm failure**

Run: `npx vitest run tests/lib/observability/logger.test.ts`
Expected: FAIL because `@/lib/observability/logger` does not exist yet.

- [ ] **Step 3: Implement the base logger**

Create `src/lib/observability/logger.ts`:

```typescript
export type ObservabilityLevel = "info" | "warn" | "error";

export interface ObservabilityLog {
  timestamp?: string;
  event: string;
  message: string;
  requestId: string;
  route?: string;
  method?: string;
  step?: string;
  durationMs?: number;
  statusCode?: number;
  errorType?: "validation" | "operation" | "unexpected";
  errorName?: string;
  errorMessage?: string;
  errorStack?: string;
  provider?: string;
  model?: string;
  aiUsage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
  metadata?: Record<string, unknown>;
}

function compactObject(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  );
}

export function emitLog(
  level: ObservabilityLevel,
  payload: ObservabilityLog,
  options?: { environment?: string },
) {
  const environment = options?.environment ?? process.env.NODE_ENV ?? "development";
  const base = compactObject({
    timestamp: new Date().toISOString(),
    level,
    ...payload,
    metadata: payload.metadata ? compactObject(payload.metadata) : undefined,
    errorStack: environment === "production" ? undefined : payload.errorStack,
  });
  const line = JSON.stringify(base);

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.info(line);
}
```

- [ ] **Step 4: Rerun the logger tests**

Run: `npx vitest run tests/lib/observability/logger.test.ts`
Expected: PASS

- [ ] **Step 5: Commit the base logger**

```bash
git add src/lib/observability/logger.ts tests/lib/observability/logger.test.ts
git commit -m "feat: add structured observability logger"
```

### Task 2: Request Context, Timed Helper, and Shared Test Capture

**Files:**
- Create: `src/lib/observability/request-context.ts`
- Create: `src/lib/observability/timed.ts`
- Create: `tests/helpers/observability.ts`
- Test: `tests/lib/observability/request-context.test.ts`
- Test: `tests/lib/observability/timed.test.ts`

- [ ] **Step 1: Write failing tests for request context and step timing**

Create `tests/helpers/observability.ts`:

```typescript
import { vi } from "vitest";

export function captureObservabilityLogs() {
  const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

  return {
    infoSpy,
    warnSpy,
    errorSpy,
    all() {
      return [...infoSpy.mock.calls, ...warnSpy.mock.calls, ...errorSpy.mock.calls]
        .map(([raw]) => JSON.parse(raw as string));
    },
    restore() {
      infoSpy.mockRestore();
      warnSpy.mockRestore();
      errorSpy.mockRestore();
    },
  };
}
```

Create `tests/lib/observability/request-context.test.ts`:

```typescript
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
```

Create `tests/lib/observability/timed.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run the new observability tests and confirm failure**

Run: `npx vitest run tests/lib/observability/request-context.test.ts tests/lib/observability/timed.test.ts`
Expected: FAIL because the request-context and timed modules do not exist yet.

- [ ] **Step 3: Implement request context and timed helper**

Create `src/lib/observability/request-context.ts`:

```typescript
import {
  emitLog,
  type ObservabilityLevel,
  type ObservabilityLog,
} from "@/lib/observability/logger";

export interface RequestContext {
  requestId: string;
  route: string;
  method: string;
  startedAt: number;
  log: {
    info: (event: string, message: string, extra?: Partial<ObservabilityLog>) => void;
    warn: (event: string, message: string, extra?: Partial<ObservabilityLog>) => void;
    error: (event: string, message: string, extra?: Partial<ObservabilityLog>) => void;
  };
  finish: (statusCode: number, extra?: Partial<ObservabilityLog>) => void;
}

function makeRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createRequestContext(route: string, method: string): RequestContext {
  const requestId = makeRequestId();
  const startedAt = Date.now();

  const write = (
    level: ObservabilityLevel,
    event: string,
    message: string,
    extra?: Partial<ObservabilityLog>,
  ) => {
    emitLog(level, {
      requestId,
      route,
      method,
      event,
      message,
      ...extra,
    });
  };

  return {
    requestId,
    route,
    method,
    startedAt,
    log: {
      info: (event, message, extra) => write("info", event, message, extra),
      warn: (event, message, extra) => write("warn", event, message, extra),
      error: (event, message, extra) => write("error", event, message, extra),
    },
    finish: (statusCode, extra) =>
      write("info", "request.finish", "request finished", {
        statusCode,
        durationMs: Date.now() - startedAt,
        ...extra,
      }),
  };
}
```

Create `src/lib/observability/timed.ts`:

```typescript
import type { RequestContext } from "@/lib/observability/request-context";

function toErrorFields(error: unknown) {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
    };
  }

  return { errorMessage: String(error) };
}

export async function withObservedStep<T>(
  ctx: RequestContext,
  step: string,
  fn: () => Promise<T> | T,
  extra?: { metadata?: Record<string, unknown> },
): Promise<T> {
  const startedAt = Date.now();
  ctx.log.info("step.start", `${step} started`, { step, metadata: extra?.metadata });

  try {
    const result = await fn();
    ctx.log.info("step.finish", `${step} finished`, {
      step,
      durationMs: Date.now() - startedAt,
      metadata: extra?.metadata,
    });
    return result;
  } catch (error) {
    ctx.log.error("step.error", `${step} failed`, {
      step,
      durationMs: Date.now() - startedAt,
      errorType: "unexpected",
      ...toErrorFields(error),
      metadata: extra?.metadata,
    });
    throw error;
  }
}
```

- [ ] **Step 4: Rerun the helper tests**

Run: `npx vitest run tests/lib/observability/request-context.test.ts tests/lib/observability/timed.test.ts`
Expected: PASS

- [ ] **Step 5: Commit the request context helpers**

```bash
git add src/lib/observability/request-context.ts src/lib/observability/timed.ts tests/helpers/observability.ts tests/lib/observability/request-context.test.ts tests/lib/observability/timed.test.ts
git commit -m "feat: add request context and timed observability helpers"
```

## Chunk 2: Route-Level Integration

### Task 3: Instrument `new` and `state` Routes

**Files:**
- Modify: `src/app/api/game/new/route.ts`
- Modify: `src/app/api/game/state/route.ts`
- Modify: `tests/app/api/game/new.test.ts`
- Modify: `tests/app/api/game/state.test.ts`

- [ ] **Step 1: Add failing route log assertions**

Update `tests/app/api/game/new.test.ts`:

```typescript
import { captureObservabilityLogs } from "../../../helpers/observability";

it("logs request.start and request.finish for successful new game requests", async () => {
  const logs = captureObservabilityLogs();

  const res = await POST(
    new Request("http://localhost/api/game/new", {
      method: "POST",
      body: JSON.stringify({}),
    }),
  );

  expect(res.status).toBe(200);
  const parsed = logs.all();
  expect(parsed.some((entry) => entry.event === "request.start")).toBe(true);
  expect(
    parsed.some((entry) => entry.event === "step.finish" && entry.step === "run_narrative_agent"),
  ).toBe(true);
  expect(parsed.some((entry) => entry.event === "request.finish")).toBe(true);
  logs.restore();
});

it("logs request.error when the narrative agent throws", async () => {
  const logs = captureObservabilityLogs();
  mockedRunNarrativeAgent.mockRejectedValueOnce(new Error("AI provider missing key"));

  await POST(
    new Request("http://localhost/api/game/new", {
      method: "POST",
      body: JSON.stringify({}),
    }),
  );

  expect(logs.all().some((entry) => entry.event === "request.error")).toBe(true);
  logs.restore();
});
```

Update `tests/app/api/game/state.test.ts`:

```typescript
import { captureObservabilityLogs } from "../../../helpers/observability";

it("logs validation failures for invalid state payloads", async () => {
  const logs = captureObservabilityLogs();

  await POST(
    new Request("http://localhost/api/game/state", {
      method: "POST",
      body: JSON.stringify({ state: { phase: 1, currentQuarter: "bad-quarter" } }),
    }),
  );

  expect(logs.all().some((entry) => entry.event === "request.validation_failed")).toBe(true);
  logs.restore();
});
```

- [ ] **Step 2: Run the narrow route tests and confirm failure**

Run: `npx vitest run tests/app/api/game/new.test.ts tests/app/api/game/state.test.ts`
Expected: FAIL because the routes do not emit observability logs yet.

- [ ] **Step 3: Instrument the routes with request context and timed steps**

Modify `src/app/api/game/new/route.ts`:

```typescript
import { createRequestContext } from "@/lib/observability/request-context";
import { withObservedStep } from "@/lib/observability/timed";

export async function POST(request: Request) {
  const ctx = createRequestContext("/api/game/new", request.method);
  ctx.log.info("request.start", "new game request started");

  try {
    const body = await withObservedStep(ctx, "parse_body", async () => request.json());
    const state = await withObservedStep(ctx, "create_new_game_state", async () =>
      createNewGame({ major: body.major, playerName: body.playerName }),
    );
    const narrativeOutput = await withObservedStep(ctx, "run_narrative_agent", async () =>
      runNarrativeAgent(/* existing args */, body.aiConfig, collectUsage, ctx),
    );
    ctx.finish(200, { metadata: { criticalChoices: criticalChoices?.length ?? 0 } });
    return Response.json(/* existing payload */);
  } catch (error) {
    ctx.log.error("request.error", "new game request failed", {
      errorType: "unexpected",
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
    });
    return Response.json({ success: false, error: /* existing message */ }, { status: 500 });
  }
}
```

Modify `src/app/api/game/state/route.ts` the same way:

- create `ctx`
- log `request.start`
- wrap `request.json()` and `checkPromotion()` with `withObservedStep`
- emit `request.validation_failed` before each `400` return
- call `ctx.finish(200, { metadata: { promotionEligible: promotion.eligible } })` on success

- [ ] **Step 4: Rerun the targeted route tests**

Run: `npx vitest run tests/app/api/game/new.test.ts tests/app/api/game/state.test.ts`
Expected: PASS

- [ ] **Step 5: Commit `new` and `state` route instrumentation**

```bash
git add src/app/api/game/new/route.ts src/app/api/game/state/route.ts tests/app/api/game/new.test.ts tests/app/api/game/state.test.ts
git commit -m "feat: add observability logs to new and state routes"
```

### Task 4: Instrument `turn` and `resign` Routes

**Files:**
- Modify: `src/app/api/game/turn/route.ts`
- Modify: `src/app/api/game/resign/route.ts`
- Modify: `tests/app/api/game/turn.test.ts`
- Modify: `tests/app/api/game/resign.test.ts`

- [ ] **Step 1: Add failing tests for branch and validation logging**

Update `tests/app/api/game/turn.test.ts`:

```typescript
import { captureObservabilityLogs } from "../../../helpers/observability";

it("logs the selected turn branch and request.finish", async () => {
  const logs = captureObservabilityLogs();
  const state = createNewGame();
  state.timeMode = "quarterly";

  await POST(
    new Request("http://localhost/api/game/turn", {
      method: "POST",
      body: JSON.stringify({ state, plan: { actions: [] } }),
    }),
  );

  const parsed = logs.all();
  expect(
    parsed.some((entry) => entry.event === "step.finish" && entry.step === "run_quarterly_pipeline"),
  ).toBe(true);
  expect(parsed.some((entry) => entry.event === "request.finish")).toBe(true);
  logs.restore();
});

it("logs validation failures when plan is missing", async () => {
  const logs = captureObservabilityLogs();
  const state = createNewGame();
  state.timeMode = "quarterly";

  await POST(
    new Request("http://localhost/api/game/turn", {
      method: "POST",
      body: JSON.stringify({ state }),
    }),
  );

  expect(logs.all().some((entry) => entry.event === "request.validation_failed")).toBe(true);
  logs.restore();
});
```

Update `tests/app/api/game/resign.test.ts`:

```typescript
import { captureObservabilityLogs } from "../../../helpers/observability";

it("logs eligibility failures as validation errors", async () => {
  const logs = captureObservabilityLogs();
  const state = createNewGame();
  state.job.level = "L1";

  await POST(
    new Request("http://localhost/api/game/resign", {
      method: "POST",
      body: JSON.stringify({ state }),
    }),
  );

  expect(logs.all().some((entry) => entry.event === "request.validation_failed")).toBe(true);
  logs.restore();
});
```

- [ ] **Step 2: Run the narrow route tests and confirm failure**

Run: `npx vitest run tests/app/api/game/turn.test.ts tests/app/api/game/resign.test.ts`
Expected: FAIL because those routes still lack observability logs.

- [ ] **Step 3: Instrument `turn` and `resign`**

Modify `src/app/api/game/turn/route.ts`:

- create `ctx`
- log `request.start`
- wrap `request.json()` with `withObservedStep(ctx, "parse_body", ...)`
- log `request.validation_failed` before every `400`
- wrap each branch:
  - `runCriticalDayPipeline(..., body.aiConfig, ctx)`
  - `runExecutiveQuarterlyPipeline(..., body.aiConfig, ctx)`
  - `runQuarterlyPipeline(..., body.aiConfig, ctx)`
- include branch metadata in `ctx.finish(200, { metadata: { timeMode: state.timeMode, branch: "critical" | "quarterly" | "executive" } })`

Modify `src/app/api/game/resign/route.ts`:

- create `ctx`
- log `request.start`
- emit `request.validation_failed` for missing state, invalid state, and ineligible level
- wrap phase transition, narrative agent call, and critical choice validation with `withObservedStep`
- pass `ctx` into `runNarrativeAgent(..., body.aiConfig, collectUsage, ctx)`
- call `ctx.finish(200, { metadata: { path, phase2Path: newState.phase2Path } })`

- [ ] **Step 4: Rerun the targeted route tests**

Run: `npx vitest run tests/app/api/game/turn.test.ts tests/app/api/game/resign.test.ts`
Expected: PASS

- [ ] **Step 5: Commit `turn` and `resign` route instrumentation**

```bash
git add src/app/api/game/turn/route.ts src/app/api/game/resign/route.ts tests/app/api/game/turn.test.ts tests/app/api/game/resign.test.ts
git commit -m "feat: add observability logs to turn and resign routes"
```

## Chunk 3: Orchestration and Agent Integration

### Task 5: Instrument Quarterly and Critical Pipelines

**Files:**
- Modify: `src/ai/orchestration/quarterly.ts`
- Modify: `src/ai/orchestration/critical.ts`
- Modify: `tests/ai/orchestration/quarterly.test.ts`
- Modify: `tests/ai/orchestration/critical.test.ts`

- [ ] **Step 1: Add failing pipeline observability tests**

Update `tests/ai/orchestration/quarterly.test.ts`:

```typescript
import { captureObservabilityLogs } from "../../helpers/observability";
import { createRequestContext } from "@/lib/observability/request-context";

it("logs observed steps for the quarterly pipeline", async () => {
  const logs = captureObservabilityLogs();
  const ctx = createRequestContext("/api/game/turn", "POST");
  const state = makeQuarterlyState();

  await runQuarterlyPipeline(state, plan, undefined, ctx);

  const parsed = logs.all();
  expect(parsed.some((entry) => entry.step === "run_world_agent")).toBe(true);
  expect(parsed.some((entry) => entry.step === "run_narrative_agent")).toBe(true);
  logs.restore();
});
```

Update `tests/ai/orchestration/critical.test.ts`:

```typescript
import { captureObservabilityLogs } from "../../helpers/observability";
import { createRequestContext } from "@/lib/observability/request-context";

it("logs observed steps for the critical pipeline", async () => {
  const logs = captureObservabilityLogs();
  const ctx = createRequestContext("/api/game/turn", "POST");
  const state = createNewGame();
  const choice = {
    choiceId: "a",
    label: "A",
    staminaCost: 1,
    effects: {},
    category: "学习",
  } as const;

  await runCriticalDayPipeline(state, choice, undefined, ctx);

  const parsed = logs.all();
  expect(parsed.some((entry) => entry.step === "settle_critical_day")).toBe(true);
  expect(parsed.some((entry) => entry.step === "run_event_agent")).toBe(true);
  logs.restore();
});
```

- [ ] **Step 2: Run the orchestration tests and confirm failure**

Run: `npx vitest run tests/ai/orchestration/quarterly.test.ts tests/ai/orchestration/critical.test.ts`
Expected: FAIL because the pipelines do not accept context or emit step logs yet.

- [ ] **Step 3: Instrument the pipelines with optional request context**

Modify `src/ai/orchestration/quarterly.ts`:

- extend signatures:

```typescript
export async function runExecutiveQuarterlyPipeline(
  state: GameState,
  plan: ExecutiveQuarterPlan,
  aiConfig?: AIConfig,
  ctx?: RequestContext,
)

export async function runQuarterlyPipeline(
  state: GameState,
  plan: QuarterPlan,
  aiConfig?: AIConfig,
  ctx?: RequestContext,
)
```

- extend `FinalizePipelineOptions` with `ctx?: RequestContext`
- wrap major steps with `withObservedStep(ctx, "...", ...)` when `ctx` exists:
  - `settle_quarter_engine`
  - `run_world_agent`
  - `run_event_agent`
  - `validate_events`
  - `apply_event_effects`
  - `run_npc_agent`
  - `append_phone_messages`
  - `run_narrative_agent`
  - `create_history_summary`
  - `maybe_generate_critical_choices`
- when `ctx` is absent, keep behavior identical

Modify `src/ai/orchestration/critical.ts`:

- extend signature to `runCriticalDayPipeline(state, choice, aiConfig?, ctx?)`
- wrap:
  - `settle_critical_day`
  - `build_story_state`
  - `run_npc_agent`
  - `run_event_agent`
  - `append_phone_messages`
  - `run_narrative_agent`
  - `validate_next_choices`

- [ ] **Step 4: Rerun the orchestration tests**

Run: `npx vitest run tests/ai/orchestration/quarterly.test.ts tests/ai/orchestration/critical.test.ts`
Expected: PASS

- [ ] **Step 5: Commit the pipeline instrumentation**

```bash
git add src/ai/orchestration/quarterly.ts src/ai/orchestration/critical.ts tests/ai/orchestration/quarterly.test.ts tests/ai/orchestration/critical.test.ts
git commit -m "feat: add observability to quarterly and critical pipelines"
```

### Task 6: Instrument World/Event/NPC/Narrative Agents

**Files:**
- Modify: `src/ai/agents/world.ts`
- Modify: `src/ai/agents/event.ts`
- Modify: `src/ai/agents/npc.ts`
- Modify: `src/ai/agents/narrative.ts`
- Modify: `tests/ai/agents/world.test.ts`
- Modify: `tests/ai/agents/event.test.ts`
- Modify: `tests/ai/agents/npc.test.ts`
- Modify: `tests/ai/agents/narrative.test.ts`

- [ ] **Step 1: Add failing agent log tests**

Update `tests/ai/agents/world.test.ts`:

```typescript
import { captureObservabilityLogs } from "../../helpers/observability";
import { createRequestContext } from "@/lib/observability/request-context";

it("logs model and aiUsage for successful world-agent calls", async () => {
  mockedGenerateText.mockResolvedValueOnce({
    output: {
      economy: "stable",
      trends: [],
      companyStatus: "stable",
      newsItems: [],
    },
    usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
  } as never);

  const logs = captureObservabilityLogs();
  const ctx = createRequestContext("/api/game/turn", "POST");

  await runWorldAgent(makeInput(), undefined, undefined, ctx);

  const parsed = logs.all();
  expect(
    parsed.some((entry) => entry.step === "run_world_agent" && entry.event === "step.finish"),
  ).toBe(true);
  expect(parsed.some((entry) => entry.model === "openai:gpt-4o-mini")).toBe(true);
  logs.restore();
});
```

Update `tests/ai/agents/narrative.test.ts` with an error-path assertion:

```typescript
it("logs step.error when narrative generation fails", async () => {
  mockedGenerateText.mockRejectedValueOnce(new Error("provider down"));
  const logs = captureObservabilityLogs();
  const ctx = createRequestContext("/api/game/turn", "POST");

  await expect(
    runNarrativeAgent(
      makeInput(),
      worldCtx,
      eventCtx,
      npcCtx,
      actions,
      false,
      undefined,
      false,
      undefined,
      undefined,
      ctx,
    ),
  ).rejects.toThrow("provider down");

  expect(
    logs.all().some((entry) => entry.event === "step.error" && entry.step === "run_narrative_agent"),
  ).toBe(true);
  logs.restore();
});
```

Mirror the same pattern in `tests/ai/agents/event.test.ts` and `tests/ai/agents/npc.test.ts`.

- [ ] **Step 2: Run the agent tests and confirm failure**

Run: `npx vitest run tests/ai/agents/world.test.ts tests/ai/agents/event.test.ts tests/ai/agents/npc.test.ts tests/ai/agents/narrative.test.ts`
Expected: FAIL because the agent functions do not accept a request context yet.

- [ ] **Step 3: Add optional request context to all four agents**

Modify each agent signature by appending `ctx?: RequestContext` after the existing `onUsage` parameter so current tests and collectors keep working:

```typescript
export async function runWorldAgent(
  input: AgentInput,
  aiConfig?: AIConfig,
  onUsage?: AIUsageCollector,
  ctx?: RequestContext,
)
```

Apply the same append-only rule to:

- `runEventAgent(...)`
- `runNPCAgent(...)`
- `runNarrativeAgent(...)`

Wrap each `generateText()` call like this:

```typescript
const execute = async () => {
  const result = await generateText(/* existing args */);

  onUsage?.({
    agent: "world",
    model: modelSpec,
    ...normalizeAIUsage(result.usage),
  });

  return result;
};

const result = ctx
  ? await withObservedStep(ctx, "run_world_agent", execute, {
      metadata: {
        provider: modelSpec.split(":")[0],
        model: modelSpec,
      },
    })
  : await execute();
```

After the wrapped call, add a dedicated `ctx.log.info("step.finish", ...)` metadata update only if needed for `aiUsage`, or extend `withObservedStep()` so it can accept `successMetadata` and emit `aiUsage` directly in the finish log.

Important: keep current business behavior intact, including the `Narrative agent must return choices...` error path.

- [ ] **Step 4: Rerun the agent tests**

Run: `npx vitest run tests/ai/agents/world.test.ts tests/ai/agents/event.test.ts tests/ai/agents/npc.test.ts tests/ai/agents/narrative.test.ts`
Expected: PASS

- [ ] **Step 5: Commit the agent instrumentation**

```bash
git add src/ai/agents/world.ts src/ai/agents/event.ts src/ai/agents/npc.ts src/ai/agents/narrative.ts tests/ai/agents/world.test.ts tests/ai/agents/event.test.ts tests/ai/agents/npc.test.ts tests/ai/agents/narrative.test.ts
git commit -m "feat: add observability to AI agents"
```

## Chunk 4: Full Verification and Cleanup

### Task 7: Final Verification

**Files:**
- Modify: only files changed during implementation if lint/type issues surface

- [ ] **Step 1: Run the focused observability test set**

Run:

```bash
npx vitest run tests/lib/observability/logger.test.ts tests/lib/observability/request-context.test.ts tests/lib/observability/timed.test.ts tests/app/api/game/new.test.ts tests/app/api/game/turn.test.ts tests/app/api/game/state.test.ts tests/app/api/game/resign.test.ts tests/ai/orchestration/quarterly.test.ts tests/ai/orchestration/critical.test.ts tests/ai/agents/world.test.ts tests/ai/agents/event.test.ts tests/ai/agents/npc.test.ts tests/ai/agents/narrative.test.ts
```

Expected: PASS

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 4: Run production build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Commit any final cleanup**

```bash
git add -A
git commit -m "fix: finalize observability integration"
```
