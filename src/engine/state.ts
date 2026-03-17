import { INITIAL_ATTRIBUTES } from "@/engine/attributes";
import type { GameState, NPC } from "@/types/game";

function createInitialNPCs(): NPC[] {
  return [
    {
      id: "wang_jianguo",
      name: "王建国",
      role: "直属领导",
      personality: "表面和善，实则精于算计",
      hiddenGoal: "想升总监，需要能干的下属出成绩",
      favor: 50,
      isActive: true,
      currentStatus: "在岗",
      companyName: "星辰互联",
    },
    {
      id: "zhang_wei",
      name: "张伟",
      role: "同组同事",
      personality: "热心但爱八卦",
      hiddenGoal: "也想晋升，视玩家为竞争对手",
      favor: 50,
      isActive: true,
      currentStatus: "在岗",
      companyName: "星辰互联",
    },
    {
      id: "li_xue",
      name: "李雪",
      role: "隔壁组同事",
      personality: "安静内向，技术很强",
      hiddenGoal: "其实在准备跳槽",
      favor: 50,
      isActive: true,
      currentStatus: "在岗",
      companyName: "星辰互联",
    },
    {
      id: "zhao_zong",
      name: "赵总",
      role: "部门总监",
      personality: "强势、结果导向",
      hiddenGoal: "面临业绩压力，随时可能裁员",
      favor: 40,
      isActive: true,
      currentStatus: "在岗",
      companyName: "星辰互联",
    },
    {
      id: "xiao_mei",
      name: "小美",
      role: "前台/行政",
      personality: "开朗话多",
      hiddenGoal: "公司八卦情报站",
      favor: 55,
      isActive: true,
      currentStatus: "在岗",
      companyName: "星辰互联",
    },
  ];
}

export function createNewGame(): GameState {
  return {
    version: "1.1",
    phase: 1,
    currentQuarter: 0,
    timeMode: "critical",
    criticalPeriod: {
      type: "onboarding",
      currentDay: 1,
      maxDays: 5,
      staminaPerDay: 3,
    },
    player: { ...INITIAL_ATTRIBUTES },
    job: {
      companyName: "星辰互联",
      level: "L1",
      salary: 3000,
      careerPath: "undecided",
      quartersAtLevel: 0,
      totalQuarters: 0,
    },
    housing: {
      type: "shared",
      hasMortgage: false,
    },
    npcs: createInitialNPCs(),
    projectProgress: {
      completed: 0,
      majorCompleted: 0,
      currentProgress: 0,
    },
    performanceWindow: {
      workActionCount: 0,
      quartersInWindow: 0,
      history: [],
    },
    company: null,
    phoneMessages: [],
    history: [],
    world: {
      economyCycle: "stable",
      industryTrends: [],
      companyStatus: "stable",
    },
    staminaRemaining: 3,
    founderSalary: null,
    phase2Path: null,
    executive: null,
    maimaiPosts: [],
    maimaiPostsThisQuarter: 0,
    jobOffers: [],
    jobHistory: [],
  };
}
