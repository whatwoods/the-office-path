import { INITIAL_ATTRIBUTES, applyStatChanges } from "@/engine/attributes";
import type {
  GameState,
  MajorType,
  NPC,
  PlayerAttributes,
} from "@/types/game";

export interface IntroParams {
  major?: MajorType;
  playerName?: string;
}

const MAJOR_CONFIG: Record<
  MajorType,
  {
    company: string;
    title: string;
    attrBonus: Partial<PlayerAttributes>;
  }
> = {
  tech: {
    company: "星云科技",
    title: "产品运营实习生",
    attrBonus: { professional: 5, communication: -2 },
  },
  finance: {
    company: "鼎信金融",
    title: "客户经理助理实习生",
    attrBonus: { communication: 5, professional: -2 },
  },
  liberal: {
    company: "万合集团",
    title: "行政管理实习生",
    attrBonus: { network: 5, professional: -2 },
  },
};

function createInitialNPCs(companyName: string): NPC[] {
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
      companyName,
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
      companyName,
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
      companyName,
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
      companyName,
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
      companyName,
    },
  ];
}

export function createNewGame(params?: IntroParams): GameState {
  const major = params?.major ?? "tech";
  const playerName = params?.playerName ?? "新员工";
  const config = MAJOR_CONFIG[major];
  const player = applyStatChanges({ ...INITIAL_ATTRIBUTES }, config.attrBonus);

  return {
    version: "1.2",
    playerName,
    phase: 1,
    currentQuarter: 0,
    timeMode: "critical",
    criticalPeriod: {
      type: "onboarding",
      currentDay: 1,
      maxDays: 5,
      staminaPerDay: 3,
    },
    player,
    job: {
      companyName: config.company,
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
    npcs: createInitialNPCs(config.company),
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
