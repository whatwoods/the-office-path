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
