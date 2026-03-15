import type {
  CriticalPeriod,
  CriticalPeriodType,
  HousingType,
  TimeMode,
} from "@/types/game";

export const CRITICAL_PERIOD_CONFIG: Record<
  CriticalPeriodType,
  { maxDays: number }
> = {
  onboarding: { maxDays: 5 },
  promotion_review: { maxDays: 3 },
  company_crisis: { maxDays: 7 },
  project_sprint: { maxDays: 5 },
  job_negotiation: { maxDays: 3 },
  startup_launch: { maxDays: 7 },
  fundraising: { maxDays: 5 },
  ipo_review: { maxDays: 10 },
};

export function advanceQuarter(currentQuarter: number): number {
  return currentQuarter + 1;
}

export function getMaxStamina(mode: TimeMode, housingType: HousingType): number {
  if (mode === "critical") {
    return 3;
  }

  return housingType === "slum" ? 9 : 10;
}

export function enterCriticalPeriod(type: CriticalPeriodType): CriticalPeriod {
  return {
    type,
    currentDay: 1,
    maxDays: CRITICAL_PERIOD_CONFIG[type].maxDays,
    staminaPerDay: 3,
  };
}

export function advanceCriticalDay(
  period: CriticalPeriod,
): { period: CriticalPeriod; isComplete: boolean } {
  const nextDay = period.currentDay + 1;
  const isComplete = nextDay > period.maxDays;

  return {
    period: {
      ...period,
      currentDay: isComplete ? period.maxDays : nextDay,
    },
    isComplete,
  };
}

export function isPerformanceReviewQuarter(quarter: number): boolean {
  return quarter > 0 && quarter % 2 === 0;
}
