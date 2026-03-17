import { describe, expect, it } from "vitest";

import { createNewGame } from "@/engine/state";
import type { MajorType } from "@/types/game";

describe("createNewGame with intro params", () => {
  it("accepts tech major and sets 星云科技", () => {
    const state = createNewGame({ major: "tech", playerName: "小明" });

    expect(state.job.companyName).toBe("星云科技");
    expect(state.playerName).toBe("小明");
    expect(state.player.professional).toBe(20);
    expect(state.player.communication).toBe(18);
  });

  it("accepts finance major and sets 鼎信金融", () => {
    const state = createNewGame({ major: "finance", playerName: "小红" });

    expect(state.job.companyName).toBe("鼎信金融");
    expect(state.playerName).toBe("小红");
    expect(state.player.communication).toBe(25);
    expect(state.player.professional).toBe(13);
  });

  it("accepts liberal major and sets 万合集团", () => {
    const state = createNewGame({ major: "liberal", playerName: "小刚" });

    expect(state.job.companyName).toBe("万合集团");
    expect(state.playerName).toBe("小刚");
    expect(state.player.network).toBe(10);
    expect(state.player.professional).toBe(13);
  });

  it("defaults to tech major and 新员工 when no params", () => {
    const state = createNewGame();

    expect(state.job.companyName).toBe("星云科技");
    expect(state.playerName).toBe("新员工");
  });

  it("sets NPC companyName to match selected company", () => {
    const state = createNewGame({ major: "finance" });

    for (const npc of state.npcs) {
      expect(npc.companyName).toBe("鼎信金融");
    }
  });

  it("exports the expected major union", () => {
    const majors: MajorType[] = ["tech", "finance", "liberal"];

    expect(majors).toHaveLength(3);
  });
});
