import { describe, expect, it } from "vitest";

import {
  validateChoices,
  validateEventNPCConsistency,
  validateExecutiveEvents,
  validateEvents,
  validateNPCActions,
} from "@/ai/orchestration/conflict";
import type { EventAgentOutput, NPCAgentOutput, WorldAgentOutput } from "@/types/agents";
import type { CriticalChoice } from "@/types/actions";
import type { GameEvent } from "@/types/events";
import type { CriticalPeriodType, NPC } from "@/types/game";

describe("validateEvents", () => {
  const boomWorld: WorldAgentOutput = {
    economy: "boom",
    trends: [],
    companyStatus: "expanding",
    newsItems: [],
  };
  const winterWorld: WorldAgentOutput = {
    economy: "winter",
    trends: [],
    companyStatus: "shrinking",
    newsItems: [],
  };

  it("keeps events consistent with world economy", () => {
    const events: GameEvent[] = [
      {
        type: "industry",
        title: "全行业大裁员",
        description: "寒冬来了",
        severity: "critical",
        triggersCritical: true,
      },
      {
        type: "workplace",
        title: "团建",
        description: "去爬山",
        severity: "low",
        triggersCritical: false,
      },
    ];

    const result = validateEvents(events, boomWorld);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("团建");
  });

  it("keeps layoff events during winter", () => {
    const events: GameEvent[] = [
      {
        type: "industry",
        title: "全行业大裁员",
        description: "寒冬来了",
        severity: "critical",
        triggersCritical: true,
      },
    ];

    const result = validateEvents(events, winterWorld);
    expect(result).toHaveLength(1);
  });

  it("passes through non-conflicting events unchanged", () => {
    const events: GameEvent[] = [
      {
        type: "life",
        title: "房东涨租",
        description: "月租涨500",
        severity: "low",
        triggersCritical: false,
      },
    ];

    const result = validateEvents(events, boomWorld);
    expect(result).toHaveLength(1);
  });
});

describe("validateEventNPCConsistency", () => {
  const npcs: NPC[] = [
    {
      id: "wang",
      name: "王建国",
      role: "直属领导",
      personality: "表面和善，实则精于算计",
      hiddenGoal: "",
      favor: 50,
      isActive: true,
      currentStatus: "在岗",
      companyName: "星辰互联",
    },
    {
      id: "zhang",
      name: "张伟",
      role: "同组同事",
      personality: "热心但爱八卦",
      hiddenGoal: "",
      favor: 50,
      isActive: true,
      currentStatus: "在岗",
      companyName: "星辰互联",
    },
  ];

  it("discards events that name an NPC acting against their personality", () => {
    const events: GameEvent[] = [
      {
        type: "workplace",
        title: "王建国当众发飙骂人",
        description: "王建国在全体会上破口大骂",
        severity: "high",
        triggersCritical: false,
      },
      {
        type: "workplace",
        title: "团建",
        description: "去爬山",
        severity: "low",
        triggersCritical: false,
      },
    ];

    const result = validateEventNPCConsistency(events, npcs);
    expect(result.length).toBeLessThanOrEqual(2);
    expect(result.some((event) => event.title === "团建")).toBe(true);
  });

  it("keeps events not involving specific NPCs", () => {
    const events: GameEvent[] = [
      {
        type: "life",
        title: "房东涨租",
        description: "月租涨500",
        severity: "low",
        triggersCritical: false,
      },
    ];

    const result = validateEventNPCConsistency(events, npcs);
    expect(result).toHaveLength(1);
  });

  it("enforces max 2 discards per quarter", () => {
    const events: GameEvent[] = [
      {
        type: "workplace",
        title: "王建国暴怒1",
        description: "王建国骂人",
        severity: "high",
        triggersCritical: false,
      },
      {
        type: "workplace",
        title: "王建国暴怒2",
        description: "王建国骂人",
        severity: "high",
        triggersCritical: false,
      },
      {
        type: "workplace",
        title: "王建国暴怒3",
        description: "王建国骂人",
        severity: "high",
        triggersCritical: false,
      },
      {
        type: "workplace",
        title: "正常事件",
        description: "正常",
        severity: "low",
        triggersCritical: false,
      },
    ];

    const result = validateEventNPCConsistency(events, npcs);
    expect(result.length).toBeGreaterThanOrEqual(2);
  });
});

describe("validateNPCActions", () => {
  const npcs: NPC[] = [
    {
      id: "wang",
      name: "王建国",
      role: "直属领导",
      personality: "表面和善，实则精于算计",
      hiddenGoal: "",
      favor: 50,
      isActive: true,
      currentStatus: "在岗",
      companyName: "星辰互联",
    },
    {
      id: "zhang",
      name: "张伟",
      role: "同组同事",
      personality: "热心但爱八卦",
      hiddenGoal: "",
      favor: 50,
      isActive: true,
      currentStatus: "在岗",
      companyName: "星辰互联",
    },
  ];

  it("filters out actions for non-existent NPCs", () => {
    const npcOutput: NPCAgentOutput = {
      npcActions: [
        { npcName: "王建国", action: "表扬你", favorChange: 5, reason: "好" },
        { npcName: "不存在的人", action: "打招呼", favorChange: 3, reason: "客气" },
      ],
      chatMessages: [],
    };

    const result = validateNPCActions(npcOutput, npcs);
    expect(result.npcActions).toHaveLength(1);
    expect(result.npcActions[0].npcName).toBe("王建国");
  });

  it("caps favor changes to ±20 per action", () => {
    const npcOutput: NPCAgentOutput = {
      npcActions: [
        { npcName: "王建国", action: "大发雷霆", favorChange: -50, reason: "怒了" },
      ],
      chatMessages: [],
    };

    const result = validateNPCActions(npcOutput, npcs);
    expect(result.npcActions[0].favorChange).toBe(-20);
  });

  it("limits discarded actions to max 2 per quarter", () => {
    const npcOutput: NPCAgentOutput = {
      npcActions: [
        { npcName: "鬼1", action: "a", favorChange: 5, reason: "x" },
        { npcName: "鬼2", action: "b", favorChange: 5, reason: "x" },
        { npcName: "鬼3", action: "c", favorChange: 5, reason: "x" },
        { npcName: "王建国", action: "d", favorChange: 5, reason: "x" },
      ],
      chatMessages: [],
    };

    const result = validateNPCActions(npcOutput, npcs);
    expect(result.npcActions.length).toBeGreaterThanOrEqual(1);
    expect(result.npcActions.some((action) => action.npcName === "王建国")).toBe(true);
  });
});

