import type { PlayerAttributes, CriticalPeriodType } from "./game";

export type EventSeverity = "low" | "medium" | "high" | "critical";

export interface GameEvent {
  type: string;
  title: string;
  description: string;
  severity: EventSeverity;
  triggersCritical: boolean;
  criticalType?: CriticalPeriodType;
  durationDays?: number;
  statChanges?: Partial<PlayerAttributes>;
}
