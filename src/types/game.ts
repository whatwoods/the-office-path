import type { CompanyState } from "./company";

export interface PlayerAttributes {
  health: number;
  professional: number;
  communication: number;
  management: number;
  network: number;
  mood: number;
  money: number;
  reputation: number;
}

export type JobLevel =
  | "L1"
  | "L2"
  | "L3"
  | "L4"
  | "L5"
  | "L6_tech"
  | "L6_mgmt"
  | "L7_tech"
  | "L7_mgmt"
  | "L8";

export type CareerPath = "undecided" | "tech" | "management";

export const SALARY_TABLE: Record<JobLevel, number> = {
  L1: 3000,
  L2: 8000,
  L3: 15000,
  L4: 25000,
  L5: 35000,
  L6_tech: 50000,
  L6_mgmt: 50000,
  L7_tech: 80000,
  L7_mgmt: 80000,
  L8: 150000,
};

export type PerformanceRating = "S" | "A" | "B+" | "B" | "C";

export type HousingType =
  | "slum"
  | "shared"
  | "studio"
  | "apartment"
  | "luxury"
  | "owned";

export const RENT_TABLE: Record<HousingType, number> = {
  slum: 800,
  shared: 2000,
  studio: 4500,
  apartment: 8000,
  luxury: 15000,
  owned: 20000,
};

export const HOUSING_UNLOCK: Record<HousingType, number> = {
  slum: 0,
  shared: 0,
  studio: 10000,
  apartment: 20000,
  luxury: 40000,
  owned: 0,
};

export interface NPC {
  id: string;
  name: string;
  role: string;
  personality: string;
  hiddenGoal: string;
  favor: number;
  isActive: boolean;
  currentStatus: string;
}

export interface JobState {
  companyName: string;
  level: JobLevel;
  salary: number;
  careerPath: CareerPath;
  quartersAtLevel: number;
  totalQuarters: number;
}

export interface ProjectProgress {
  completed: number;
  majorCompleted: number;
  currentProgress: number;
}

export interface PerformanceWindow {
  workActionCount: number;
  quartersInWindow: number;
  history: PerformanceRating[];
}

export type PhoneApp =
  | "xiaoxin"
  | "maimai"
  | "jinritiaotiao"
  | "zhifubei"
  | "hrzhipin"
  | "baolema"
  | "huajiazhaogang"
  | "tiantian"
  | "dingding"
  | "huabingtong";

export interface PhoneMessage {
  id: string;
  app: PhoneApp;
  sender: string;
  content: string;
  read: boolean;
  quarter: number;
}

export type GamePhase = 1 | 2;

export type TimeMode = "quarterly" | "critical";

export type CriticalPeriodType =
  | "onboarding"
  | "promotion_review"
  | "company_crisis"
  | "project_sprint"
  | "job_negotiation"
  | "startup_launch"
  | "fundraising"
  | "ipo_review";

export interface CriticalPeriod {
  type: CriticalPeriodType;
  currentDay: number;
  maxDays: number;
  staminaPerDay: number;
}

export interface HousingState {
  type: HousingType;
  hasMortgage: boolean;
}

export interface WorldState {
  economyCycle: "boom" | "stable" | "winter";
  industryTrends: string[];
  companyStatus: "expanding" | "stable" | "shrinking";
}

export interface QuarterSummary {
  quarter: number;
  keyEvents: string[];
  statChanges: Partial<PlayerAttributes>;
  npcChanges: string[];
  narrativeSummary: string;
}

export interface GameState {
  version: string;
  phase: GamePhase;
  currentQuarter: number;
  timeMode: TimeMode;
  criticalPeriod: CriticalPeriod | null;
  player: PlayerAttributes;
  job: JobState;
  housing: HousingState;
  npcs: NPC[];
  projectProgress: ProjectProgress;
  performanceWindow: PerformanceWindow;
  company: CompanyState | null;
  phoneMessages: PhoneMessage[];
  history: QuarterSummary[];
  world: WorldState;
  staminaRemaining: number;
  founderSalary: number | null;
}

export type { CompanyState };