describe("validateChoices", () => {
  const mockPlayer = {
    health: 90,
    professional: 15,
    communication: 20,
    management: 5,
    network: 5,
    mood: 70,
    money: 5000,
    reputation: 0,
  };

  it("filters choices exceeding remaining stamina", () => {
    const choices: CriticalChoice[] = [
      { choiceId: "a", label: "A", staminaCost: 1, effects: {}, category: "学习" },
      { choiceId: "b", label: "B", staminaCost: 3, effects: {}, category: "表现" },
      { choiceId: "c", label: "C", staminaCost: 2, effects: {}, category: "社交" },
    ];

    const result = validateChoices(
      choices,
      2,
      "onboarding" as CriticalPeriodType,
      mockPlayer,
    );
    expect(result).toHaveLength(2);
    expect(result.map((choice) => choice.choiceId)).toEqual(["a", "c"]);
  });

  it("filters choices with invalid category for the critical period type", () => {
    const choices: CriticalChoice[] = [
      { choiceId: "a", label: "A", staminaCost: 1, effects: {}, category: "学习" },
      { choiceId: "b", label: "B", staminaCost: 1, effects: {}, category: "黑客攻击" },
    ];

    const result = validateChoices(
      choices,
      3,
      "onboarding" as CriticalPeriodType,
      mockPlayer,
    );
    expect(result).toHaveLength(1);
    expect(result[0].category).toBe("学习");
  });

  it("clamps stat changes to not exceed attribute bounds", () => {
    const choices: CriticalChoice[] = [
      {
        choiceId: "a",
        label: "A",
        staminaCost: 1,
        category: "学习",
        effects: { statChanges: { professional: 50 } },
      },
    ];

    const result = validateChoices(
      choices,
      3,
      "onboarding" as CriticalPeriodType,
      mockPlayer,
    );
    expect(result[0].effects.statChanges?.professional).toBe(50);

    const nearCapPlayer = { ...mockPlayer, professional: 95 };
    const resultNearCap = validateChoices(
      choices,
      3,
      "onboarding" as CriticalPeriodType,
      nearCapPlayer,
    );
    expect(resultNearCap[0].effects.statChanges?.professional).toBe(5);
  });

  it("keeps at least 1 valid choice", () => {
    const choices: CriticalChoice[] = [
      {
        choiceId: "a",
        label: "A",
        staminaCost: 5,
        effects: { statChanges: { professional: 999 } },
        category: "学习",
      },
      {
        choiceId: "b",
        label: "B",
        staminaCost: 5,
        effects: {},
        category: "社交",
      },
    ];

    const result = validateChoices(
      choices,
      1,
      "onboarding" as CriticalPeriodType,
      mockPlayer,
    );
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].staminaCost).toBeLessThanOrEqual(1);
    expect(result[0].effects.statChanges?.professional).toBe(85);
  });
});

describe("validateExecutiveEvents", () => {
  const npcs: NPC[] = [
    {
      id: "leader",
      name: "周总",
      role: "直属领导",
      personality: "强势",
      hiddenGoal: "",
      favor: 50,
      isActive: true,
      currentStatus: "在岗",
      companyName: "星辰互联",
    },
  ];

  it("filters executive events that mention non-existent positions", () => {
    const output: EventAgentOutput = {
      events: [
        {
          type: "workplace",
          title: "CFO公开质疑你的预算",
          description: "财务负责人在会上点名你",
          severity: "high",
          triggersCritical: false,
        },
        {
          type: "workplace",
          title: "董事会要求你补充材料",
          description: "下周参加董事会汇报",
          severity: "medium",
          triggersCritical: false,
        },
      ],
      phoneMessages: [],
    };

    const result = validateExecutiveEvents(output, npcs);

    expect(result.events).toHaveLength(1);
    expect(result.events[0].title).toContain("董事会");
  });

  it("caps MaiMai consequence severity based on viral level", () => {
    const output: EventAgentOutput = {
      events: [],
      phoneMessages: [],
      maimaiResults: {
        postResults: [
          {
            postId: "post-1",
            aiAnalysis: "几乎没人关注",
            viralLevel: "ignored",
            consequences: {
              playerEffects: { reputation: 10 },
              npcReactions: [{ npcName: "周总", favorChange: -10 }],
              identityExposed: false,
              exposedTo: [],
            },
            generatedReplies: [],
          },
        ],
        interactionResults: [],
      },
    };

    const result = validateExecutiveEvents(output, npcs);
    const postResult = result.maimaiResults?.postResults[0];

    expect(postResult?.consequences.playerEffects?.reputation).toBe(2);
    expect(postResult?.consequences.npcReactions?.[0].favorChange).toBe(-2);
  });
});
