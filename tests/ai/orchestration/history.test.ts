import { describe, expect, it } from "vitest";

import {
  createQuarterSummary,
  getRecentHistory,
} from "@/ai/orchestration/history";
import type { PlayerAttributes, QuarterSummary } from "@/types/game";

describe("getRecentHistory", () => {
  it("returns empty array when no history", () => {
    expect(getRecentHistory([])).toEqual([]);
  });

  it("returns all items when history has 3 or fewer entries", () => {
    const history: QuarterSummary[] = [
      {
        quarter: 1,
        keyEvents: ["入职"],
        statChanges: {},
        npcChanges: [],
        narrativeSummary: "入职第一季度",
      },
      {
        quarter: 2,
        keyEvents: ["转正"],
        statChanges: {},
        npcChanges: [],
        narrativeSummary: "顺利转正",
      },
    ];

    expect(getRecentHistory(history)).toHaveLength(2);
  });

  it("returns only last 3 entries when history is longer", () => {
    const history: QuarterSummary[] = Array.from({ length: 6 }, (_, index) => ({
      quarter: index + 1,
      keyEvents: [`Q${index + 1}事件`],
      statChanges: {},
      npcChanges: [],
      narrativeSummary: `第${index + 1}季度`,
    }));

    const result = getRecentHistory(history);
    expect(result).toHaveLength(3);
    expect(result[0].quarter).toBe(4);
    expect(result[2].quarter).toBe(6);
  });
});

describe("createQuarterSummary", () => {
  it("creates a summary from before/after attributes and events", () => {
    const before: PlayerAttributes = {
      health: 90,
      professional: 15,
      communication: 20,
      management: 5,
      network: 5,
      mood: 70,
      money: 5000,
      reputation: 0,
    };
    const after: PlayerAttributes = {
      health: 85,
      professional: 21,
      communication: 22,
      management: 5,
      network: 8,
      mood: 65,
      money: 12000,
      reputation: 2,
    };

    const summary = createQuarterSummary(
      1,
      before,
      after,
      ["完成项目A", "团建"],
      ["王建国好感+5", "张伟好感-3"],
      "第一个季度过得充实",
    );

    expect(summary.quarter).toBe(1);
    expect(summary.keyEvents).toEqual(["完成项目A", "团建"]);
    expect(summary.statChanges.health).toBe(-5);
    expect(summary.statChanges.professional).toBe(6);
    expect(summary.narrativeSummary).toBe("第一个季度过得充实");
  });
});
