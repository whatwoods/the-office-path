import { beforeEach, describe, expect, it, vi } from "vitest";

import { createNewGame } from "@/engine/state";
import { useGameStore } from "@/store/gameStore";
import { useSettingsStore } from "@/store/settingsStore";
import type { CriticalChoice, QuarterPlan } from "@/types/actions";
import { DEFAULT_SETTINGS } from "@/types/settings";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const storage: Record<string, string> = {};
vi.stubGlobal("localStorage", {
  getItem: (key: string) => storage[key] ?? null,
  setItem: (key: string, value: string) => {
    storage[key] = value;
  },
  removeItem: (key: string) => {
    delete storage[key];
  },
});

describe("useGameStore", () => {
  beforeEach(() => {
    useGameStore.setState({
      state: null,
      isLoading: false,
      error: null,
      activePanel: "attributes",
      activePhoneApp: null,
      showSaveModal: false,
      narrativeQueue: [],
      promotionInfo: null,
      currentEvent: null,
      criticalChoices: [],
      showQuarterTransition: false,
      lastPerformance: null,
    });
    mockFetch.mockReset();
    Object.keys(storage).forEach((key) => delete storage[key]);
    useSettingsStore.setState({ settings: structuredClone(DEFAULT_SETTINGS) });
  });

  it("has correct initial state", () => {
    const store = useGameStore.getState();
    expect(store.state).toBeNull();
    expect(store.isLoading).toBe(false);
    expect(store.activePanel).toBe("attributes");
    expect(store.currentEvent).toBeNull();
    expect(store.criticalChoices).toEqual([]);
    expect(store.showQuarterTransition).toBe(false);
    expect(store.lastPerformance).toBeNull();
  });

  it("newGame fetches and stores opening narrative + critical choices", async () => {
    const mockState = createNewGame();
    const openingChoices = [
      {
        choiceId: "onboarding_d1_a",
        label: "认真听培训",
        staminaCost: 1,
        effects: { statChanges: { professional: 2 } },
        category: "学习",
      },
    ];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          state: mockState,
          narrative: "入职第一天，你抱着笔记本走进了工位区。",
          criticalChoices: openingChoices,
        }),
    });

    await useGameStore.getState().newGame();

    const store = useGameStore.getState();
    expect(store.state).toEqual(mockState);
    expect(store.narrativeQueue).toEqual(["入职第一天，你抱着笔记本走进了工位区。"]);
    expect(store.criticalChoices).toEqual(openingChoices);
    expect(store.isLoading).toBe(false);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/game/new",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  it("newGame includes aiConfig in request body when apiKey is set", async () => {
    useSettingsStore
      .getState()
      .updateAI({ provider: "anthropic", apiKey: "sk-test-key" });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          state: createNewGame(),
          narrative: "入职了。",
          criticalChoices: [],
        }),
    });

    await useGameStore.getState().newGame();

    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.aiConfig).toEqual({
      provider: "anthropic",
      apiKey: "sk-test-key",
      modelOverrides: {},
    });
  });

  it("newGame omits aiConfig when apiKey is empty", async () => {
    useSettingsStore.setState({ settings: structuredClone(DEFAULT_SETTINGS) });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          state: createNewGame(),
          narrative: "入职了。",
          criticalChoices: [],
        }),
    });

    await useGameStore.getState().newGame();

    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.aiConfig).toBeUndefined();
  });

  it("newGame sets error on failure", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: "服务器错误" }),
    });

    await useGameStore.getState().newGame();

    expect(useGameStore.getState().error).toBe("服务器错误");
    expect(useGameStore.getState().state).toBeNull();
  });

  it("submitQuarter stores currentEvent and criticalChoices from the API response", async () => {
    const mockState = createNewGame();
    const quarterlyState = {
      ...mockState,
      timeMode: "quarterly" as const,
      criticalPeriod: null,
      staminaRemaining: 10,
    };
    useGameStore.setState({ state: quarterlyState });

    const returnedState = {
      ...quarterlyState,
      currentQuarter: 2,
      timeMode: "critical" as const,
      criticalPeriod: {
        type: "project_sprint" as const,
        currentDay: 1,
        maxDays: 5,
        staminaPerDay: 3,
      },
      staminaRemaining: 3,
    };
    const criticalEvent = {
      type: "project_deadline",
      title: "大客户项目进入冲刺周",
      description: "老板临时拍板，下周必须交付。",
      severity: "high" as const,
      triggersCritical: true,
      criticalType: "project_sprint" as const,
    };
    const nextChoices = [
      {
        choiceId: "project_sprint_d1_a",
        label: "先拆分任务",
        staminaCost: 1,
        effects: { statChanges: { professional: 1 } },
        category: "协作",
      },
    ];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          state: returnedState,
          narrative: "这个季度...",
          events: [criticalEvent],
          criticalChoices: nextChoices,
        }),
    });

    const plan: QuarterPlan = { actions: [{ action: "work_hard" }] };
    await useGameStore.getState().submitQuarter(plan);

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/game/turn",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"plan"'),
      }),
    );
    expect(useGameStore.getState().state).toEqual(returnedState);
    expect(useGameStore.getState().currentEvent).toEqual(criticalEvent);
    expect(useGameStore.getState().criticalChoices).toEqual(nextChoices);
    expect(useGameStore.getState().showQuarterTransition).toBe(true);
    expect(storage["office_path_save_auto"]).toBeDefined();
  });

  it("submitQuarter includes aiConfig in request body when apiKey is set", async () => {
    const mockState = createNewGame();
    const quarterlyState = {
      ...mockState,
      timeMode: "quarterly" as const,
      criticalPeriod: null,
      staminaRemaining: 10,
    };
    useGameStore.setState({ state: quarterlyState });
    useSettingsStore
      .getState()
      .updateAI({ provider: "deepseek", apiKey: "dk-quarter-key" });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          state: quarterlyState,
          narrative: "季度...",
          events: [],
        }),
    });

    const plan: QuarterPlan = { actions: [{ action: "work_hard" }] };
    await useGameStore.getState().submitQuarter(plan);

    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.aiConfig).toEqual({
      provider: "deepseek",
      apiKey: "dk-quarter-key",
      modelOverrides: {},
    });
  });

  it("submitQuarter respects autoSave setting", async () => {
    const mockState = createNewGame();
    const quarterlyState = {
      ...mockState,
      timeMode: "quarterly" as const,
      criticalPeriod: null,
      staminaRemaining: 10,
    };
    useGameStore.setState({ state: quarterlyState });
    useSettingsStore.getState().updateGameplay({ autoSave: false });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          state: mockState,
          narrative: "季度...",
          events: [],
        }),
    });

    const plan: QuarterPlan = { actions: [{ action: "work_hard" }] };
    await useGameStore.getState().submitQuarter(plan);

    expect(storage["office_path_save_auto"]).toBeUndefined();
  });

  it("submitQuarter stores performance when present", async () => {
    const mockState = createNewGame();
    const quarterlyState = {
      ...mockState,
      timeMode: "quarterly" as const,
      criticalPeriod: null,
      staminaRemaining: 10,
    };
    useGameStore.setState({ state: quarterlyState });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          state: quarterlyState,
          narrative: "评审季度...",
          events: [],
          performanceRating: "A",
          salaryChange: 5000,
        }),
    });

    const plan: QuarterPlan = { actions: [{ action: "work_hard" }] };
    await useGameStore.getState().submitQuarter(plan);

    expect(useGameStore.getState().lastPerformance).toEqual({
      rating: "A",
      salaryChange: 5000,
    });
  });

  it("submitChoice stores nextChoices for the next critical day", async () => {
    const mockState = createNewGame();
    useGameStore.setState({ state: mockState });

    const returnedState = { ...mockState };
    const nextChoices = [
      {
        choiceId: "onboarding_d2_a",
        label: "主动认识同组同事",
        staminaCost: 1,
        effects: { statChanges: { communication: 1 } },
        category: "社交",
      },
    ];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          state: returnedState,
          narrative: "你选择了...",
          nextChoices,
        }),
    });

    const choice: CriticalChoice = {
      choiceId: "test_a",
      label: "认真听培训",
      staminaCost: 1,
      effects: { statChanges: { professional: 2 } },
      category: "学习",
    };
    await useGameStore.getState().submitChoice(choice);

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/game/turn",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"choice"'),
      }),
    );
    expect(useGameStore.getState().criticalChoices).toEqual(nextChoices);
    expect(useGameStore.getState().showQuarterTransition).toBe(false);
  });

  it("submitChoice includes aiConfig in request body when apiKey is set", async () => {
    const mockState = createNewGame();
    useGameStore.setState({ state: mockState });
    useSettingsStore
      .getState()
      .updateAI({ provider: "anthropic", apiKey: "sk-choice-key" });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          state: mockState,
          narrative: "你选择了...",
          nextChoices: [],
        }),
    });

    const choice: CriticalChoice = {
      choiceId: "test_a",
      label: "认真听培训",
      staminaCost: 1,
      effects: { statChanges: { professional: 2 } },
      category: "学习",
    };
    await useGameStore.getState().submitChoice(choice);

    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.aiConfig).toEqual({
      provider: "anthropic",
      apiKey: "sk-choice-key",
      modelOverrides: {},
    });
  });

  it("submitChoice clears criticalChoices and triggers transition when critical period completes", async () => {
    const mockState = createNewGame();
    useGameStore.setState({
      state: mockState,
      criticalChoices: [
        {
          choiceId: "old_choice",
          label: "旧选择",
          staminaCost: 1,
          effects: {},
          category: "测试",
        },
      ],
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          state: {
            ...mockState,
            timeMode: "quarterly",
            criticalPeriod: null,
            staminaRemaining: 10,
          },
          narrative: "关键期结束...",
          nextChoices: [],
          isComplete: true,
        }),
    });

    const choice: CriticalChoice = {
      choiceId: "final_choice",
      label: "完成最后一天",
      staminaCost: 1,
      effects: {},
      category: "表现",
    };
    await useGameStore.getState().submitChoice(choice);

    expect(useGameStore.getState().criticalChoices).toEqual([]);
    expect(useGameStore.getState().showQuarterTransition).toBe(true);
  });

  it("resignStartup calls the dedicated route and stores startup choices", async () => {
    const mockState = {
      ...createNewGame(),
      timeMode: "quarterly" as const,
      criticalPeriod: null,
      job: {
        ...createNewGame().job,
        level: "L6_tech" as const,
      },
    };
    useGameStore.setState({ state: mockState });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          state: {
            ...mockState,
            phase: 2,
            timeMode: "critical",
            criticalPeriod: {
              type: "startup_launch",
              currentDay: 1,
              maxDays: 7,
              staminaPerDay: 3,
            },
            staminaRemaining: 3,
          },
          narrative: "你把工牌放在桌上，心里一下子轻了。",
          criticalChoices: [
            {
              choiceId: "startup_launch_d1_a",
              label: "先把最小可用产品列出来",
              staminaCost: 1,
              effects: { statChanges: { professional: 2 } },
              category: "搭建",
            },
          ],
        }),
    });

    await useGameStore.getState().resignStartup();

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/game/resign",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"state"'),
      }),
    );
    expect(useGameStore.getState().state?.phase).toBe(2);
    expect(useGameStore.getState().criticalChoices).toHaveLength(1);
  });

  it("resignStartup passes the requested phase 2 path", async () => {
    const mockState = {
      ...createNewGame(),
      timeMode: "quarterly" as const,
      criticalPeriod: null,
      job: {
        ...createNewGame().job,
        level: "L8" as const,
      },
    };
    useGameStore.setState({ state: mockState });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          state: {
            ...mockState,
            phase: 2,
            phase2Path: "executive",
            executive: {
              stage: "E1",
              departmentPerformance: 50,
              boardSupport: 40,
              teamLoyalty: 60,
              politicalCapital: 20,
              stockPrice: 100,
              departmentCount: 1,
              consecutiveLowPerformance: 0,
              vestedShares: 0,
              onTargetQuarters: 0,
            },
            timeMode: "critical",
            criticalPeriod: {
              type: "executive_onboarding",
              currentDay: 1,
              maxDays: 3,
              staminaPerDay: 3,
            },
            staminaRemaining: 3,
          },
          narrative: "你决定留在权力中心。",
          criticalChoices: [],
        }),
    });

    await useGameStore.getState().resignStartup("executive");

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/game/resign",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"path":"executive"'),
      }),
    );
  });

  it("resignStartup includes aiConfig in request body when apiKey is set", async () => {
    const mockState = {
      ...createNewGame(),
      timeMode: "quarterly" as const,
      criticalPeriod: null,
      job: {
        ...createNewGame().job,
        level: "L8" as const,
      },
    };
    useGameStore.setState({ state: mockState });
    useSettingsStore
      .getState()
      .updateAI({ provider: "openai", apiKey: "sk-resign-key" });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          state: {
            ...mockState,
            phase: 2,
            timeMode: "critical",
            criticalPeriod: {
              type: "startup_launch",
              currentDay: 1,
              maxDays: 7,
              staminaPerDay: 3,
            },
            staminaRemaining: 3,
          },
          narrative: "创业了。",
          criticalChoices: [],
        }),
    });

    await useGameStore.getState().resignStartup();

    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.aiConfig).toEqual({
      provider: "openai",
      apiKey: "sk-resign-key",
      modelOverrides: {},
    });
  });

  it("postOnMaimai creates a new post and increments the quarterly counter", () => {
    const state = createNewGame();
    state.timeMode = "quarterly";
    state.criticalPeriod = null;
    state.currentQuarter = 2;
    useGameStore.setState({ state });

    useGameStore.getState().postOnMaimai("今天的会离谱得像段子");

    const nextState = useGameStore.getState().state;
    expect(nextState?.maimaiPosts).toHaveLength(1);
    expect(nextState?.maimaiPosts[0].content).toBe("今天的会离谱得像段子");
    expect(nextState?.maimaiPosts[0].author).toBe("player");
    expect(nextState?.maimaiPostsThisQuarter).toBe(1);
  });

  it("likePost and commentOnPost update the selected MaiMai post", () => {
    const state = createNewGame();
    state.maimaiPosts = [
      {
        id: "post-1",
        quarter: 1,
        author: "anonymous",
        content: "听说这周又要加班",
        likes: 3,
        playerLiked: false,
        comments: [],
      },
    ];
    useGameStore.setState({ state });

    useGameStore.getState().likePost("post-1");
    useGameStore.getState().commentOnPost("post-1", "这消息保真吗");

    const post = useGameStore.getState().state?.maimaiPosts[0];
    expect(post?.likes).toBe(4);
    expect(post?.playerLiked).toBe(true);
    expect(post?.comments).toHaveLength(1);
    expect(post?.comments[0].content).toBe("这消息保真吗");
  });

  it("ignoreOffer removes a pending offer", () => {
    const state = createNewGame();
    state.jobOffers = [
      {
        id: "offer-1",
        companyName: "新公司",
        companyProfile: "专注AI协作",
        offeredLevel: "L3",
        offeredSalary: 18000,
        companyStatus: "stable",
        expiresAtQuarter: 5,
        negotiated: false,
      },
    ];
    useGameStore.setState({ state });

    useGameStore.getState().ignoreOffer("offer-1");

    expect(useGameStore.getState().state?.jobOffers).toEqual([]);
  });

  it("acceptOffer applies the job hop and enters onboarding", async () => {
    const state = createNewGame();
    state.timeMode = "quarterly";
    state.criticalPeriod = null;
    state.job.level = "L3";
    state.job.salary = 15000;
    state.job.companyName = "星辰互联";
    state.jobOffers = [
      {
        id: "offer-1",
        companyName: "新公司",
        companyProfile: "专注AI协作",
        offeredLevel: "L3",
        offeredSalary: 18000,
        companyStatus: "stable",
        expiresAtQuarter: 5,
        negotiated: false,
      },
    ];
    useGameStore.setState({ state });

    await useGameStore.getState().acceptOffer("offer-1");

    const nextState = useGameStore.getState().state;
    expect(nextState?.job.companyName).toBe("新公司");
    expect(nextState?.job.salary).toBe(18000);
    expect(nextState?.criticalPeriod?.type).toBe("new_company_onboarding");
    expect(nextState?.jobOffers).toEqual([]);
    expect(useGameStore.getState().showQuarterTransition).toBe(true);
  });

  it("saveGame and loadGame work with localStorage", () => {
    const mockState = createNewGame();
    useGameStore.setState({ state: mockState });

    useGameStore.getState().saveGame("slot1");
    expect(storage["office_path_save_slot1"]).toBeDefined();

    useGameStore.setState({ state: null });
    expect(useGameStore.getState().state).toBeNull();

    useGameStore.getState().loadGame("slot1");
    expect(useGameStore.getState().state).toEqual(mockState);
  });

  it("loadGame sets error for empty slot", () => {
    useGameStore.getState().loadGame("slot2");
    expect(useGameStore.getState().error).toBe("存档不存在");
  });

  it("loadGame derives promotion info from the loaded state", () => {
    const promotableState = createNewGame();
    promotableState.job.totalQuarters = 1;
    useGameStore.setState({ state: promotableState });

    useGameStore.getState().saveGame("slot1");
    useGameStore.setState({ state: null, promotionInfo: null });

    useGameStore.getState().loadGame("slot1");

    expect(useGameStore.getState().promotionInfo).toEqual({
      eligible: true,
      nextLevels: ["L2"],
      failReasons: [],
    });
  });

  it("refreshState derives promotion info from local state", async () => {
    const mockState = createNewGame();
    mockState.job.totalQuarters = 1;
    useGameStore.setState({ state: mockState });

    await useGameStore.getState().refreshState();

    expect(useGameStore.getState().promotionInfo).toEqual({
      eligible: true,
      nextLevels: ["L2"],
      failReasons: [],
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("submitChoice ignores duplicate requests while already loading", async () => {
    const mockState = createNewGame();
    const choice: CriticalChoice = {
      choiceId: "onboarding_d1_a",
      label: "先熟悉环境",
      staminaCost: 1,
      effects: {},
      category: "学习",
    };
    useGameStore.setState({ state: mockState, isLoading: true });

    await useGameStore.getState().submitChoice(choice);

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("dismissQuarterTransition clears the flag", () => {
    useGameStore.setState({ showQuarterTransition: true });

    useGameStore.getState().dismissQuarterTransition();

    expect(useGameStore.getState().showQuarterTransition).toBe(false);
  });

  it("dismissEvent clears currentEvent", () => {
    useGameStore.setState({
      currentEvent: {
        type: "test",
        title: "测试事件",
        description: "说明",
        severity: "low",
        triggersCritical: false,
      },
    });

    useGameStore.getState().dismissEvent();

    expect(useGameStore.getState().currentEvent).toBeNull();
  });

  it("dismissPerformance clears lastPerformance", () => {
    useGameStore.setState({
      lastPerformance: { rating: "A", salaryChange: 5000 },
    });

    useGameStore.getState().dismissPerformance();

    expect(useGameStore.getState().lastPerformance).toBeNull();
  });
});
