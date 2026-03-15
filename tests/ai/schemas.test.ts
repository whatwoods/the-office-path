import { describe, expect, it } from "vitest";

import {
  AgentInputSchema,
  EventAgentOutputSchema,
  NarrativeAgentOutputSchema,
  NPCAgentOutputSchema,
  WorldAgentOutputSchema,
} from "@/ai/schemas";

describe("WorldAgentOutputSchema", () => {
  it("accepts valid world output", () => {
    const data = {
      economy: "boom",
      trends: ["AI行业爆发", "互联网寒冬"],
      companyStatus: "expanding",
      newsItems: ["某大厂裁员20%"],
    };
    const result = WorldAgentOutputSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("rejects invalid economy value", () => {
    const data = {
      economy: "crash",
      trends: [],
      companyStatus: "stable",
      newsItems: [],
    };
    const result = WorldAgentOutputSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe("EventAgentOutputSchema", () => {
  it("accepts valid event output", () => {
    const data = {
      events: [
        {
          type: "workplace",
          title: "加班风暴",
          description: "项目deadline提前一周",
          severity: "medium",
          triggersCritical: false,
        },
      ],
      phoneMessages: [{ app: "maimai", content: "听说要裁员了" }],
    };
    const result = EventAgentOutputSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("accepts event with optional fields", () => {
    const data = {
      events: [
        {
          type: "life",
          title: "房东涨租",
          description: "月租涨500",
          severity: "low",
          triggersCritical: false,
          durationDays: 3,
          statChanges: { mood: -10 },
        },
      ],
      phoneMessages: [],
    };
    const result = EventAgentOutputSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("rejects invalid severity", () => {
    const data = {
      events: [
        {
          type: "workplace",
          title: "test",
          description: "test",
          severity: "extreme",
          triggersCritical: false,
        },
      ],
      phoneMessages: [],
    };
    const result = EventAgentOutputSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe("NPCAgentOutputSchema", () => {
  it("accepts valid NPC output", () => {
    const data = {
      npcActions: [
        {
          npcName: "王建国",
          action: "在会议上公开表扬你",
          dialogue: "小X最近表现不错",
          favorChange: 5,
          reason: "你上季度埋头工作表现好",
        },
      ],
      chatMessages: [
        {
          app: "xiaoxin",
          sender: "张伟",
          content: "今晚聚餐去不去？",
          replyOptions: ["去啊", "今天不行", "看情况"],
        },
      ],
    };
    const result = NPCAgentOutputSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("accepts NPC output with new/departed NPCs", () => {
    const data = {
      npcActions: [],
      chatMessages: [],
      newNpcs: [
        {
          id: "new_colleague",
          name: "陈明",
          role: "新同事",
          personality: "积极向上",
          hiddenGoal: "想快速晋升",
          favor: 50,
          isActive: true,
          currentStatus: "在岗",
        },
      ],
      departedNpcs: ["li_xue"],
    };
    const result = NPCAgentOutputSchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});

describe("NarrativeAgentOutputSchema", () => {
  it("accepts narrative without choices (quarterly mode)", () => {
    const data = {
      narrative: "这个季度过得波澜不惊...",
    };
    const result = NarrativeAgentOutputSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("accepts narrative with critical period choices", () => {
    const data = {
      narrative: "晋升答辩第一天...",
      choices: [
        {
          choiceId: "promote_day1_a",
          label: "认真准备PPT",
          staminaCost: 1,
          effects: {
            statChanges: { professional: 2 },
            npcFavorChanges: { 王建国: 5 },
          },
          category: "准备",
        },
        {
          choiceId: "promote_day1_b",
          label: "找领导套近乎",
          staminaCost: 1,
          effects: {
            npcFavorChanges: { 王建国: 10 },
            riskEvent: {
              probability: 0.3,
              description: "被同事撞见，觉得你拍马屁",
            },
          },
          category: "社交",
        },
      ],
    };
    const result = NarrativeAgentOutputSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("rejects choice with negative stamina cost", () => {
    const data = {
      narrative: "test",
      choices: [
        {
          choiceId: "bad",
          label: "bad",
          staminaCost: -1,
          effects: {},
          category: "test",
        },
      ],
    };
    const result = NarrativeAgentOutputSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe("AgentInputSchema", () => {
  const validState = {
    version: "1.0",
    phase: 1 as const,
    currentQuarter: 1,
    timeMode: "quarterly" as const,
    criticalPeriod: null,
    player: {
      health: 90,
      professional: 15,
      communication: 20,
      management: 5,
      network: 5,
      mood: 70,
      money: 5000,
      reputation: 0,
    },
    job: {
      companyName: "星辰互联",
      level: "L1" as const,
      salary: 3000,
      careerPath: "undecided" as const,
      quartersAtLevel: 0,
      totalQuarters: 0,
    },
    housing: { type: "shared" as const, hasMortgage: false },
    npcs: [],
    projectProgress: { completed: 0, majorCompleted: 0, currentProgress: 0 },
    performanceWindow: {
      workActionCount: 0,
      quartersInWindow: 0,
      history: [] as string[],
    },
    company: null,
    phoneMessages: [] as never[],
    history: [],
    world: {
      economyCycle: "stable" as const,
      industryTrends: [],
      companyStatus: "stable" as const,
    },
    staminaRemaining: 10,
    founderSalary: null,
  };

  it("validates a minimal agent input", () => {
    const result = AgentInputSchema.safeParse({
      state: validState,
      recentHistory: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid job level", () => {
    const data = {
      state: { ...validState, job: { ...validState.job, level: "L99" } },
      recentHistory: [],
    };
    const result = AgentInputSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("rejects invalid critical period type", () => {
    const data = {
      state: {
        ...validState,
        timeMode: "critical" as const,
        criticalPeriod: {
          type: "invalid_type",
          currentDay: 1,
          maxDays: 5,
          staminaPerDay: 3,
        },
      },
      recentHistory: [],
    };
    const result = AgentInputSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("rejects invalid performance rating in history", () => {
    const data = {
      state: {
        ...validState,
        performanceWindow: {
          workActionCount: 3,
          quartersInWindow: 2,
          history: ["D"],
        },
      },
      recentHistory: [],
    };
    const result = AgentInputSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("validates phone messages with proper schema", () => {
    const data = {
      state: {
        ...validState,
        phoneMessages: [
          {
            id: "msg1",
            app: "xiaoxin",
            sender: "张伟",
            content: "下班一起吃饭？",
            read: false,
            quarter: 1,
          },
        ],
      },
      recentHistory: [],
    };
    const result = AgentInputSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("validates company state for phase 2", () => {
    const data = {
      state: {
        ...validState,
        phase: 2 as const,
        company: {
          stage: "garage",
          productQuality: 30,
          teamSatisfaction: 70,
          customerCount: 5,
          brandAwareness: 10,
          employeeCount: 2,
          quarterlyRevenue: 50000,
          quarterlyExpenses: 30000,
          cashFlow: 20000,
          valuation: 200000,
          officeType: "home",
          founderEquity: 100,
          consecutiveNegativeCashFlow: 0,
          consecutiveProfitableQuarters: 0,
          hasSeriesAFunding: false,
          annualGrowthRate: 0,
        },
      },
      recentHistory: [],
    };
    const result = AgentInputSchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});
