import type { HousingType, PlayerAttributes } from "@/types/game";

const CLAMPED_ATTRIBUTES: Array<keyof PlayerAttributes> = [
  "health",
  "professional",
  "communication",
  "management",
  "network",
  "mood",
  "reputation",
];

export const INITIAL_ATTRIBUTES: PlayerAttributes = {
  health: 90,
  professional: 15,
  communication: 20,
  management: 5,
  network: 5,
  mood: 70,
  money: 5000,
  reputation: 0,
};

export function clampAttribute(
  attribute: keyof PlayerAttributes,
  value: number,
): number {
  if (!CLAMPED_ATTRIBUTES.includes(attribute)) {
    return value;
  }

  return Math.max(0, Math.min(100, value));
}

export function applyStatChanges(
  attributes: PlayerAttributes,
  changes: Partial<PlayerAttributes>,
): PlayerAttributes {
  const nextAttributes = { ...attributes };

  for (const [key, delta] of Object.entries(changes)) {
    if (typeof delta !== "number") {
      continue;
    }

    const attribute = key as keyof PlayerAttributes;
    nextAttributes[attribute] = clampAttribute(
      attribute,
      nextAttributes[attribute] + delta,
    );
  }

  return nextAttributes;
}

export function isSubhealthy(attributes: PlayerAttributes): boolean {
  return attributes.health <= 30;
}

export function isHospitalized(attributes: PlayerAttributes): boolean {
  return attributes.health <= 10;
}

export function hasLowMood(attributes: PlayerAttributes): boolean {
  return attributes.mood <= 30;
}

export function hasBurnout(attributes: PlayerAttributes): boolean {
  return attributes.mood <= 10;
}

export function applyQuarterlyHealthDecay(
  attributes: PlayerAttributes,
  housingType: HousingType,
): PlayerAttributes {
  const decay = housingType === "slum" ? -5 : -3;
  return applyStatChanges(attributes, { health: decay });
}

const HOUSING_MOOD_EFFECT: Record<HousingType, number> = {
  slum: -5,
  shared: 0,
  studio: 3,
  apartment: 5,
  luxury: 8,
  owned: 10,
};

export function applyQuarterlyHousingMood(
  attributes: PlayerAttributes,
  housingType: HousingType,
): PlayerAttributes {
  const moodDelta = HOUSING_MOOD_EFFECT[housingType];
  if (moodDelta === 0) {
    return attributes;
  }

  return applyStatChanges(attributes, { mood: moodDelta });
}

export function getEffectMultiplier(attributes: PlayerAttributes): number {
  if (isSubhealthy(attributes)) {
    return 0.5;
  }

  if (hasLowMood(attributes)) {
    return 0.7;
  }

  return 1;
}
