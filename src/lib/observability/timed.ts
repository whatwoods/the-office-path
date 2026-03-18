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
