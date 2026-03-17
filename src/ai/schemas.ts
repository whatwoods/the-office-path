import { z } from "zod";

const PhoneAppSchema = z.enum([
  "xiaoxin",
  "maimai",
  "jinritiaotiao",
  "zhifubei",
  "hrzhipin",
  "baolema",
  "huajiazhaogang",
  "tiantian",
  "dingding",
  "huabingtong",
]);

const JobLevelSchema = z.enum([
  "L1",
  "L2",
  "L3",
  "L4",
  "L5",
  "L6_tech",
  "L6_mgmt",
  "L7_tech",
  "L7_mgmt",
  "L8",
]);

const CriticalPeriodTypeSchema = z.enum([
  "onboarding",
  "promotion_review",
  "company_crisis",
  "project_sprint",
  "job_negotiation",
  "startup_launch",
  "fundraising",
  "ipo_review",
  "new_company_onboarding",
  "executive_onboarding",
  "board_review",
  "power_struggle",
  "major_decision",
  "power_transition",
]);

const PerformanceRatingSchema = z.enum(["S", "A", "B+", "B", "C"]);

const CompanyStageSchema = z.enum([
  "garage",
  "small_team",
  "series_a",
  "growth",
  "pre_ipo",
  "public",
]);

const OfficeTypeSchema = z.enum(["home", "incubator", "office", "grade_a"]);

const PlayerAttributesSchema = z.object({
  health: z.number(),
  professional: z.number(),
  communication: z.number(),
  management: z.number(),
  network: z.number(),
  mood: z.number(),
  money: z.number(),
  reputation: z.number(),
});

const PartialAttributesSchema = z
  .object({
    health: z.number().optional(),
    professional: z.number().optional(),
    communication: z.number().optional(),
    management: z.number().optional(),
    network: z.number().optional(),
    mood: z.number().optional(),
    money: z.number().optional(),
    reputation: z.number().optional(),
  })
  .optional();

const NPCSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  personality: z.string(),
  hiddenGoal: z.string(),
  favor: z.number().min(0).max(100),
  isActive: z.boolean(),
  currentStatus: z.string(),
  companyName: z.string(),
});

const ExecutiveStateSchema = z.object({
  stage: z.enum(["E1", "E2", "E3"]),
  departmentPerformance: z.number(),
  boardSupport: z.number(),
  teamLoyalty: z.number(),
  politicalCapital: z.number(),
  stockPrice: z.number(),
  departmentCount: z.number(),
  consecutiveLowPerformance: z.number(),
  vestedShares: z.number(),
  onTargetQuarters: z.number(),
});

const MaimaiCommentSchema = z.object({
  id: z.string(),
  author: z.enum(["player", "anonymous"]),
  content: z.string(),
  authorName: z.string(),
});

const MaimaiPostSchema = z.object({
  id: z.string(),
  quarter: z.number(),
  author: z.enum(["player", "anonymous"]),
  content: z.string(),
  likes: z.number(),
  playerLiked: z.boolean(),
  comments: z.array(MaimaiCommentSchema),
  viralLevel: z.enum(["ignored", "small_buzz", "trending", "viral"]).optional(),
  identityExposed: z.boolean().optional(),
});

const JobOfferSchema = z.object({
  id: z.string(),
  companyName: z.string(),
  companyProfile: z.string(),
  offeredLevel: JobLevelSchema,
  offeredSalary: z.number(),
  companyStatus: z.enum(["expanding", "stable", "shrinking"]),
  expiresAtQuarter: z.number(),
  negotiated: z.boolean(),
});

const PastJobSchema = z.object({
  companyName: z.string(),
  level: JobLevelSchema,
  salary: z.number(),
  startQuarter: z.number(),
  endQuarter: z.number(),
  reasonLeft: z.enum(["job_hop", "startup", "fired", "promoted_executive"]),
});

const CompanyStateSchema = z.object({
  stage: CompanyStageSchema,
  productQuality: z.number(),
  teamSatisfaction: z.number(),
  customerCount: z.number(),
  brandAwareness: z.number(),
  employeeCount: z.number(),
  quarterlyRevenue: z.number(),
  quarterlyExpenses: z.number(),
  cashFlow: z.number(),
  valuation: z.number(),
  officeType: OfficeTypeSchema,
  founderEquity: z.number(),
  consecutiveNegativeCashFlow: z.number(),
  consecutiveProfitableQuarters: z.number(),
  hasSeriesAFunding: z.boolean(),
  annualGrowthRate: z.number(),
});

const PhoneMessageSchema = z.object({
  id: z.string(),
  app: PhoneAppSchema,
  sender: z.string(),
  content: z.string(),
  replyOptions: z.array(z.string()).optional(),
  selectedReply: z.string().optional(),
  read: z.boolean(),
  quarter: z.number(),
});

