import { meetsL3ToL4Performance, meetsPromotionPerformance } from "@/engine/performance";
import type { GameState, JobLevel } from "@/types/game";

export interface PromotionResult {
  eligible: boolean;
  nextLevels: JobLevel[];
  failReasons: string[];
}

const NEXT_LEVELS: Record<JobLevel, JobLevel[]> = {
  L1: ["L2"],
  L2: ["L3"],
  L3: ["L4"],
  L4: ["L5"],
  L5: ["L6_tech", "L6_mgmt"],
  L6_tech: ["L7_tech"],
  L6_mgmt: ["L7_mgmt"],
  L7_tech: ["L8"],
  L7_mgmt: ["L8"],
  L8: [],
};

export function getNextLevels(current: JobLevel): JobLevel[] {
  return NEXT_LEVELS[current];
}

export function checkPromotion(state: GameState): PromotionResult {
  const nextLevels = getNextLevels(state.job.level);
  if (nextLevels.length === 0) {
    return {
      eligible: false,
      nextLevels: [],
      failReasons: ["Already at max level"],
    };
  }

  const eligibleLevels: JobLevel[] = [];
  const failReasons: string[] = [];

  for (const nextLevel of nextLevels) {
    const reasons = checkLevelConditions(state, nextLevel);
    if (reasons.length === 0) {
      eligibleLevels.push(nextLevel);
    } else {
      failReasons.push(...reasons.map((reason) => `${nextLevel}: ${reason}`));
    }
  }

  return {
    eligible: eligibleLevels.length > 0,
    nextLevels: eligibleLevels,
    failReasons,
  };
}

function getLeaderFavor(state: GameState): number {
  const leader = state.npcs.find((npc) => npc.role === "直属领导" && npc.isActive);
  return leader?.favor ?? 0;
}

function checkLevelConditions(state: GameState, target: JobLevel): string[] {
  const { job, performanceWindow, player, projectProgress } = state;
  const history = performanceWindow.history;
  const reasons: string[] = [];

  switch (target) {
    case "L2":
      if (job.totalQuarters < 1) {
        reasons.push("在职不足1季度");
      }
      break;

    case "L3":
      if (player.professional < 30) {
        reasons.push("专业能力不足30");
      }
      if (projectProgress.completed < 2) {
        reasons.push("完成项目不足2个");
      }
      if (job.totalQuarters < 2) {
        reasons.push("在职不足2季度");
      }
      break;

    case "L4":
      if (player.professional < 45) {
        reasons.push("专业能力不足45");
      }
      if (player.communication < 25) {
        reasons.push("沟通能力不足25");
      }
      if (!meetsL3ToL4Performance(history)) {
        reasons.push("绩效不达标(需最近2次中≥1次A/S或≥2次B+)");
      }
      if (job.totalQuarters < 3) {
        reasons.push("在职不足3季度");
      }
      break;

    case "L5":
      if (player.professional < 60) {
        reasons.push("专业能力不足60");
      }
      if (!meetsPromotionPerformance(history, 2)) {
        reasons.push("绩效不达标(需连续2次≥B+)");
      }
      if (getLeaderFavor(state) < 50) {
        reasons.push("直属领导好感不足50");
      }
      if (job.totalQuarters < 4) {
        reasons.push("在职不足4季度");
      }
      break;

    case "L6_tech":
      if (player.professional < 70) {
        reasons.push("专业能力不足70");
      }
      if (player.reputation < 30) {
        reasons.push("声望不足30");
      }
      if (projectProgress.majorCompleted < 1) {
        reasons.push("未完成重大项目");
      }
      break;

    case "L6_mgmt":
      if (player.communication < 50) {
        reasons.push("沟通能力不足50");
      }
      if (player.management < 40) {
        reasons.push("管理能力不足40");
      }
      if (player.network < 30) {
        reasons.push("人脉不足30");
      }
      if (getLeaderFavor(state) < 60) {
        reasons.push("直属领导好感不足60");
      }
      break;

    case "L7_tech":
      if (player.professional < 80) {
        reasons.push("专业能力不足80");
      }
      if (player.reputation < 50) {
        reasons.push("声望不足50");
      }
      if (!meetsPromotionPerformance(history, 3)) {
        reasons.push("绩效不达标(需连续3次≥B+)");
      }
      if (job.quartersAtLevel < 4) {
        reasons.push("在L6任职不足4季度");
      }
      break;

    case "L7_mgmt":
      if (player.management < 80) {
        reasons.push("管理能力不足80");
      }
      if (player.reputation < 50) {
        reasons.push("声望不足50");
      }
      if (!meetsPromotionPerformance(history, 3)) {
        reasons.push("绩效不达标(需连续3次≥B+)");
      }
      if (job.quartersAtLevel < 4) {
        reasons.push("在L6任职不足4季度");
      }
      break;

    case "L8": {
      if (player.reputation < 80) {
        reasons.push("声望不足80");
      }

      const highAbilityCount = [
        player.professional,
        player.communication,
        player.management,
        player.network,
      ].filter((value) => value >= 80).length;

      if (highAbilityCount < 2) {
        reasons.push("不足2项能力达到80");
      }
      break;
    }
  }

  return reasons;
}
