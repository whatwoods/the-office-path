import type { ExecutiveStage, ExecutiveState } from "@/types/executive";

export interface ExecutiveFailureResult {
  failed: boolean;
  reason?: string;
  type?: "fired" | "demoted";
}

export interface ExecutivePromotionResult {
  eligible: boolean;
  nextStage?: ExecutiveStage;
  failReasons: string[];
}

export function checkExecutiveFailure(
  executive: ExecutiveState,
): ExecutiveFailureResult {
  if (executive.boardSupport <= 0) {
    return {
      failed: true,
      reason: "board support dropped to zero",
      type: "fired",
    };
  }

  if (executive.consecutiveLowPerformance >= 2) {
    return {
      failed: true,
      reason: "performance stayed low for too long",
      type: "demoted",
    };
  }

  return { failed: false };
}

export function checkExecutivePromotion(
  executive: ExecutiveState,
  _quartersAtLevel: number,
): ExecutivePromotionResult {
  const failReasons: string[] = [];

  switch (executive.stage) {
    case "E1":
      if (executive.onTargetQuarters < 3) {
        failReasons.push(
          "Need 3 on-target quarters (departmentPerformance >= 50)",
        );
      }
      if (executive.boardSupport < 50) {
        failReasons.push("Board support must be >= 50");
      }

      return {
        eligible: failReasons.length === 0,
        nextStage: failReasons.length === 0 ? "E2" : undefined,
        failReasons,
      };

    case "E2":
      if (executive.departmentCount < 3) {
        failReasons.push("Need to manage >= 3 departments");
      }
      if (executive.boardSupport < 60) {
        failReasons.push("Board support must be >= 60");
      }

      return {
        eligible: failReasons.length === 0,
        nextStage: failReasons.length === 0 ? "E3" : undefined,
        failReasons,
      };

    case "E3":
      return {
        eligible: false,
        failReasons: ["Already at top executive level"],
      };
  }
}
