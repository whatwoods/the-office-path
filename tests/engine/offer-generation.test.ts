import { describe, expect, it } from "vitest";

import { rollOfferChance } from "@/engine/offer-generation";

describe("rollOfferChance", () => {
  it("returns true when random is less than 0.6", () => {
    expect(rollOfferChance(() => 0.3)).toBe(true);
  });

  it("returns false when random is greater than or equal to 0.6", () => {
    expect(rollOfferChance(() => 0.7)).toBe(false);
  });

  it("returns true at exactly 0.59", () => {
    expect(rollOfferChance(() => 0.59)).toBe(true);
  });

  it("returns false at exactly 0.6", () => {
    expect(rollOfferChance(() => 0.6)).toBe(false);
  });
});
