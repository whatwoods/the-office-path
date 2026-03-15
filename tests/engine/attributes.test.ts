import { describe, expect, it } from "vitest";

import {
  applyQuarterlyHealthDecay,
  applyQuarterlyHousingMood,
  applyStatChanges,
  clampAttribute,
  getEffectMultiplier,
  hasBurnout,
  hasLowMood,
  INITIAL_ATTRIBUTES,
  isHospitalized,
  isSubhealthy,
} from "@/engine/attributes";

describe("clampAttribute", () => {
  it("clamps values between 0 and 100", () => {
    expect(clampAttribute("health", 150)).toBe(100);
    expect(clampAttribute("health", -10)).toBe(0);
    expect(clampAttribute("health", 50)).toBe(50);
  });

  it("does not clamp money", () => {
    expect(clampAttribute("money", -5000)).toBe(-5000);
    expect(clampAttribute("money", 999999)).toBe(999999);
  });
});

describe("applyStatChanges", () => {
  it("applies positive changes and clamps", () => {
    const attrs = { ...INITIAL_ATTRIBUTES };
    const result = applyStatChanges(attrs, { professional: 10, health: -5 });

    expect(result.professional).toBe(25);
    expect(result.health).toBe(85);
  });

  it("does not mutate the original object", () => {
    const attrs = { ...INITIAL_ATTRIBUTES };

    applyStatChanges(attrs, { health: -10 });

    expect(attrs.health).toBe(90);
  });

  it("clamps at boundaries", () => {
    const attrs = { ...INITIAL_ATTRIBUTES, reputation: 98 };
    const result = applyStatChanges(attrs, { reputation: 10 });

    expect(result.reputation).toBe(100);
  });
});

describe("INITIAL_ATTRIBUTES", () => {
  it("has the expected starting values", () => {
    expect(INITIAL_ATTRIBUTES.health).toBe(90);
    expect(INITIAL_ATTRIBUTES.professional).toBe(15);
    expect(INITIAL_ATTRIBUTES.communication).toBe(20);
    expect(INITIAL_ATTRIBUTES.management).toBe(5);
    expect(INITIAL_ATTRIBUTES.network).toBe(5);
    expect(INITIAL_ATTRIBUTES.mood).toBe(70);
    expect(INITIAL_ATTRIBUTES.money).toBe(5000);
    expect(INITIAL_ATTRIBUTES.reputation).toBe(0);
  });
});

describe("health and mood thresholds", () => {
  it("detects subhealthy status at health <= 30", () => {
    expect(isSubhealthy({ ...INITIAL_ATTRIBUTES, health: 30 })).toBe(true);
    expect(isSubhealthy({ ...INITIAL_ATTRIBUTES, health: 31 })).toBe(false);
  });

  it("detects hospitalization status at health <= 10", () => {
    expect(isHospitalized({ ...INITIAL_ATTRIBUTES, health: 10 })).toBe(true);
    expect(isHospitalized({ ...INITIAL_ATTRIBUTES, health: 11 })).toBe(false);
  });

  it("detects low mood at mood <= 30", () => {
    expect(hasLowMood({ ...INITIAL_ATTRIBUTES, mood: 30 })).toBe(true);
    expect(hasLowMood({ ...INITIAL_ATTRIBUTES, mood: 31 })).toBe(false);
  });

  it("detects burnout at mood <= 10", () => {
    expect(hasBurnout({ ...INITIAL_ATTRIBUTES, mood: 10 })).toBe(true);
    expect(hasBurnout({ ...INITIAL_ATTRIBUTES, mood: 11 })).toBe(false);
  });
});

describe("getEffectMultiplier", () => {
  it("returns 0.5 for subhealthy characters", () => {
    expect(getEffectMultiplier({ ...INITIAL_ATTRIBUTES, health: 25 })).toBe(0.5);
  });

  it("returns 0.7 for low mood when health is fine", () => {
    expect(getEffectMultiplier({ ...INITIAL_ATTRIBUTES, mood: 20 })).toBe(0.7);
  });

  it("returns 1.0 when no debuff is active", () => {
    expect(getEffectMultiplier(INITIAL_ATTRIBUTES)).toBe(1);
  });
});

describe("applyQuarterlyHealthDecay", () => {
  it("applies base -3 decay", () => {
    const result = applyQuarterlyHealthDecay(INITIAL_ATTRIBUTES, "shared");

    expect(result.health).toBe(87);
  });

  it("applies extra -2 for slum housing", () => {
    const result = applyQuarterlyHealthDecay(INITIAL_ATTRIBUTES, "slum");

    expect(result.health).toBe(85);
  });
});

describe("applyQuarterlyHousingMood", () => {
  it("applies mood penalty for slum housing", () => {
    const result = applyQuarterlyHousingMood(INITIAL_ATTRIBUTES, "slum");

    expect(result.mood).toBe(65);
  });

  it("applies mood bonus for luxury housing", () => {
    const result = applyQuarterlyHousingMood(INITIAL_ATTRIBUTES, "luxury");

    expect(result.mood).toBe(78);
  });

  it("leaves shared housing unchanged", () => {
    const result = applyQuarterlyHousingMood(INITIAL_ATTRIBUTES, "shared");

    expect(result.mood).toBe(70);
  });
});
