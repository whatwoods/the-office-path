import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("landing background assets", () => {
  it("ships the office hero background image", () => {
    const assetPath = path.join(
      process.cwd(),
      "public",
      "images",
      "landing",
      "office-night-hero.png",
    );

    expect(existsSync(assetPath)).toBe(true);
  });
});
