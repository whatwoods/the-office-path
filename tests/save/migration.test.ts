import { describe, expect, it } from "vitest";

import { migrate } from "@/save/migration";

describe("migrate", () => {
  it("returns data unchanged when versions match", () => {
    const data = { version: "1.0", phase: 1 };

    expect(migrate(data, "1.0")).toEqual(data);
  });

  it("returns null for unsupported old versions", () => {
    const data = { version: "0.1", phase: 1 };

    expect(migrate(data, "1.0")).toBeNull();
  });
});