const GameEventSchema = z.object({
  type: z.string(),
  title: z.string(),
  description: z.string(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  triggersCritical: z.boolean(),
  criticalType: CriticalPeriodTypeSchema.optional(),
  durationDays: z.number().int().positive().optional(),
  statChanges: PartialAttributesSchema,
});

const ChoiceEffectsSchema = z.object({
  statChanges: PartialAttributesSchema,
  npcFavorChanges: z.record(z.string(), z.number()).optional(),
  riskEvent: z
    .object({
      probability: z.number().min(0).max(1),
      description: z.string(),
      statChanges: PartialAttributesSchema,
    })
    .optional(),
});

const CriticalChoiceSchema = z.object({
  choiceId: z.string(),
  label: z.string(),
  staminaCost: z.number().int().min(0),
  effects: ChoiceEffectsSchema,
  category: z.string(),
});

export const WorldAgentOutputSchema = z.object({
  economy: z.enum(["boom", "stable", "winter"]),
  trends: z.array(z.string()),
  companyStatus: z.enum(["expanding", "stable", "shrinking"]),
  newsItems: z.array(z.string()),
});

export const EventAgentOutputSchema = z.object({
  events: z.array(GameEventSchema),
  phoneMessages: z.array(
    z.object({
      app: PhoneAppSchema,
      content: z.string(),
      sender: z.string().optional(),
    }),
  ),
  maimaiResults: z
    .object({
      postResults: z.array(
        z.object({
          postId: z.string(),
          aiAnalysis: z.string(),
          viralLevel: z.enum(["ignored", "small_buzz", "trending", "viral"]),
          consequences: z.object({
            playerEffects: PartialAttributesSchema,
            npcReactions: z
              .array(
                z.object({
                  npcName: z.string(),
                  favorChange: z.number(),
                }),
              )
              .optional(),
            identityExposed: z.boolean(),
            exposedTo: z.array(z.string()),
          }),
          generatedReplies: z.array(
            z.object({
              sender: z.string(),
              content: z.string(),
            }),
          ),
        }),
      ),
      interactionResults: z.array(
        z.object({
          targetPostId: z.string(),
          type: z.enum(["like", "comment"]),
          consequences: z.object({
            playerEffects: PartialAttributesSchema,
            npcReactions: z
              .array(
                z.object({
                  npcName: z.string(),
                  favorChange: z.number(),
                }),
              )
              .optional(),
          }),
        }),
      ),
    })
    .optional(),
});

export const NPCAgentOutputSchema = z.object({
  npcActions: z.array(
    z.object({
      npcName: z.string(),
      action: z.string(),
      dialogue: z.string().optional(),
      favorChange: z.number(),
      reason: z.string(),
    }),
  ),
  chatMessages: z.array(
    z.object({
      app: PhoneAppSchema,
      sender: z.string(),
      content: z.string(),
      replyOptions: z.array(z.string()).optional(),
    }),
  ),
  newNpcs: z.array(NPCSchema).optional(),
  departedNpcs: z.array(z.string()).optional(),
});

export const NarrativeAgentOutputSchema = z.object({
  narrative: z.string(),
  narrativeSummary: z.string().optional(),
  choices: z.array(CriticalChoiceSchema).optional(),
});

const JobStateSchema = z.object({
  companyName: z.string(),
  level: JobLevelSchema,
  salary: z.number(),
  careerPath: z.enum(["undecided", "tech", "management"]),
  quartersAtLevel: z.number(),
  totalQuarters: z.number(),
});

const QuarterSummarySchema = z.object({
  quarter: z.number(),
  keyEvents: z.array(z.string()),
  statChanges: PartialAttributesSchema,
  npcChanges: z.array(z.string()),
  narrativeSummary: z.string(),
});

const GameStateSchema = z.object({
  version: z.string(),
  playerName: z.string(),
  phase: z.union([z.literal(1), z.literal(2)]),
  currentQuarter: z.number(),
  timeMode: z.enum(["quarterly", "critical"]),
  criticalPeriod: z
    .object({
      type: CriticalPeriodTypeSchema,
      currentDay: z.number(),
      maxDays: z.number(),
      staminaPerDay: z.number(),
    })
    .nullable(),
  player: PlayerAttributesSchema,
  job: JobStateSchema,
  housing: z.object({
    type: z.enum(["slum", "shared", "studio", "apartment", "luxury", "owned"]),
    hasMortgage: z.boolean(),
  }),
  npcs: z.array(NPCSchema),
  projectProgress: z.object({
    completed: z.number(),
    majorCompleted: z.number(),
    currentProgress: z.number(),
  }),
  performanceWindow: z.object({
    workActionCount: z.number(),
    quartersInWindow: z.number(),
    history: z.array(PerformanceRatingSchema),
  }),
  company: CompanyStateSchema.nullable(),
  phoneMessages: z.array(PhoneMessageSchema),
  history: z.array(QuarterSummarySchema),
  world: z.object({
    economyCycle: z.enum(["boom", "stable", "winter"]),
    industryTrends: z.array(z.string()),
    companyStatus: z.enum(["expanding", "stable", "shrinking"]),
  }),
  staminaRemaining: z.number(),
  founderSalary: z.number().nullable(),
  phase2Path: z.enum(["startup", "executive"]).nullable(),
  executive: ExecutiveStateSchema.nullable(),
  maimaiPosts: z.array(MaimaiPostSchema),
  maimaiPostsThisQuarter: z.number(),
  jobOffers: z.array(JobOfferSchema),
  jobHistory: z.array(PastJobSchema),
});

export const AgentInputSchema = z.object({
  state: GameStateSchema,
  recentHistory: z.array(QuarterSummarySchema),
});

export const CRITICAL_PERIOD_CATEGORIES: Record<string, string[]> = {
  onboarding: ["学习", "社交", "表现"],
  promotion_review: ["准备", "社交", "信息"],
  company_crisis: ["应对", "站队", "自保"],
  project_sprint: ["工作", "协作", "取巧"],
  job_negotiation: ["谈判", "比较", "拖延"],
  startup_launch: ["搭建", "招人", "方向"],
  fundraising: ["展示", "谈判", "让步"],
  ipo_review: ["合规", "公关", "运作"],
  new_company_onboarding: ["适应", "社交", "表现"],
  executive_onboarding: ["接管", "部署", "表态"],
  board_review: ["汇报", "拉票", "甩锅"],
  power_struggle: ["结盟", "反击", "妥协"],
  major_decision: ["分析", "推动", "风控"],
  power_transition: ["布局", "造势", "谈判"],
};

export {
  CriticalChoiceSchema,
  GameEventSchema,
  NPCSchema,
  PartialAttributesSchema,
  PhoneAppSchema,
};
