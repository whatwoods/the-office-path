import type { PlayerAttributes } from "./game";

export type EventSeverity = "low" | "medium" | "high" | "critical";

export interface GameEvent {
  type: string;
  title: string;
  description: string;
  severity: EventSeverity;
  triggersCritical: boolean;
  durationDays?: number;
  statChanges?: Partial<PlayerAttributes>;
}
