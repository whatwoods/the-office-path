import type { PerformanceRating } from "@/types/game";

const PASSING_RATINGS: PerformanceRating[] = ["S", "A", "B+"];

export function calculatePerformance(
  workActionCount: number,
  professionalAbility: number,
  randomOffset?: number,
): PerformanceRating {
  const random = randomOffset ?? Math.random() * 20 - 10;
  const score = workActionCount * 10 + professionalAbility / 2 + random;

  if (score >= 80) {
    return "S";
  }
  if (score >= 60) {
    return "A";
  }
  if (score >= 45) {
    return "B+";
  }
  if (score >= 25) {
    return "B";
  }
  return "C";
}

export function ratingToScore(rating: PerformanceRating): number {
  switch (rating) {
    case "S":
      return 5;
    case "A":
      return 4;
    case "B+":
      return 3;
    case "B":
      return 2;
    case "C":
      return 1;
  }
}

export function meetsPromotionPerformance(
  history: PerformanceRating[],
  consecutiveCount: number,
): boolean {
  if (history.length < consecutiveCount) {
    return false;
  }

  return history.slice(-consecutiveCount).every((rating) => {
    return PASSING_RATINGS.includes(rating);
  });
}

export function meetsL3ToL4Performance(history: PerformanceRating[]): boolean {
  const lastTwo = history.slice(-2);
  const hasTopRating = lastTwo.some((rating) => rating === "A" || rating === "S");
  const bPlusCount = lastTwo.filter((rating) => rating === "B+").length;

  return hasTopRating || bPlusCount >= 2;
}

export interface PerformanceEffects {
  salaryMultiplier: number;
  reputationChange: number;
  warning: boolean;
}

export function getPerformanceEffects(
  rating: PerformanceRating,
): PerformanceEffects {
  switch (rating) {
    case "S":
      return { salaryMultiplier: 1.15, reputationChange: 5, warning: false };
    case "A":
      return { salaryMultiplier: 1.1, reputationChange: 2, warning: false };
    case "B+":
      return { salaryMultiplier: 1.05, reputationChange: 0, warning: false };
    case "B":
      return { salaryMultiplier: 1, reputationChange: 0, warning: false };
    case "C":
      return { salaryMultiplier: 1, reputationChange: 0, warning: true };
  }
}
