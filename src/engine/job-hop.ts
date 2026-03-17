import type { GameState, JobLevel, NPC } from "@/types/game";
import type { JobOffer, PastJob } from "@/types/job-offer";

export const JOB_LEVEL_ORDER: Record<JobLevel, number> = {
  L1: 1,
  L2: 2,
  L3: 3,
  L4: 4,
  L5: 5,
  L6_tech: 6,
  L6_mgmt: 6,
  L7_tech: 7,
  L7_mgmt: 7,
  L8: 8,
};

export function calculateOfferSalary(
  currentSalary: number,
  reputation: number,
  professional: number,
): number {
  const basePremium = 1.15;
  const reputationBonus = reputation * 0.003;
  const professionalBonus = professional * 0.002;
  const multiplier = Math.min(
    basePremium + reputationBonus + professionalBonus,
    1.5,
  );

  return Math.round(currentSalary * multiplier);
}

export function isLevelDowngrade(
  current: JobLevel,
  offered: JobLevel,
): boolean {
  return JOB_LEVEL_ORDER[offered] < JOB_LEVEL_ORDER[current];
}

export function validateOffer(
  offer: Pick<JobOffer, "offeredLevel" | "offeredSalary">,
  currentLevel: JobLevel,
  currentSalary: number,
  reputation: number,
  professional: number,
): { valid: boolean; reason?: string } {
  if (isLevelDowngrade(currentLevel, offer.offeredLevel)) {
    return {
      valid: false,
      reason: "Level downgrade not allowed",
    };
  }

  const maxSalary = calculateOfferSalary(
    currentSalary,
    reputation,
    professional,
  );

  if (offer.offeredSalary > maxSalary) {
    return {
      valid: false,
      reason: "Salary exceeds cap",
    };
  }

  return { valid: true };
}

export function executeJobHop(state: GameState, offer: JobOffer): GameState {
  const jobStartQuarter =
    state.jobHistory.length > 0
      ? state.jobHistory[state.jobHistory.length - 1].endQuarter
      : 0;

  const pastJob: PastJob = {
    companyName: state.job.companyName,
    level: state.job.level,
    salary: state.job.salary,
    startQuarter: jobStartQuarter,
    endQuarter: state.currentQuarter,
    reasonLeft: "job_hop",
  };

  const newState: GameState = JSON.parse(JSON.stringify(state));

  newState.npcs = newState.npcs.map((npc) =>
    npc.isActive ? { ...npc, isActive: false } : npc,
  );

  pruneInactiveNpcCompanies(newState);

  newState.job = {
    ...newState.job,
    companyName: offer.companyName,
    level: offer.offeredLevel,
    salary: offer.offeredSalary,
    quartersAtLevel: 0,
  };

  newState.jobHistory = [...newState.jobHistory, pastJob];

  newState.jobOffers = newState.jobOffers.filter(
    (candidate) =>
      candidate.id !== offer.id &&
      candidate.expiresAtQuarter >= newState.currentQuarter,
  );

  if (state.projectProgress.currentProgress > 0) {
    newState.player.reputation = Math.max(0, newState.player.reputation - 10);
  }

  newState.projectProgress.currentProgress = 0;

  const formerLeader = state.npcs.find(
    (npc) => npc.role === "直属领导" && npc.isActive,
  );
  if (formerLeader) {
    const formerLeaderRecord = newState.npcs.find(
      (npc) => npc.id === formerLeader.id,
    );
    if (formerLeaderRecord) {
      formerLeaderRecord.favor = 0;
    }
  }

  newState.timeMode = "critical";
  newState.criticalPeriod = {
    type: "new_company_onboarding",
    currentDay: 1,
    maxDays: 3,
    staminaPerDay: 3,
  };
  newState.staminaRemaining = 3;

  newState.npcs = [
    ...newState.npcs,
    ...createPlaceholderNPCs(offer.companyName, newState.currentQuarter),
  ];

  newState.world = {
    ...newState.world,
    companyStatus: offer.companyStatus,
  };

  return newState;
}

function pruneInactiveNpcCompanies(state: GameState): void {
  const inactiveCompanies = [
    ...new Set(
      state.npcs
        .filter((npc) => !npc.isActive)
        .map((npc) => npc.companyName),
    ),
  ];

  if (inactiveCompanies.length <= 3) {
    return;
  }

  const keepCompanies = new Set(inactiveCompanies.slice(-3));
  state.npcs = state.npcs.filter(
    (npc) => npc.isActive || keepCompanies.has(npc.companyName),
  );
}

function createPlaceholderNPCs(
  companyName: string,
  currentQuarter: number,
): NPC[] {
  const idPrefix = `${companyName}-${currentQuarter}`;

  return [
    {
      id: `${idPrefix}-leader`,
      name: "新领导",
      role: "直属领导",
      personality: "待观察",
      hiddenGoal: "未知",
      favor: 50,
      isActive: true,
      currentStatus: "在岗",
      companyName,
    },
    {
      id: `${idPrefix}-peer-1`,
      name: "新同事A",
      role: "同组同事",
      personality: "待观察",
      hiddenGoal: "未知",
      favor: 50,
      isActive: true,
      currentStatus: "在岗",
      companyName,
    },
    {
      id: `${idPrefix}-peer-2`,
      name: "新同事B",
      role: "跨组同事",
      personality: "待观察",
      hiddenGoal: "未知",
      favor: 50,
      isActive: true,
      currentStatus: "在岗",
      companyName,
    },
    {
      id: `${idPrefix}-director`,
      name: "部门高管",
      role: "部门总监",
      personality: "待观察",
      hiddenGoal: "未知",
      favor: 45,
      isActive: true,
      currentStatus: "在岗",
      companyName,
    },
    {
      id: `${idPrefix}-admin`,
      name: "行政小姐",
      role: "行政",
      personality: "待观察",
      hiddenGoal: "未知",
      favor: 55,
      isActive: true,
      currentStatus: "在岗",
      companyName,
    },
  ];
}
