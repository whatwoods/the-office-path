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
