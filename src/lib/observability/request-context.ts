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
