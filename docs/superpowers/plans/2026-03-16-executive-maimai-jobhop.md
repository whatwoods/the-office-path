# 留任高管 + 麦麦发帖 + 跳槽机制 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three interconnected features — executive retention path, free-form MaiMai posting with AI consequences, and job-hopping with full company transitions.

**Architecture:** Extend the existing layered architecture (types → engine → AI agents → orchestration → API → store → UI). New types files for each feature domain; new engine modules for executive actions/settlement, job-hop logic, and MaiMai management; extended AI agents/schemas for MaiMai consequences and executive narratives; new/updated UI components for MaiMai feed, job offers, and executive dashboard.

**Tech Stack:** Next.js 15, TypeScript, Zustand, Zod, Vitest, multi-model AI (OpenAI/Anthropic)

**Spec:** `docs/superpowers/specs/2026-03-16-executive-maimai-jobhop-design.md`

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `src/types/executive.ts` | ExecutiveState, ExecutiveStage, ExecutiveAction, Phase2Path, constants |
| `src/types/maimai.ts` | MaimaiPost, MaimaiComment, ViralLevel |
| `src/types/job-offer.ts` | JobOffer, PastJob |
| `src/engine/executive-actions.ts` | processExecutiveAction(), EXECUTIVE_ACTION_STAMINA_COST |
| `src/engine/executive-quarter.ts` | settleExecutiveQuarter(), stock price calculation |
| `src/engine/executive-promotion.ts` | checkExecutivePromotion(), executive failure checks |
| `src/engine/job-hop.ts` | calculateOfferSalary(), validateOffer(), executeJobHop(), JOB_LEVEL_ORDER |
| `src/engine/maimai.ts` | createMaimaiPost(), addPlayerLike(), addPlayerComment(), canPostMaimai() |
| `src/engine/offer-generation.ts` | rollOfferChance(), generateOfferRequest() |
| `src/components/game/phone/MaimaiPostCard.tsx` | Single post card with like/comment |
| `src/components/game/phone/MaimaiCompose.tsx` | Post composition textarea |
| `src/components/game/phone/MaimaiCommentInput.tsx` | Comment input for a post |
| `src/components/game/ExecutiveStats.tsx` | Executive attributes dashboard |
| `src/components/game/ExecutiveActions.tsx` | Executive action planning UI |
| `src/components/game/Phase2Choice.tsx` | Startup vs Executive choice modal |
| `src/components/game/JobOfferCard.tsx` | Job offer display with accept/negotiate/ignore |
| `tests/engine/executive-actions.test.ts` | Tests for executive action processing |
| `tests/engine/executive-quarter.test.ts` | Tests for executive quarter settlement |
| `tests/engine/executive-promotion.test.ts` | Tests for executive promotion/failure |
| `tests/engine/job-hop.test.ts` | Tests for job hop logic |
| `tests/engine/maimai.test.ts` | Tests for MaiMai post management |
| `tests/engine/offer-generation.test.ts` | Tests for offer generation |
| `tests/save/migration-v1.1.test.ts` | Tests for v1.0→v1.1 migration |

### Modified Files

| File | Changes |
|------|---------|
| `src/types/game.ts` | Add fields to GameState, NPC; add new CriticalPeriodTypes |
| `src/types/agents.ts` | Add MaimaiResults to EventAgentOutput; add maimaiActivity to AgentInput |
| `src/ai/schemas.ts` | Add Zod schemas for all new types; update GameStateSchema, EventAgentOutputSchema |
| `src/ai/agents/event.ts` | MaiMai consequence processing; offer detail generation in prompt |
| `src/ai/agents/npc.ts` | Company transition awareness; inactive NPC context |
| `src/ai/agents/narrative.ts` | Executive path narrative prompts; MaiMai references |
| `src/ai/orchestration/quarterly.ts` | Executive quarterly branch; MaiMai result processing |
| `src/ai/orchestration/critical.ts` | Executive critical period support |
| `src/ai/orchestration/conflict.ts` | Validate executive-related agent outputs |
| `src/engine/phase-transition.ts` | Accept path param; create ExecutiveState or CompanyState |
| `src/engine/time.ts` | Add executive critical periods to config; executive stamina rule |
| `src/engine/quarter.ts` | Dispatch to executive settlement when phase2Path=executive |
| `src/engine/actions.ts` | Add offer generation hook to job_interview |
| `src/engine/state.ts` | Add new fields to createNewGame() |
| `src/store/gameStore.ts` | MaiMai actions, job offer actions, executive actions |
| `src/app/api/game/resign/route.ts` | Accept path choice (startup/executive) |
| `src/app/api/game/turn/route.ts` | Handle executive plan submission |
| `src/save/migration.ts` | v1.0→v1.1 migration function |
| `src/save/storage.ts` | Bump CURRENT_VERSION to "1.1" |
| `src/components/game/phone/MaimaiApp.tsx` | Full rewrite: feed UI with posts/likes/comments |
| `src/components/game/phone/HrzhipinApp.tsx` | Show job offers with accept/negotiate/ignore |
| `src/components/game/CompanyStats.tsx` | Conditional: show CompanyStats or ExecutiveStats |
| `src/components/game/QuarterlyActions.tsx` | Conditional: show Phase1/Phase2/Executive actions |
| `src/components/game/DashboardPanel.tsx` | Add executive stats tab |

---

## Chunk 1: Types & Data Foundation

### Task 1: Executive Types

**Files:**
- Create: `src/types/executive.ts`
- Test: `tests/engine/executive-actions.test.ts` (partial — type import test)

- [ ] **Step 1: Write the executive types file**

```typescript
// src/types/executive.ts
import type { PlayerAttributes } from "./game";

export type ExecutiveStage = "E1" | "E2" | "E3";

export type ExecutiveAction =
  | "push_business"
  | "manage_board"
  | "build_team"
  | "political_maneuvering"
  | "strategic_planning"
  | "industry_networking"
  | "rest";

export type Phase2Path = "startup" | "executive";

export interface ExecutiveState {
  stage: ExecutiveStage;
  departmentPerformance: number;
  boardSupport: number;
  teamLoyalty: number;
  politicalCapital: number;
  stockPrice: number;
  departmentCount: number;
  consecutiveLowPerformance: number;
  vestedShares: number;
  onTargetQuarters: number; // quarters where departmentPerformance >= 50
}

export const EXECUTIVE_ACTION_STAMINA_COST: Record<ExecutiveAction, number> = {
  push_business: 2,
  manage_board: 2,
  build_team: 2,
  political_maneuvering: 3,
  strategic_planning: 3,
  industry_networking: 2,
  rest: 1,
};

export const EXECUTIVE_SALARY: Record<ExecutiveStage, number> = {
  E1: 450000,
  E2: 750000,
  E3: 1250000,
};

export interface ExecutiveActionAllocation {
  action: ExecutiveAction;
}

export interface ExecutiveQuarterPlan {
  actions: ExecutiveActionAllocation[];
}
```

- [ ] **Step 2: Verify file compiles**

Run: `npx tsc --noEmit src/types/executive.ts`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/types/executive.ts
git commit -m "feat: add executive type definitions"
```

### Task 2: MaiMai Types

**Files:**
- Create: `src/types/maimai.ts`

- [ ] **Step 1: Write the MaiMai types file**

```typescript
// src/types/maimai.ts
export type ViralLevel = "ignored" | "small_buzz" | "trending" | "viral";

export interface MaimaiComment {
  id: string;
  author: "player" | "anonymous";
  content: string;
  authorName: string;
}

export interface MaimaiPost {
  id: string;
  quarter: number;
  author: "player" | "anonymous";
  content: string;
  likes: number;
  playerLiked: boolean;
  comments: MaimaiComment[];
  viralLevel?: ViralLevel;
  identityExposed?: boolean;
}
```

- [ ] **Step 2: Verify file compiles**

Run: `npx tsc --noEmit src/types/maimai.ts`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/types/maimai.ts
git commit -m "feat: add MaiMai type definitions"
```

### Task 3: Job Offer Types

**Files:**
- Create: `src/types/job-offer.ts`

- [ ] **Step 1: Write the job offer types file**

```typescript
// src/types/job-offer.ts
import type { JobLevel } from "./game";

export interface JobOffer {
  id: string;
  companyName: string;
  companyProfile: string;
  offeredLevel: JobLevel;
  offeredSalary: number;
  companyStatus: "expanding" | "stable" | "shrinking";
  expiresAtQuarter: number;
  negotiated: boolean;
}

export interface PastJob {
  companyName: string;
  level: JobLevel;
  salary: number;
  startQuarter: number;
  endQuarter: number;
  reasonLeft: "job_hop" | "startup" | "fired" | "promoted_executive";
}
```

- [ ] **Step 2: Verify file compiles**

Run: `npx tsc --noEmit src/types/job-offer.ts`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/types/job-offer.ts
git commit -m "feat: add job offer type definitions"
```

### Task 4: Extend GameState and NPC

**Files:**
- Modify: `src/types/game.ts`

- [ ] **Step 1: Add imports for new types**

At the top of `src/types/game.ts`, add imports:

```typescript
import type { CompanyState } from "./company";
import type { ExecutiveState, Phase2Path } from "./executive";
import type { JobOffer, PastJob } from "./job-offer";
import type { MaimaiPost } from "./maimai";
```

- [ ] **Step 2: Add `companyName` to NPC interface**

In the `NPC` interface (line 69-78), add after `currentStatus`:

```typescript
  companyName: string;
```

- [ ] **Step 3: Add new CriticalPeriodType variants**

Replace the `CriticalPeriodType` union (lines 128-136) with:

```typescript
export type CriticalPeriodType =
  | "onboarding"
  | "promotion_review"
  | "company_crisis"
  | "project_sprint"
  | "job_negotiation"
  | "startup_launch"
  | "fundraising"
  | "ipo_review"
  | "new_company_onboarding"
  | "executive_onboarding"
  | "board_review"
  | "power_struggle"
  | "major_decision"
  | "power_transition";
```

- [ ] **Step 4: Add new fields to GameState**

In the `GameState` interface (lines 164-182), add after `founderSalary`:

```typescript
  phase2Path: Phase2Path | null;
  executive: ExecutiveState | null;
  maimaiPosts: MaimaiPost[];
  maimaiPostsThisQuarter: number;
  jobOffers: JobOffer[];
  jobHistory: PastJob[];
```

- [ ] **Step 5: Update createNewGame in state.ts**

In `src/engine/state.ts`, add `companyName` to each NPC and new fields to initial state:

```typescript
// Each NPC gets: companyName: "星辰互联",
// GameState gets:
  phase2Path: null,
  executive: null,
  maimaiPosts: [],
  maimaiPostsThisQuarter: 0,
  jobOffers: [],
  jobHistory: [],
```

- [ ] **Step 6: Run existing tests to check nothing broke**

Run: `npx vitest run tests/engine/`
Expected: All existing tests pass (some may need NPC companyName fix)

- [ ] **Step 7: Fix any test fixtures that need NPC companyName**

Any test creating NPC objects will need `companyName: "星辰互联"` added. Search for NPC fixtures across all test files and update.

- [ ] **Step 8: Commit**

```bash
git add src/types/game.ts src/engine/state.ts
git add -u tests/  # updated test fixtures
git commit -m "feat: extend GameState with executive, maimai, job-hop fields"
```

### Task 5: Update Zod Schemas

**Files:**
- Modify: `src/ai/schemas.ts`

- [ ] **Step 1: Add new CriticalPeriodType values to schema**

Update `CriticalPeriodTypeSchema` (line 29-38) to include all new types:

```typescript
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
```

- [ ] **Step 2: Add NPC companyName to NPCSchema**

In `NPCSchema` (line 77-86), add:

```typescript
  companyName: z.string(),
```

- [ ] **Step 3: Add new schemas for executive, maimai, job-offer**

After the existing schemas, add:

```typescript
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
```

- [ ] **Step 4: Update GameStateSchema with new fields**

After `founderSalary` in `GameStateSchema` (line 251), add:

```typescript
  phase2Path: z.enum(["startup", "executive"]).nullable(),
  executive: ExecutiveStateSchema.nullable(),
  maimaiPosts: z.array(MaimaiPostSchema),
  maimaiPostsThisQuarter: z.number(),
  jobOffers: z.array(JobOfferSchema),
  jobHistory: z.array(PastJobSchema),
```

- [ ] **Step 5: Add MaiMai results to EventAgentOutputSchema**

Extend `EventAgentOutputSchema` (line 156-165) to add optional `maimaiResults`:

```typescript
export const EventAgentOutputSchema = z.object({
  events: z.array(GameEventSchema),
  phoneMessages: z.array(
    z.object({
      app: PhoneAppSchema,
      content: z.string(),
      sender: z.string().optional(),
    }),
  ),
  maimaiResults: z.object({
    postResults: z.array(z.object({
      postId: z.string(),
      aiAnalysis: z.string(),
      viralLevel: z.enum(["ignored", "small_buzz", "trending", "viral"]),
      consequences: z.object({
        playerEffects: PartialAttributesSchema,
        npcReactions: z.array(z.object({
          npcName: z.string(),
          favorChange: z.number(),
        })).optional(),
        identityExposed: z.boolean(),
        exposedTo: z.array(z.string()),
      }),
      generatedReplies: z.array(z.object({
        sender: z.string(),
        content: z.string(),
      })),
    })),
    interactionResults: z.array(z.object({
      targetPostId: z.string(),
      type: z.enum(["like", "comment"]),
      consequences: z.object({
        playerEffects: PartialAttributesSchema,
        npcReactions: z.array(z.object({
          npcName: z.string(),
          favorChange: z.number(),
        })).optional(),
      }),
    })),
  }).optional(),
});
```

- [ ] **Step 6: Add new critical period categories**

Update `CRITICAL_PERIOD_CATEGORIES` (line 259-268) to add:

```typescript
  new_company_onboarding: ["适应", "社交", "表现"],
  executive_onboarding: ["接管", "部署", "表态"],
  board_review: ["汇报", "拉票", "甩锅"],
  power_struggle: ["结盟", "反击", "妥协"],
  major_decision: ["分析", "推动", "风控"],
  power_transition: ["布局", "造势", "谈判"],
```

- [ ] **Step 7: Run schema tests**

Run: `npx vitest run tests/ai/schemas.test.ts`
Expected: PASS (may need fixture updates for new required fields)

- [ ] **Step 8: Fix any schema test fixtures**

Tests using `AgentInputSchema.parse()` will need the new GameState fields in their fixtures.

- [ ] **Step 9: Commit**

```bash
git add src/ai/schemas.ts
git add -u tests/
git commit -m "feat: update Zod schemas for executive, maimai, job-hop"
```

### Task 6: Update time.ts for new critical periods

**Files:**
- Modify: `src/engine/time.ts`
- Test: `tests/engine/time.test.ts`

- [ ] **Step 1: Write failing test for new critical period configs**

Add to `tests/engine/time.test.ts`:

```typescript
describe("executive critical periods", () => {
  it("has config for all new critical period types", () => {
    expect(CRITICAL_PERIOD_CONFIG.executive_onboarding).toEqual({ maxDays: 3 });
    expect(CRITICAL_PERIOD_CONFIG.board_review).toEqual({ maxDays: 3 });
    expect(CRITICAL_PERIOD_CONFIG.power_struggle).toEqual({ maxDays: 5 });
    expect(CRITICAL_PERIOD_CONFIG.major_decision).toEqual({ maxDays: 5 });
    expect(CRITICAL_PERIOD_CONFIG.power_transition).toEqual({ maxDays: 7 });
    expect(CRITICAL_PERIOD_CONFIG.new_company_onboarding).toEqual({ maxDays: 3 });
  });

  it("returns stamina 10 for executives regardless of housing", () => {
    expect(getMaxStamina("quarterly", "slum", "executive")).toBe(10);
    expect(getMaxStamina("quarterly", "shared", "executive")).toBe(10);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/engine/time.test.ts`
Expected: FAIL

- [ ] **Step 3: Update CRITICAL_PERIOD_CONFIG and getMaxStamina**

In `src/engine/time.ts`, add to `CRITICAL_PERIOD_CONFIG`:

```typescript
  new_company_onboarding: { maxDays: 3 },
  executive_onboarding: { maxDays: 3 },
  board_review: { maxDays: 3 },
  power_struggle: { maxDays: 5 },
  major_decision: { maxDays: 5 },
  power_transition: { maxDays: 7 },
```

Update `getMaxStamina` signature and body:

```typescript
export function getMaxStamina(
  mode: TimeMode,
  housingType: HousingType,
  phase2Path?: Phase2Path | null,
): number {
  if (mode === "critical") {
    return 3;
  }
  if (phase2Path === "executive") {
    return 10;
  }
  return housingType === "slum" ? 9 : 10;
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/engine/time.test.ts`
Expected: PASS

- [ ] **Step 5: Fix callers of getMaxStamina**

Search for all usages of `getMaxStamina` across the codebase. Each call needs to pass `state.phase2Path` as 3rd argument. Key files:
- `src/engine/quarter.ts` (line 21, line 110)
- `src/engine/critical-day.ts`
- `src/ai/orchestration/quarterly.ts`

- [ ] **Step 6: Run all tests to verify no regressions**

Run: `npx vitest run`
Expected: All pass

- [ ] **Step 7: Commit**

```bash
git add src/engine/time.ts
git add -u  # all callers
git commit -m "feat: add executive critical periods and stamina rules"
```

### Task 7: Save Migration v1.0 → v1.1

**Files:**
- Modify: `src/save/migration.ts`
- Modify: `src/save/storage.ts`
- Create: `tests/save/migration-v1.1.test.ts`

- [ ] **Step 1: Write failing migration test**

```typescript
// tests/save/migration-v1.1.test.ts
import { describe, it, expect } from "vitest";
import { migrate } from "@/save/migration";

describe("v1.0 → v1.1 migration", () => {
  const v10State = {
    version: "1.0",
    phase: 1,
    company: null,
    founderSalary: null,
    job: { companyName: "星辰互联", level: "L1", salary: 3000, careerPath: "undecided", quartersAtLevel: 0, totalQuarters: 0 },
    npcs: [
      { id: "wang", name: "王建国", role: "领导", personality: "test", hiddenGoal: "test", favor: 50, isActive: true, currentStatus: "在岗" },
    ],
    // ... minimal other fields
  };

  it("adds all new fields with defaults", () => {
    const result = migrate(v10State, "1.1") as Record<string, unknown>;
    expect(result).not.toBeNull();
    expect(result.version).toBe("1.1");
    expect(result.phase2Path).toBeNull();
    expect(result.executive).toBeNull();
    expect(result.maimaiPosts).toEqual([]);
    expect(result.maimaiPostsThisQuarter).toBe(0);
    expect(result.jobOffers).toEqual([]);
    expect(result.jobHistory).toEqual([]);
  });

  it("adds companyName to all NPCs", () => {
    const result = migrate(v10State, "1.1") as Record<string, unknown>;
    const npcs = result.npcs as Array<Record<string, unknown>>;
    expect(npcs[0].companyName).toBe("星辰互联");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/save/migration-v1.1.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement migration**

In `src/save/migration.ts`:

```typescript
const MIGRATIONS: Record<string, MigrationFn> = {
  "1.0→1.1": (data) => {
    const job = data.job as Record<string, unknown>;
    const companyName = (job?.companyName as string) ?? "星辰互联";
    const npcs = (data.npcs as Array<Record<string, unknown>>).map((npc) => ({
      ...npc,
      companyName: (npc as Record<string, unknown>).companyName ?? companyName,
    }));
    return {
      ...data,
      version: "1.1",
      phase2Path: null,
      executive: null,
      maimaiPosts: [],
      maimaiPostsThisQuarter: 0,
      jobOffers: [],
      jobHistory: [],
      npcs,
    };
  },
};

const VERSION_CHAIN = ["1.0", "1.1"];
```

- [ ] **Step 4: Update storage.ts version and add expired offer cleanup**

In `src/save/storage.ts`, update CURRENT_VERSION from `"1.0"` to `"1.1"`. Also update `src/engine/state.ts` `createNewGame()` version to `"1.1"`.

In `loadGame()` in `src/save/storage.ts`, after migration, add expired offer cleanup:

```typescript
// After migration and parse:
if (state.jobOffers) {
  state.jobOffers = state.jobOffers.filter(
    (o: JobOffer) => o.expiresAtQuarter >= state.currentQuarter
  );
}
```

- [ ] **Step 5: Run migration tests**

Run: `npx vitest run tests/save/`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/save/migration.ts src/save/storage.ts src/engine/state.ts tests/save/migration-v1.1.test.ts
git commit -m "feat: add v1.0→v1.1 save migration"
```

---

## Chunk 2: Engine — Job Hopping

### Task 8: Job Level Ordering and Offer Salary Calculation

**Files:**
- Create: `src/engine/job-hop.ts`
- Create: `tests/engine/job-hop.test.ts`

- [ ] **Step 1: Write failing tests for salary calculation and level ordering**

```typescript
// tests/engine/job-hop.test.ts
import { describe, it, expect } from "vitest";
import {
  JOB_LEVEL_ORDER,
  calculateOfferSalary,
  isLevelDowngrade,
  validateOffer,
} from "@/engine/job-hop";

describe("JOB_LEVEL_ORDER", () => {
  it("orders levels correctly", () => {
    expect(JOB_LEVEL_ORDER.L1).toBeLessThan(JOB_LEVEL_ORDER.L2);
    expect(JOB_LEVEL_ORDER.L5).toBeLessThan(JOB_LEVEL_ORDER.L6_tech);
    expect(JOB_LEVEL_ORDER.L6_tech).toBe(JOB_LEVEL_ORDER.L6_mgmt);
    expect(JOB_LEVEL_ORDER.L7_tech).toBe(JOB_LEVEL_ORDER.L7_mgmt);
    expect(JOB_LEVEL_ORDER.L7_tech).toBeLessThan(JOB_LEVEL_ORDER.L8);
  });
});

describe("calculateOfferSalary", () => {
  it("applies 15% base premium", () => {
    const result = calculateOfferSalary(10000, 0, 0);
    expect(result).toBe(11500);
  });

  it("adds reputation bonus", () => {
    const result = calculateOfferSalary(10000, 80, 0);
    expect(result).toBe(13900); // 10000 * (1.15 + 80*0.003)
  });

  it("adds professional bonus", () => {
    const result = calculateOfferSalary(10000, 0, 80);
    expect(result).toBe(13100); // 10000 * (1.15 + 80*0.002)
  });

  it("caps at 50% premium", () => {
    const result = calculateOfferSalary(10000, 100, 100);
    expect(result).toBe(15000); // capped at 10000 * 1.5
  });
});

describe("isLevelDowngrade", () => {
  it("returns true for downgrade", () => {
    expect(isLevelDowngrade("L3", "L2")).toBe(true);
  });
  it("returns false for same level", () => {
    expect(isLevelDowngrade("L3", "L3")).toBe(false);
  });
  it("returns false for upgrade", () => {
    expect(isLevelDowngrade("L3", "L4")).toBe(false);
  });
  it("handles tech/mgmt equivalence", () => {
    expect(isLevelDowngrade("L6_tech", "L6_mgmt")).toBe(false);
  });
});

describe("validateOffer", () => {
  it("rejects downgrade offers", () => {
    const offer = { offeredLevel: "L2" as const, offeredSalary: 5000 };
    expect(validateOffer(offer, "L3", 3000, 0, 0).valid).toBe(false);
  });
  it("rejects offers exceeding salary cap", () => {
    const offer = { offeredLevel: "L3" as const, offeredSalary: 99999 };
    expect(validateOffer(offer, "L3", 3000, 0, 0).valid).toBe(false);
  });
  it("accepts valid offers", () => {
    const offer = { offeredLevel: "L3" as const, offeredSalary: 4000 };
    expect(validateOffer(offer, "L3", 3000, 0, 0).valid).toBe(true);
  });
});

describe("executeJobHop", () => {
  // Helper to create a test state
  function createTestState(): GameState {
    const state = createNewGame();
    state.job.level = "L3";
    state.job.salary = 15000;
    state.job.companyName = "星辰互联";
    state.projectProgress.currentProgress = 0;
    return state;
  }

  const testOffer: JobOffer = {
    id: "offer1", companyName: "新公司", companyProfile: "test",
    offeredLevel: "L3", offeredSalary: 18000,
    companyStatus: "stable", expiresAtQuarter: 10, negotiated: false,
  };

  it("deactivates all old NPCs and creates new ones", () => {
    const state = createTestState();
    const result = executeJobHop(state, testOffer);
    const oldNpcs = result.npcs.filter(n => n.companyName === "星辰互联");
    const newNpcs = result.npcs.filter(n => n.companyName === "新公司");
    expect(oldNpcs.every(n => !n.isActive)).toBe(true);
    expect(newNpcs.length).toBe(5);
    expect(newNpcs.every(n => n.isActive)).toBe(true);
  });

  it("updates job state to new company", () => {
    const state = createTestState();
    const result = executeJobHop(state, testOffer);
    expect(result.job.companyName).toBe("新公司");
    expect(result.job.salary).toBe(18000);
    expect(result.job.quartersAtLevel).toBe(0);
    expect(result.job.totalQuarters).toBe(state.job.totalQuarters); // not reset
  });

  it("adds past job to history", () => {
    const state = createTestState();
    const result = executeJobHop(state, testOffer);
    expect(result.jobHistory).toHaveLength(1);
    expect(result.jobHistory[0].companyName).toBe("星辰互联");
    expect(result.jobHistory[0].reasonLeft).toBe("job_hop");
  });

  it("penalizes reputation when leaving with active project", () => {
    const state = createTestState();
    state.projectProgress.currentProgress = 2;
    const result = executeJobHop(state, testOffer);
    expect(result.player.reputation).toBeLessThan(state.player.reputation);
  });

  it("enters new_company_onboarding critical period", () => {
    const state = createTestState();
    const result = executeJobHop(state, testOffer);
    expect(result.timeMode).toBe("critical");
    expect(result.criticalPeriod?.type).toBe("new_company_onboarding");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/engine/job-hop.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement job-hop.ts**

```typescript
// src/engine/job-hop.ts
import type { JobLevel, GameState, NPC } from "@/types/game";
import type { JobOffer, PastJob } from "@/types/job-offer";

export const JOB_LEVEL_ORDER: Record<JobLevel, number> = {
  L1: 1, L2: 2, L3: 3, L4: 4, L5: 5,
  L6_tech: 6, L6_mgmt: 6,
  L7_tech: 7, L7_mgmt: 7,
  L8: 8,
};

export function calculateOfferSalary(
  currentSalary: number,
  reputation: number,
  professional: number,
): number {
  const basePremium = 1.15;
  const repBonus = reputation * 0.003;
  const proBonus = professional * 0.002;
  const totalMultiplier = Math.min(basePremium + repBonus + proBonus, 1.5);
  return Math.round(currentSalary * totalMultiplier);
}

export function isLevelDowngrade(current: JobLevel, offered: JobLevel): boolean {
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
    return { valid: false, reason: "Level downgrade not allowed" };
  }
  const maxSalary = calculateOfferSalary(currentSalary, reputation, professional);
  if (offer.offeredSalary > maxSalary) {
    return { valid: false, reason: "Salary exceeds cap" };
  }
  return { valid: true };
}

export function executeJobHop(state: GameState, offer: JobOffer): GameState {
  // Calculate the actual start quarter of the current job
  const jobStartQuarter = state.jobHistory.length > 0
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

  // Deactivate old NPCs
  newState.npcs = newState.npcs.map((npc) =>
    npc.isActive ? { ...npc, isActive: false } : npc
  );

  // Prune: keep only last 3 companies' inactive NPCs
  const companyNames = [...new Set(newState.npcs.filter(n => !n.isActive).map(n => n.companyName))];
  if (companyNames.length > 3) {
    const keepCompanies = new Set(companyNames.slice(-3));
    newState.npcs = newState.npcs.filter(
      (n) => n.isActive || keepCompanies.has(n.companyName)
    );
  }

  // Update job state
  newState.job = {
    ...newState.job,
    companyName: offer.companyName,
    level: offer.offeredLevel,
    salary: offer.offeredSalary,
    quartersAtLevel: 0,
    // totalQuarters continues incrementing (not reset)
  };

  // Add to history
  newState.jobHistory = [...newState.jobHistory, pastJob];

  // Remove accepted offer, clear expired
  newState.jobOffers = newState.jobOffers.filter(
    (o) => o.id !== offer.id && o.expiresAtQuarter >= newState.currentQuarter
  );

  // Reputation penalty for leaving mid-project
  if (newState.projectProgress.currentProgress > 0) {
    newState.player = {
      ...newState.player,
      reputation: Math.max(0, newState.player.reputation - 10),
    };
  }

  // Former leader favor reset
  const formerLeader = state.npcs.find(
    (n) => n.role === "直属领导" && n.isActive
  );
  if (formerLeader) {
    const leaderInNew = newState.npcs.find((n) => n.id === formerLeader.id);
    if (leaderInNew) {
      leaderInNew.favor = 0;
    }
  }

  // Enter new company onboarding
  newState.timeMode = "critical";
  newState.criticalPeriod = {
    type: "new_company_onboarding",
    currentDay: 1,
    maxDays: 3,
    staminaPerDay: 3,
  };
  newState.staminaRemaining = 3;

  // Generate placeholder NPCs for new company (AI will flesh them out during onboarding)
  newState.npcs = [
    ...newState.npcs, // keep inactive old NPCs
    ...createPlaceholderNPCs(offer.companyName),
  ];

  // Update world for new company
  newState.world = {
    ...newState.world,
    companyStatus: offer.companyStatus,
  };

  return newState;
}

function createPlaceholderNPCs(companyName: string): NPC[] {
  return [
    { id: `new_leader_${Date.now()}`, name: "新领导", role: "直属领导", personality: "待观察", hiddenGoal: "未知", favor: 50, isActive: true, currentStatus: "在岗", companyName },
    { id: `new_peer1_${Date.now()}`, name: "新同事A", role: "同组同事", personality: "待观察", hiddenGoal: "未知", favor: 50, isActive: true, currentStatus: "在岗", companyName },
    { id: `new_peer2_${Date.now()}`, name: "新同事B", role: "跨组同事", personality: "待观察", hiddenGoal: "未知", favor: 50, isActive: true, currentStatus: "在岗", companyName },
    { id: `new_exec_${Date.now()}`, name: "部门高管", role: "部门总监", personality: "待观察", hiddenGoal: "未知", favor: 45, isActive: true, currentStatus: "在岗", companyName },
    { id: `new_admin_${Date.now()}`, name: "行政小姐", role: "行政", personality: "待观察", hiddenGoal: "未知", favor: 55, isActive: true, currentStatus: "在岗", companyName },
  ];
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/engine/job-hop.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine/job-hop.ts tests/engine/job-hop.test.ts
git commit -m "feat: add job-hop engine logic with salary calc and validation"
```

### Task 9: Offer Generation Engine Hook

**Files:**
- Create: `src/engine/offer-generation.ts`
- Create: `tests/engine/offer-generation.test.ts`
- Modify: `src/engine/actions.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/engine/offer-generation.test.ts
import { describe, it, expect } from "vitest";
import { rollOfferChance } from "@/engine/offer-generation";

describe("rollOfferChance", () => {
  it("returns true when random < 0.6", () => {
    expect(rollOfferChance(() => 0.3)).toBe(true);
  });
  it("returns false when random >= 0.6", () => {
    expect(rollOfferChance(() => 0.7)).toBe(false);
  });
  it("returns true at exactly 0.59", () => {
    expect(rollOfferChance(() => 0.59)).toBe(true);
  });
  it("returns false at exactly 0.6", () => {
    expect(rollOfferChance(() => 0.6)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/engine/offer-generation.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement offer-generation.ts**

```typescript
// src/engine/offer-generation.ts
const OFFER_PROBABILITY = 0.6;

export function rollOfferChance(randomFn: () => number = Math.random): boolean {
  return randomFn() < OFFER_PROBABILITY;
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/engine/offer-generation.test.ts`
Expected: PASS

- [ ] **Step 5: Update processAction for job_interview**

In `src/engine/actions.ts`, update the `job_interview` case to return a new field `triggerOfferGeneration: boolean`:

```typescript
// In ActionResult interface, add:
  triggerOfferGeneration?: boolean;

// In processAction, job_interview case:
  case "job_interview":
    return {
      statChanges: { network: 2 },
      projectProgress: 0,
      workActionCount: 0,
      triggerOfferGeneration: rollOfferChance(randomFn),
    };
```

- [ ] **Step 6: Run all action tests**

Run: `npx vitest run tests/engine/actions.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/engine/offer-generation.ts tests/engine/offer-generation.test.ts src/engine/actions.ts
git commit -m "feat: add offer generation hook to job_interview action"
```

---

## Chunk 3: Engine — MaiMai

### Task 10: MaiMai Post Management

**Files:**
- Create: `src/engine/maimai.ts`
- Create: `tests/engine/maimai.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/engine/maimai.test.ts
import { describe, it, expect } from "vitest";
import {
  canPostMaimai,
  createPlayerPost,
  addPlayerLike,
  addPlayerComment,
} from "@/engine/maimai";
import type { MaimaiPost } from "@/types/maimai";
import type { TimeMode, CriticalPeriodType } from "@/types/game";

describe("canPostMaimai", () => {
  it("allows posting when count < 2 and not in critical period", () => {
    expect(canPostMaimai(0, "quarterly", null)).toBe(true);
    expect(canPostMaimai(1, "quarterly", null)).toBe(true);
  });
  it("blocks posting when count >= 2", () => {
    expect(canPostMaimai(2, "quarterly", null)).toBe(false);
  });
  it("blocks posting during critical periods", () => {
    expect(canPostMaimai(0, "critical", "project_sprint")).toBe(false);
  });
  it("allows posting during non-combat executive critical periods", () => {
    expect(canPostMaimai(0, "critical", "board_review")).toBe(true);
  });
  it("blocks posting during combat executive critical periods", () => {
    expect(canPostMaimai(0, "critical", "power_struggle")).toBe(false);
  });
});

describe("createPlayerPost", () => {
  it("creates a post with player author", () => {
    const post = createPlayerPost("test content", 3);
    expect(post.author).toBe("player");
    expect(post.content).toBe("test content");
    expect(post.quarter).toBe(3);
    expect(post.likes).toBe(0);
    expect(post.playerLiked).toBe(false);
    expect(post.comments).toEqual([]);
    expect(post.id).toBeTruthy();
  });
});

describe("addPlayerLike", () => {
  it("sets playerLiked to true", () => {
    const post: MaimaiPost = {
      id: "1", quarter: 1, author: "anonymous", content: "test",
      likes: 5, playerLiked: false, comments: [],
    };
    const result = addPlayerLike(post);
    expect(result.playerLiked).toBe(true);
    expect(result.likes).toBe(6);
  });
  it("does not double-like", () => {
    const post: MaimaiPost = {
      id: "1", quarter: 1, author: "anonymous", content: "test",
      likes: 5, playerLiked: true, comments: [],
    };
    const result = addPlayerLike(post);
    expect(result.likes).toBe(5);
  });
});

describe("addPlayerComment", () => {
  it("adds a player comment", () => {
    const post: MaimaiPost = {
      id: "1", quarter: 1, author: "anonymous", content: "test",
      likes: 0, playerLiked: false, comments: [],
    };
    const result = addPlayerComment(post, "my comment");
    expect(result.comments).toHaveLength(1);
    expect(result.comments[0].author).toBe("player");
    expect(result.comments[0].content).toBe("my comment");
    expect(result.comments[0].authorName).toBe("我（匿名）");
  });
  it("rejects second player comment on same post", () => {
    const post: MaimaiPost = {
      id: "1", quarter: 1, author: "anonymous", content: "test",
      likes: 0, playerLiked: false,
      comments: [{ id: "c1", author: "player", content: "first", authorName: "我（匿名）" }],
    };
    const result = addPlayerComment(post, "second");
    expect(result.comments).toHaveLength(1); // unchanged
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/engine/maimai.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement maimai.ts**

```typescript
// src/engine/maimai.ts
import type { MaimaiPost } from "@/types/maimai";
import type { TimeMode, CriticalPeriodType } from "@/types/game";

const MAX_POSTS_PER_QUARTER = 2;

// Non-combat executive critical periods where posting is allowed
const POSTING_ALLOWED_CRITICAL_TYPES: CriticalPeriodType[] = ["board_review"];

export function canPostMaimai(
  postsThisQuarter: number,
  timeMode: TimeMode,
  criticalType: CriticalPeriodType | null,
): boolean {
  if (postsThisQuarter >= MAX_POSTS_PER_QUARTER) return false;
  if (timeMode === "critical") {
    return criticalType !== null && POSTING_ALLOWED_CRITICAL_TYPES.includes(criticalType);
  }
  return true;
}

export function createPlayerPost(content: string, quarter: number): MaimaiPost {
  return {
    id: `maimai_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    quarter,
    author: "player",
    content,
    likes: 0,
    playerLiked: false,
    comments: [],
  };
}

export function addPlayerLike(post: MaimaiPost): MaimaiPost {
  if (post.playerLiked) return post;
  return { ...post, playerLiked: true, likes: post.likes + 1 };
}

export function addPlayerComment(post: MaimaiPost, content: string): MaimaiPost {
  const hasPlayerComment = post.comments.some((c) => c.author === "player");
  if (hasPlayerComment) return post;
  return {
    ...post,
    comments: [
      ...post.comments,
      {
        id: `comment_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        author: "player",
        content,
        authorName: "我（匿名）",
      },
    ],
  };
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/engine/maimai.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine/maimai.ts tests/engine/maimai.test.ts
git commit -m "feat: add MaiMai post management engine logic"
```

---

## Chunk 4: Engine — Executive Path

### Task 11: Executive Action Processing

**Files:**
- Create: `src/engine/executive-actions.ts`
- Create: `tests/engine/executive-actions.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/engine/executive-actions.test.ts
import { describe, it, expect } from "vitest";
import { processExecutiveAction, validateExecutivePlan } from "@/engine/executive-actions";
import type { ExecutiveState } from "@/types/executive";
import type { PlayerAttributes } from "@/types/game";

const baseExec: ExecutiveState = {
  stage: "E1", departmentPerformance: 50, boardSupport: 40,
  teamLoyalty: 60, politicalCapital: 20, stockPrice: 100,
  departmentCount: 1, consecutiveLowPerformance: 0, vestedShares: 0,
};
const basePlayer: PlayerAttributes = {
  health: 80, professional: 60, communication: 50, management: 40,
  network: 30, mood: 60, money: 500000, reputation: 40,
};

describe("processExecutiveAction", () => {
  it("push_business increases departmentPerformance by 5", () => {
    const result = processExecutiveAction(baseExec, basePlayer, { action: "push_business" });
    expect(result.executiveChanges.departmentPerformance).toBe(5);
    expect(result.playerChanges.health).toBe(-1);
  });

  it("manage_board increases boardSupport by 8", () => {
    const result = processExecutiveAction(baseExec, basePlayer, { action: "manage_board" });
    expect(result.executiveChanges.boardSupport).toBe(8);
    expect(result.playerChanges.communication).toBe(1);
  });

  it("rest gives health+3 mood+8", () => {
    const result = processExecutiveAction(baseExec, basePlayer, { action: "rest" });
    expect(result.playerChanges.health).toBe(3);
    expect(result.playerChanges.mood).toBe(8);
  });
});

describe("validateExecutivePlan", () => {
  it("accepts plan within stamina budget", () => {
    const plan = { actions: [{ action: "push_business" as const }, { action: "rest" as const }] };
    expect(validateExecutivePlan(plan, 10).valid).toBe(true);
  });
  it("rejects plan exceeding stamina", () => {
    const plan = { actions: Array(6).fill({ action: "push_business" }) };
    expect(validateExecutivePlan(plan, 10).valid).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/engine/executive-actions.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement executive-actions.ts**

```typescript
// src/engine/executive-actions.ts
import type { PlayerAttributes } from "@/types/game";
import type {
  ExecutiveAction,
  ExecutiveActionAllocation,
  ExecutiveQuarterPlan,
  ExecutiveState,
  EXECUTIVE_ACTION_STAMINA_COST,
} from "@/types/executive";
import { EXECUTIVE_ACTION_STAMINA_COST as STAMINA_COST } from "@/types/executive";

export interface ExecutiveActionResult {
  executiveChanges: Partial<ExecutiveState>;
  playerChanges: Partial<PlayerAttributes>;
  triggerCritical?: string;
}

export function processExecutiveAction(
  _exec: ExecutiveState,
  _player: PlayerAttributes,
  allocation: ExecutiveActionAllocation,
  randomFn: () => number = Math.random,
): ExecutiveActionResult {
  switch (allocation.action) {
    case "push_business":
      return { executiveChanges: { departmentPerformance: 5 }, playerChanges: { health: -1 } };
    case "manage_board":
      return { executiveChanges: { boardSupport: 8 }, playerChanges: { communication: 1 } };
    case "build_team":
      return { executiveChanges: { teamLoyalty: 8 }, playerChanges: { management: 2 } };
    case "political_maneuvering": {
      const exposed = randomFn() < 0.2;
      return {
        executiveChanges: { politicalCapital: 10 },
        playerChanges: exposed ? { reputation: -5 } : {},
      };
    }
    case "strategic_planning":
      return { executiveChanges: {}, playerChanges: {}, triggerCritical: "major_decision" };
    case "industry_networking":
      return { executiveChanges: {}, playerChanges: { reputation: 5, network: 3, money: -2000 } };
    case "rest":
      return { executiveChanges: {}, playerChanges: { health: 3, mood: 8 } };
    default:
      return { executiveChanges: {}, playerChanges: {} };
  }
}

export function validateExecutivePlan(
  plan: ExecutiveQuarterPlan,
  maxStamina: number,
): { valid: boolean; error?: string } {
  const totalCost = plan.actions.reduce(
    (sum, a) => sum + STAMINA_COST[a.action],
    0,
  );
  if (totalCost > maxStamina) {
    return { valid: false, error: `Stamina ${totalCost} exceeds budget ${maxStamina}` };
  }
  return { valid: true };
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/engine/executive-actions.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine/executive-actions.ts tests/engine/executive-actions.test.ts
git commit -m "feat: add executive action processing engine"
```

### Task 12: Executive Quarter Settlement

**Files:**
- Create: `src/engine/executive-quarter.ts`
- Create: `tests/engine/executive-quarter.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/engine/executive-quarter.test.ts
import { describe, it, expect } from "vitest";
import { settleExecutiveQuarter, calculateStockPriceChange } from "@/engine/executive-quarter";
import { createNewGame } from "@/engine/state";

describe("calculateStockPriceChange", () => {
  it("applies base volatility and department performance coefficient", () => {
    // departmentPerformance=70 → coefficient = (70-50)*0.1% = +2%
    const change = calculateStockPriceChange(100, 70, "stable", () => 0.5);
    // base volatility at random 0.5 → 0% (midpoint of ±5%)
    // + 2% from performance + 0% from stable economy = 2%
    expect(change).toBeCloseTo(2, 0);
  });

  it("applies economy coefficient", () => {
    const boom = calculateStockPriceChange(100, 50, "boom", () => 0.5);
    const winter = calculateStockPriceChange(100, 50, "winter", () => 0.5);
    expect(boom).toBeGreaterThan(winter);
  });
});

describe("settleExecutiveQuarter", () => {
  it("processes actions and pays executive salary", () => {
    const state = createNewGame();
    // Manually set up executive state
    state.phase = 2;
    state.phase2Path = "executive";
    state.executive = {
      stage: "E1", departmentPerformance: 50, boardSupport: 40,
      teamLoyalty: 60, politicalCapital: 20, stockPrice: 100,
      departmentCount: 1, consecutiveLowPerformance: 0, vestedShares: 0,
    };
    const plan = { actions: [{ action: "push_business" as const }, { action: "rest" as const }] };
    const result = settleExecutiveQuarter(state, plan);
    // E1 salary = 450000 per quarter
    expect(result.state.player.money).toBeGreaterThan(state.player.money);
    expect(result.state.executive!.departmentPerformance).toBeGreaterThan(50);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/engine/executive-quarter.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement executive-quarter.ts**

```typescript
// src/engine/executive-quarter.ts
import {
  applyQuarterlyHealthDecay,
  applyQuarterlyHousingMood,
  applyStatChanges,
  clampAttribute,
  getEffectMultiplier,
} from "@/engine/attributes";
import { processExecutiveAction, validateExecutivePlan } from "@/engine/executive-actions";
import { applyQuarterlyEconomy, isBroke } from "@/engine/economy";
import { advanceQuarter, getMaxStamina } from "@/engine/time";
import type { ExecutiveQuarterPlan, ExecutiveState } from "@/types/executive";
import { EXECUTIVE_SALARY } from "@/types/executive";
import type { GameState } from "@/types/game";

export interface ExecutiveQuarterResult {
  state: GameState;
  triggerBoardReview: boolean;
  triggerCriticalType?: string;
}

export function calculateStockPriceChange(
  currentPrice: number,
  departmentPerformance: number,
  economyCycle: "boom" | "stable" | "winter",
  randomFn: () => number = Math.random,
): number {
  const baseVolatility = (randomFn() - 0.5) * 10; // ±5%
  const performanceCoefficient = (departmentPerformance - 50) * 0.1;
  const economyCoefficient = economyCycle === "boom" ? 3 : economyCycle === "winter" ? -3 : 0;
  const totalChangePercent = baseVolatility + performanceCoefficient + economyCoefficient;
  return currentPrice * (totalChangePercent / 100);
}

export function settleExecutiveQuarter(
  state: GameState,
  plan: ExecutiveQuarterPlan,
): ExecutiveQuarterResult {
  if (!state.executive) {
    throw new Error("Cannot settle executive quarter without executive state");
  }

  const maxStamina = getMaxStamina("quarterly", state.housing.type, state.phase2Path);
  const validation = validateExecutivePlan(plan, maxStamina);
  if (!validation.valid) {
    throw new Error(validation.error ?? "Invalid executive plan");
  }

  const newState: GameState = JSON.parse(JSON.stringify(state));
  const exec = newState.executive!;
  let triggerCriticalType: string | undefined;

  // Process each action
  const CLAMPED_EXEC_ATTRS = new Set([
    "departmentPerformance", "boardSupport", "teamLoyalty", "politicalCapital",
  ]);

  for (const allocation of plan.actions) {
    const result = processExecutiveAction(exec, newState.player, allocation);

    // Apply executive state changes (additive, only clamp 0-100 attributes)
    for (const [key, value] of Object.entries(result.executiveChanges)) {
      const k = key as keyof ExecutiveState;
      if (typeof exec[k] === "number" && typeof value === "number") {
        const raw = (exec[k] as number) + value;
        (exec as Record<string, number>)[k] = CLAMPED_EXEC_ATTRS.has(k)
          ? Math.max(0, Math.min(100, raw))
          : raw;
      }
    }

    // Apply player attribute changes
    if (Object.keys(result.playerChanges).length > 0) {
      newState.player = applyStatChanges(newState.player, result.playerChanges);
    }

    if (result.triggerCritical) {
      triggerCriticalType = result.triggerCritical;
    }
  }

  // Health decay and housing mood (same as phase 1)
  newState.player = applyQuarterlyHealthDecay(newState.player, newState.housing.type);
  newState.player = applyQuarterlyHousingMood(newState.player, newState.housing.type);

  // Personal expenses
  const personalExpenses = applyQuarterlyEconomy(0, newState.housing.type);
  newState.player = applyStatChanges(newState.player, { money: -personalExpenses.expenses.total });

  // Executive salary
  const quarterlySalary = EXECUTIVE_SALARY[exec.stage];
  newState.player = applyStatChanges(newState.player, { money: quarterlySalary });

  // Stock option vesting
  exec.vestedShares += 0.0025; // 0.25% per quarter
  const optionValue = Math.round(exec.stockPrice * exec.vestedShares * 10000);
  newState.player = applyStatChanges(newState.player, { money: optionValue });

  // Stock price change
  const priceChange = calculateStockPriceChange(
    exec.stockPrice,
    exec.departmentPerformance,
    newState.world.economyCycle,
  );
  exec.stockPrice = Math.max(1, Math.round((exec.stockPrice + priceChange) * 100) / 100);

  // Broke penalty
  if (isBroke(newState.player.money)) {
    newState.player = applyStatChanges(newState.player, { mood: -10 });
  }

  // Advance time
  newState.currentQuarter = advanceQuarter(newState.currentQuarter);
  newState.job.totalQuarters += 1;
  newState.job.quartersAtLevel += 1;

  // Reset MaiMai counter
  newState.maimaiPostsThisQuarter = 0;

  // Check failure: consecutive low performance
  if (exec.departmentPerformance < 30) {
    exec.consecutiveLowPerformance += 1;
  } else {
    exec.consecutiveLowPerformance = 0;
  }

  // Track on-target quarters for promotion
  if (exec.departmentPerformance >= 50) {
    exec.onTargetQuarters += 1;
  }

  // Board review trigger every 4 quarters
  const triggerBoardReview = newState.currentQuarter > 0 && newState.currentQuarter % 4 === 0;

  newState.staminaRemaining = maxStamina;

  return { state: newState, triggerBoardReview, triggerCriticalType };
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/engine/executive-quarter.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine/executive-quarter.ts tests/engine/executive-quarter.test.ts
git commit -m "feat: add executive quarter settlement engine"
```

### Task 13: Executive Promotion and Failure Checks

**Files:**
- Create: `src/engine/executive-promotion.ts`
- Create: `tests/engine/executive-promotion.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/engine/executive-promotion.test.ts
import { describe, it, expect } from "vitest";
import { checkExecutiveFailure, checkExecutivePromotion } from "@/engine/executive-promotion";
import type { ExecutiveState } from "@/types/executive";

const baseExec: ExecutiveState = {
  stage: "E1", departmentPerformance: 50, boardSupport: 40,
  teamLoyalty: 60, politicalCapital: 20, stockPrice: 100,
  departmentCount: 1, consecutiveLowPerformance: 0, vestedShares: 0,
};

describe("checkExecutiveFailure", () => {
  it("fires when boardSupport reaches 0", () => {
    const exec = { ...baseExec, boardSupport: 0 };
    const result = checkExecutiveFailure(exec);
    expect(result.failed).toBe(true);
    expect(result.reason).toContain("board");
  });

  it("demotes when 2 consecutive low performance quarters", () => {
    const exec = { ...baseExec, consecutiveLowPerformance: 2 };
    const result = checkExecutiveFailure(exec);
    expect(result.failed).toBe(true);
    expect(result.reason).toContain("performance");
  });

  it("does not fail in normal state", () => {
    expect(checkExecutiveFailure(baseExec).failed).toBe(false);
  });
});

describe("checkExecutivePromotion", () => {
  it("E1→E2 requires performance 3 quarters and boardSupport >= 50", () => {
    const exec = { ...baseExec, boardSupport: 55, departmentCount: 1 };
    // quartersAtLevel needs to be passed separately
    const result = checkExecutivePromotion(exec, 3);
    expect(result.eligible).toBe(true);
    expect(result.nextStage).toBe("E2");
  });

  it("E1→E2 not eligible if boardSupport < 50", () => {
    const result = checkExecutivePromotion(baseExec, 3);
    expect(result.eligible).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/engine/executive-promotion.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement executive-promotion.ts**

```typescript
// src/engine/executive-promotion.ts
import type { ExecutiveState, ExecutiveStage } from "@/types/executive";

export interface ExecutiveFailureResult {
  failed: boolean;
  reason?: string;
  type?: "fired" | "demoted";
}

export interface ExecutivePromotionResult {
  eligible: boolean;
  nextStage?: ExecutiveStage;
  failReasons: string[];
}

export function checkExecutiveFailure(exec: ExecutiveState): ExecutiveFailureResult {
  if (exec.boardSupport <= 0) {
    return { failed: true, reason: "Board support dropped to zero — forced resignation", type: "fired" };
  }
  if (exec.consecutiveLowPerformance >= 2) {
    return { failed: true, reason: "Consecutive low department performance — marginalized", type: "demoted" };
  }
  return { failed: false };
}

export function checkExecutivePromotion(
  exec: ExecutiveState,
  quartersAtLevel: number,
): ExecutivePromotionResult {
  const failReasons: string[] = [];

  switch (exec.stage) {
    case "E1": {
      if (exec.onTargetQuarters < 3) failReasons.push("Need 3 on-target quarters (departmentPerformance >= 50)");
      if (exec.boardSupport < 50) failReasons.push("Board support must be >= 50");
      return {
        eligible: failReasons.length === 0,
        nextStage: failReasons.length === 0 ? "E2" : undefined,
        failReasons,
      };
    }
    case "E2": {
      if (exec.departmentCount < 3) failReasons.push("Need to manage >= 3 departments");
      if (exec.boardSupport < 60) failReasons.push("Board support must be >= 60");
      // E2→E3 requires power_transition event trigger, not auto-promotion
      return {
        eligible: failReasons.length === 0,
        nextStage: failReasons.length === 0 ? "E3" : undefined,
        failReasons,
      };
    }
    case "E3":
      return { eligible: false, failReasons: ["Already at top executive level"] };
    default:
      return { eligible: false, failReasons: ["Unknown stage"] };
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/engine/executive-promotion.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine/executive-promotion.ts tests/engine/executive-promotion.test.ts
git commit -m "feat: add executive promotion and failure check engine"
```

### Task 14: Update Phase Transition for Executive Path

**Files:**
- Modify: `src/engine/phase-transition.ts`
- Modify: `tests/engine/phase-transition.test.ts`

- [ ] **Step 1: Write failing test for executive transition**

Add to `tests/engine/phase-transition.test.ts`:

```typescript
describe("transitionToPhase2 with executive path", () => {
  it("creates ExecutiveState and enters executive_onboarding", () => {
    const state = createNewGame();
    state.job.level = "L8";
    state.jobOffers = [{ id: "1", companyName: "test", companyProfile: "test", offeredLevel: "L8", offeredSalary: 100000, companyStatus: "stable", expiresAtQuarter: 5, negotiated: false }];
    const result = transitionToPhase2(state, "executive");
    expect(result.phase).toBe(2);
    expect(result.phase2Path).toBe("executive");
    expect(result.executive).not.toBeNull();
    expect(result.executive!.stage).toBe("E1");
    expect(result.company).toBeNull();
    expect(result.criticalPeriod!.type).toBe("executive_onboarding");
    expect(result.jobOffers).toEqual([]); // cleared
  });

  it("startup path still works", () => {
    const state = createNewGame();
    state.job.level = "L6_tech";
    const result = transitionToPhase2(state, "startup");
    expect(result.phase2Path).toBe("startup");
    expect(result.company).not.toBeNull();
    expect(result.executive).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/engine/phase-transition.test.ts`
Expected: FAIL — transitionToPhase2 doesn't accept 2nd parameter

- [ ] **Step 3: Update transitionToPhase2**

Rewrite `src/engine/phase-transition.ts`:

```typescript
import { clampAttribute } from "@/engine/attributes";
import type { CompanyState } from "@/types/company";
import type { ExecutiveState, Phase2Path } from "@/types/executive";
import type { GameState, JobLevel } from "@/types/game";

const STARTUP_ELIGIBLE_LEVELS: JobLevel[] = [
  "L6_tech", "L6_mgmt", "L7_tech", "L7_mgmt", "L8",
];

function createInitialCompany(): CompanyState {
  return {
    stage: "garage", productQuality: 30, teamSatisfaction: 70,
    customerCount: 0, brandAwareness: 0, employeeCount: 0,
    quarterlyRevenue: 0, quarterlyExpenses: 0, cashFlow: 0,
    valuation: 0, officeType: "home", founderEquity: 100,
    consecutiveNegativeCashFlow: 0, consecutiveProfitableQuarters: 0,
    hasSeriesAFunding: false, annualGrowthRate: 0,
  };
}

function createInitialExecutive(): ExecutiveState {
  return {
    stage: "E1", departmentPerformance: 50, boardSupport: 40,
    teamLoyalty: 60, politicalCapital: 20, stockPrice: 100,
    departmentCount: 1, consecutiveLowPerformance: 0, vestedShares: 0,
  };
}

export function canStartup(level: JobLevel): boolean {
  return STARTUP_ELIGIBLE_LEVELS.includes(level);
}

export function transitionToPhase2(
  state: GameState,
  path: Phase2Path = "startup",
): GameState {
  const isL8 = state.job.level === "L8";
  const moneyBonus = isL8 ? 500000 : 0;
  const networkBonus = isL8 ? 20 : 0;

  const base: GameState = {
    ...state,
    phase: 2,
    phase2Path: path,
    jobOffers: [], // clear all pending offers
    player: {
      ...state.player,
      money: state.player.money + moneyBonus,
      network: clampAttribute("network", state.player.network + networkBonus),
    },
  };

  if (path === "executive") {
    return {
      ...base,
      timeMode: "critical",
      criticalPeriod: {
        type: "executive_onboarding",
        currentDay: 1,
        maxDays: 3,
        staminaPerDay: 3,
      },
      staminaRemaining: 3,
      executive: createInitialExecutive(),
      company: null,
      founderSalary: null,
    };
  }

  // Startup path (existing behavior)
  return {
    ...base,
    timeMode: "critical",
    criticalPeriod: {
      type: "startup_launch",
      currentDay: 1,
      maxDays: 7,
      staminaPerDay: 3,
    },
    staminaRemaining: 3,
    company: createInitialCompany(),
    executive: null,
    founderSalary: 5000,
    job: { ...base.job, companyName: "我的公司" },
  };
}
```

- [ ] **Step 4: Fix existing tests that call transitionToPhase2 without 2nd arg**

Since default is `"startup"`, existing calls should still work. Verify.

- [ ] **Step 5: Run all phase-transition tests**

Run: `npx vitest run tests/engine/phase-transition.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/engine/phase-transition.ts tests/engine/phase-transition.test.ts
git commit -m "feat: update phase transition to support executive path"
```

---

## Chunk 5: AI Agents & Orchestration

### Task 15: Update Agent Types

**Files:**
- Modify: `src/types/agents.ts`

- [ ] **Step 1: Add MaiMai types to EventAgentOutput and maimaiActivity to AgentInput**

```typescript
// Add to imports:
import type { MaimaiPost, ViralLevel } from "../types/maimai";

// Add to AgentInput:
export interface AgentInput {
  state: GameState;
  recentHistory: QuarterSummary[];
  maimaiActivity?: {
    playerPosts: MaimaiPost[];
    playerLikes: string[];
    playerComments: Array<{ postId: string; content: string }>;
  };
}

// Add MaimaiResults type:
export interface MaimaiPostResult {
  postId: string;
  aiAnalysis: string;
  viralLevel: ViralLevel;
  consequences: {
    playerEffects?: Partial<PlayerAttributes>;
    npcReactions?: Array<{ npcName: string; favorChange: number }>;
    identityExposed: boolean;
    exposedTo: string[];
  };
  generatedReplies: Array<{ sender: string; content: string }>;
}

export interface MaimaiInteractionResult {
  targetPostId: string;
  type: "like" | "comment";
  consequences: {
    playerEffects?: Partial<PlayerAttributes>;
    npcReactions?: Array<{ npcName: string; favorChange: number }>;
  };
}

// Add to EventAgentOutput:
export interface EventAgentOutput {
  events: GameEvent[];
  phoneMessages: Array<{
    app: PhoneApp;
    content: string;
    sender?: string;
  }>;
  maimaiResults?: {
    postResults: MaimaiPostResult[];
    interactionResults: MaimaiInteractionResult[];
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/agents.ts
git commit -m "feat: extend agent types for MaiMai results"
```

### Task 16: Update Event Agent for MaiMai + Offers

**Files:**
- Modify: `src/ai/agents/event.ts`

- [ ] **Step 1: Update event agent system prompt**

Add to the system prompt string in `src/ai/agents/event.ts`:

```typescript
// Append to the existing system prompt:
const MAIMAI_INSTRUCTIONS = `
## 麦麦帖子后果分析

当输入中包含 maimaiActivity 时，你必须分析每条玩家帖子和互动：

对于每条玩家发的帖（playerPosts）：
1. 分析帖子内容的性质（吐槽/爆料/炫耀/求助/正能量）
2. 根据内容爆炸性、与当前游戏状态的相关性、时机，判断传播等级（ignored/small_buzz/trending/viral）
3. 决定后果：对玩家属性的影响、对NPC好感的影响、是否暴露身份
4. 生成1-5条匿名回复

身份暴露判断依据：
- 帖子是否涉及只有少数人知道的信息
- 玩家声望（高声望更容易被识别）
- 帖子是否与玩家近期行为高度关联

对于点赞和评论（playerLikes, playerComments）：
- 点赞=表态，可能影响相关NPC好感
- 评论内容也需分析后果
`;

const OFFER_INSTRUCTIONS = `
## Offer 生成

当输入中包含 offerRequested: true 时，生成一个 JobOffer：
- companyName: 生成一个有创意的中文互联网公司名
- companyProfile: 一句话描述（如"专注AI教育的独角兽"）
- companyStatus: 根据当前经济环境决定（boom时更多expanding，winter时更多shrinking）

将 Offer 放在 phoneMessages 中，app 为 "hrzhipin"。
`;
```

- [ ] **Step 2: Update user prompt builder to include MaiMai context**

In the user prompt construction function, add:

```typescript
// When maimaiActivity exists and has data:
if (input.maimaiActivity) {
  const { playerPosts, playerLikes, playerComments } = input.maimaiActivity;
  if (playerPosts.length > 0 || playerLikes.length > 0 || playerComments.length > 0) {
    userPrompt += `\n\n## 本季度麦麦活动\n`;
    if (playerPosts.length > 0) {
      userPrompt += `玩家发帖：\n${playerPosts.map(p => `- "${p.content}"`).join("\n")}\n`;
    }
    if (playerLikes.length > 0) {
      userPrompt += `玩家点赞的帖子ID：${playerLikes.join(", ")}\n`;
    }
    if (playerComments.length > 0) {
      userPrompt += `玩家评论：\n${playerComments.map(c => `- 对帖子${c.postId}: "${c.content}"`).join("\n")}\n`;
    }
  }
}
```

The output schema already includes `maimaiResults` (added in Task 5). The event agent will return structured MaiMai consequences when maimaiActivity is present.

- [ ] **Step 3: Run existing event agent tests**

Run: `npx vitest run tests/ai/agents/event.test.ts`
Expected: PASS (existing tests should still work since maimaiResults is optional)

- [ ] **Step 4: Commit**

```bash
git add src/ai/agents/event.ts
git commit -m "feat: update event agent for MaiMai consequences and offer generation"
```

### Task 17: Update Narrative Agent for Executive Path

**Files:**
- Modify: `src/ai/agents/narrative.ts`

- [ ] **Step 1: Add executive-specific system prompt variant**

In `buildSystemPrompt`, add a check for executive phase:

```typescript
if (input.state.phase2Path === "executive") {
  return `你是一个职场模拟游戏的叙事者。玩家现在是公司高管（${input.state.executive?.stage}），正在公司权力中心博弈。

叙事风格：
- 描述公司政治、董事会动态、部门竞争
- 引用高管属性（部门业绩: ${input.state.executive?.departmentPerformance}/100, 董事会支持率: ${input.state.executive?.boardSupport}/100）
- 如果本季度有麦麦活动，将其后果编织进叙事
- 关注权力博弈和战略决策的张力

${isCriticalPeriod ? `当前关键期：${input.state.criticalPeriod?.type}
生成150-300字的每日叙事 + 3-4个情境选择，选择必须属于以下类别：${categories.join("/")}
每个选择需要结构化效果（对ExecutiveState和PlayerAttributes的影响）` :
`生成300-500字的季度叙事 + 一句话 narrativeSummary`}`;
}
```

- [ ] **Step 2: Update user prompt to include executive state and MaiMai data**

In `buildUserPrompt`, when executive state exists:

```typescript
if (input.state.executive) {
  userPrompt += `\n\n## 高管状态
阶段: ${input.state.executive.stage}
部门业绩: ${input.state.executive.departmentPerformance}/100
董事会支持率: ${input.state.executive.boardSupport}/100
团队忠诚度: ${input.state.executive.teamLoyalty}/100
政治资本: ${input.state.executive.politicalCapital}/100
股价: ¥${input.state.executive.stockPrice}
管辖部门数: ${input.state.executive.departmentCount}`;
}

// MaiMai results from event agent (if available):
if (eventContext?.maimaiResults?.postResults?.length) {
  userPrompt += `\n\n## 麦麦动态后果`;
  for (const pr of eventContext.maimaiResults.postResults) {
    userPrompt += `\n- ${pr.aiAnalysis}（传播等级: ${pr.viralLevel}${pr.consequences.identityExposed ? "，身份被暴露！" : ""}）`;
  }
}
```

- [ ] **Step 3: Run narrative agent tests**

Run: `npx vitest run tests/ai/agents/narrative.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/ai/agents/narrative.ts
git commit -m "feat: update narrative agent for executive and MaiMai narratives"
```

### Task 18: Update NPC Agent for Company Transitions

**Files:**
- Modify: `src/ai/agents/npc.ts`

- [ ] **Step 1: Update NPC agent system prompt to handle inactive NPCs and company transitions**

In `src/ai/agents/npc.ts`, extend the system prompt:

```typescript
const COMPANY_TRANSITION_INSTRUCTIONS = `
## 公司变动

当玩家跳槽到新公司时：
- 新公司的NPC（isActive: true）需要被赋予个性鲜明的名字、性格和隐藏目标（替换占位符数据）
- 前公司的NPC（isActive: false）偶尔可以通过"小信"联系玩家
- 前同事的对话应体现他们对玩家离开的反应（正面或负面）

当生成新NPC时，使用 newNpcs 字段返回完整NPC对象，包含 companyName 字段设为新公司名。
`;
```

- [ ] **Step 2: Update user prompt to include inactive NPC context**

```typescript
// In buildUserPrompt for NPC agent:
const activeNpcs = input.state.npcs.filter(n => n.isActive);
const inactiveNpcs = input.state.npcs.filter(n => !n.isActive);

userPrompt += `\n\n## 当前同事（活跃NPC）\n`;
for (const npc of activeNpcs) {
  userPrompt += `- ${npc.name}（${npc.role}，${npc.companyName}）: 好感度${npc.favor}, 性格: ${npc.personality}\n`;
}

if (inactiveNpcs.length > 0) {
  userPrompt += `\n## 前同事（非活跃NPC，可能偶尔联系）\n`;
  for (const npc of inactiveNpcs.slice(-10)) { // limit to 10 most recent
    userPrompt += `- ${npc.name}（${npc.role}，${npc.companyName}）: 好感度${npc.favor}\n`;
  }
}
```

- [ ] **Step 3: Run NPC agent tests**

Run: `npx vitest run tests/ai/agents/npc.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/ai/agents/npc.ts
git commit -m "feat: update NPC agent for company transitions and inactive NPCs"
```

### Task 19: Update Quarterly Pipeline

**Files:**
- Modify: `src/ai/orchestration/quarterly.ts`

- [ ] **Step 1: Add executive quarterly branch**

In `runQuarterlyPipeline`, add a branch at the top:

```typescript
if (state.phase2Path === "executive") {
  return runExecutiveQuarterlyPipeline(state, plan as ExecutiveQuarterPlan);
}
```

Implement `runExecutiveQuarterlyPipeline` following the same agent pipeline pattern:
1. `settleExecutiveQuarter(state, plan)` — engine
2. `runWorldAgent(input)` — world state
3. `runEventAgent(input, worldContext)` — events + MaiMai results
4. Apply MaiMai consequences to state
5. `runNPCAgent(...)` — NPC reactions
6. `runNarrativeAgent(...)` — quarterly narrative
7. Create quarter summary
8. **Handle triggered critical periods:** If `settleExecutiveQuarter` returns `triggerBoardReview: true`, enter `board_review` critical period. If `triggerCriticalType` is set (e.g., `"major_decision"` from `strategic_planning`), enter that critical period. Generate opening choices via `runNarrativeAgent` with `generateChoices: true`:

```typescript
const { state: settledState, triggerBoardReview, triggerCriticalType } = settleExecutiveQuarter(state, plan);
// ... run agent pipeline ...

// Handle triggered critical periods
let criticalChoices: CriticalChoice[] | undefined;
const criticalToEnter = triggerCriticalType ?? (triggerBoardReview ? "board_review" : null);
if (criticalToEnter) {
  finalState.timeMode = "critical";
  finalState.criticalPeriod = enterCriticalPeriod(criticalToEnter as CriticalPeriodType);
  finalState.staminaRemaining = 3;
  // Generate opening choices for the critical period
  const choiceNarrative = await runNarrativeAgent(
    { state: finalState, recentHistory: getRecentHistory(finalState.history) },
    worldContext, eventContext, npcContext, [], "",
    true, // generateChoices
  );
  criticalChoices = choiceNarrative.choices;
}
```

- [ ] **Step 2: Add MaiMai result processing to existing quarterly pipeline**

Even in Phase 1, MaiMai results need processing. After event agent runs, if `maimaiResults` exists:
- Apply player effects
- Apply NPC favor changes
- Update post viralLevel and identityExposed
- Add generated replies to posts

- [ ] **Step 3: Add maimaiPostsThisQuarter reset to BOTH settlement functions**

In `src/engine/quarter.ts` (the existing `settleQuarter` for Phase 1 and startup), add before the return:

```typescript
newState.maimaiPostsThisQuarter = 0;
```

The executive settlement already has this (in `settleExecutiveQuarter`). Both paths must reset this counter.

Also in `src/engine/quarter.ts`, add a guard at the top of `settleQuarter`:

```typescript
if (state.phase2Path === "executive") {
  throw new Error("Use settleExecutiveQuarter for executive path");
}
```

- [ ] **Step 4: Run quarterly pipeline tests**

Run: `npx vitest run tests/ai/orchestration/quarterly.test.ts`
Expected: PASS (may need fixture updates)

- [ ] **Step 5: Commit**

```bash
git add src/ai/orchestration/quarterly.ts
git commit -m "feat: update quarterly pipeline for executive path and MaiMai processing"
```

### Task 20: Update Conflict Validation

**Files:**
- Modify: `src/ai/orchestration/conflict.ts`

- [ ] **Step 1: Add executive-specific validation**

Add `validateExecutiveEvents()` function to check:
- Executive events should not reference non-existent NPC positions
- Board review results should have valid ranges
- MaiMai consequence severity should be proportional to viral level

- [ ] **Step 2: Run conflict tests**

Run: `npx vitest run tests/ai/orchestration/conflict.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/ai/orchestration/conflict.ts
git commit -m "feat: add executive validation to conflict resolution"
```

---

## Chunk 6: API Routes, Store & Integration

### Task 21: Update Resign Route for Path Choice

**Files:**
- Modify: `src/app/api/game/resign/route.ts`

- [ ] **Step 1: Accept path parameter**

Update the POST handler to accept `{ state, path: "startup" | "executive" }` in the request body. Default to `"startup"` for backward compatibility.

```typescript
const { state, path = "startup" } = await request.json();
// Pass path to transitionToPhase2
const newState = transitionToPhase2(state, path);
```

- [ ] **Step 2: Run resign route tests**

Run: `npx vitest run tests/app/api/game/resign.test.ts`
Expected: PASS (default path = "startup" preserves existing behavior)

- [ ] **Step 3: Commit**

```bash
git add src/app/api/game/resign/route.ts
git commit -m "feat: update resign route to accept startup/executive path choice"
```

### Task 22: Update Turn Route for Executive Plans

**Files:**
- Modify: `src/app/api/game/turn/route.ts`

- [ ] **Step 1: Handle executive quarterly plan with separate type path**

In the quarterly branch, check `state.phase2Path` and parse plan differently:

```typescript
if (state.timeMode === "quarterly") {
  if (state.phase2Path === "executive") {
    // Parse plan as ExecutiveQuarterPlan (actions use ExecutiveAction type)
    const execPlan = body.plan as ExecutiveQuarterPlan;
    const result = await runExecutiveQuarterlyPipeline(state, execPlan);
    return NextResponse.json({ success: true, ...result });
  }
  // Existing: parse as QuarterPlan for Phase 1 / startup Phase 2
  const result = await runQuarterlyPipeline(state, plan);
  // ...
}
```

The key insight: the route handler must branch BEFORE calling the pipeline, because the plan types are incompatible (`GameAction` vs `ExecutiveAction`). Do not cast — use separate code paths.

- [ ] **Step 2: Run turn route tests**

Run: `npx vitest run tests/app/api/game/turn.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/api/game/turn/route.ts
git commit -m "feat: ensure turn route supports executive quarterly plans"
```

### Task 23: Update Game Store

**Files:**
- Modify: `src/store/gameStore.ts`

- [ ] **Step 1: Add MaiMai actions**

```typescript
// New store actions:
postOnMaimai: (content: string) => void;
likePost: (postId: string) => void;
commentOnPost: (postId: string, content: string) => void;
```

Implementation:
- `postOnMaimai`: Check `canPostThisQuarter`, create post via `createPlayerPost`, add to `maimaiPosts`, increment `maimaiPostsThisQuarter`
- `likePost`: Find post, apply `addPlayerLike`
- `commentOnPost`: Find post, apply `addPlayerComment`

- [ ] **Step 2: Add job offer actions**

```typescript
acceptOffer: (offerId: string) => Promise<void>;
ignoreOffer: (offerId: string) => void;
```

Implementation:
- `acceptOffer`: Find offer, call `executeJobHop`, then call API for onboarding narrative
- `ignoreOffer`: Remove offer from `jobOffers`

- [ ] **Step 3: Update resignStartup to accept path**

```typescript
resignStartup: (path?: Phase2Path) => Promise<void>;
// Passes path to /api/game/resign
```

- [ ] **Step 4: Run store tests**

Run: `npx vitest run tests/store/gameStore.test.ts`
Expected: PASS (may need fixture updates)

- [ ] **Step 5: Commit**

```bash
git add src/store/gameStore.ts
git commit -m "feat: add MaiMai, job offer, and executive store actions"
```

---

## Chunk 7: Frontend Components

### Task 24: MaiMai App Rewrite

**Files:**
- Rewrite: `src/components/game/phone/MaimaiApp.tsx`
- Create: `src/components/game/phone/MaimaiPostCard.tsx`
- Create: `src/components/game/phone/MaimaiCompose.tsx`
- Create: `src/components/game/phone/MaimaiCommentInput.tsx`

- [ ] **Step 1: Create MaimaiPostCard component**

Displays a single post with like button, comment count, comments list, and comment input.

```typescript
// src/components/game/phone/MaimaiPostCard.tsx
// Props: post: MaimaiPost, onLike: (id) => void, onComment: (id, content) => void
// Shows: author label, content, like count + button, comments, comment input
```

- [ ] **Step 2: Create MaimaiCompose component**

Textarea + submit button for creating a new post. Shows remaining post count.

```typescript
// src/components/game/phone/MaimaiCompose.tsx
// Props: onSubmit: (content) => void, canPost: boolean, postsRemaining: number
```

- [ ] **Step 3: Create MaimaiCommentInput component**

Small inline textarea for adding a comment to a post.

```typescript
// src/components/game/phone/MaimaiCommentInput.tsx
// Props: onSubmit: (content) => void, disabled: boolean
```

- [ ] **Step 4: Rewrite MaimaiApp.tsx**

Replace the simple message list with a social feed:

```typescript
// src/components/game/phone/MaimaiApp.tsx
// - Header with "麦麦" title and compose button
// - MaimaiCompose at top (toggled by button)
// - Scrollable feed of MaimaiPostCard components
// - Data from store: state.maimaiPosts, sorted by quarter desc
// - Actions from store: postOnMaimai, likePost, commentOnPost
```

- [ ] **Step 5: Verify UI renders without errors**

Run dev server and manually check the MaiMai app renders in the phone panel.

- [ ] **Step 6: Commit**

```bash
git add src/components/game/phone/MaimaiApp.tsx src/components/game/phone/MaimaiPostCard.tsx src/components/game/phone/MaimaiCompose.tsx src/components/game/phone/MaimaiCommentInput.tsx
git commit -m "feat: rewrite MaiMai app as interactive social feed"
```

### Task 25: Job Offer UI in HR ZhiPin

**Files:**
- Modify: `src/components/game/phone/HrzhipinApp.tsx`
- Create: `src/components/game/JobOfferCard.tsx`

- [ ] **Step 1: Create JobOfferCard component**

```typescript
// src/components/game/JobOfferCard.tsx
// Props: offer: JobOffer, onAccept, onNegotiate, onIgnore
// Shows: company name, profile, offered level, salary, status badge
// Three buttons: 接受 / 谈判 / 忽略
```

- [ ] **Step 2: Update HrzhipinApp to show offers**

Add a section at the top of HrzhipinApp that shows active job offers from `state.jobOffers`. Each offer renders as a `JobOfferCard`.

- [ ] **Step 3: Commit**

```bash
git add src/components/game/phone/HrzhipinApp.tsx src/components/game/JobOfferCard.tsx
git commit -m "feat: add job offer display and actions to HR ZhiPin app"
```

### Task 26: Phase 2 Choice Modal

**Files:**
- Create: `src/components/game/Phase2Choice.tsx`

- [ ] **Step 1: Create Phase2Choice component**

```typescript
// src/components/game/Phase2Choice.tsx
// Shows when player reaches L8 and triggers resign
// Two cards: "创业" (startup) and "留任高管" (executive)
// Each card has brief description and a button
// Calls store.resignStartup(path)
```

- [ ] **Step 2: Integrate into the resign flow**

Update the component/store that handles the resign action to show Phase2Choice when player is L8 (otherwise auto-choose startup).

- [ ] **Step 3: Commit**

```bash
git add src/components/game/Phase2Choice.tsx
git commit -m "feat: add Phase 2 path choice modal (startup vs executive)"
```

### Task 27: Executive Dashboard and Actions

**Files:**
- Create: `src/components/game/ExecutiveStats.tsx`
- Create: `src/components/game/ExecutiveActions.tsx`
- Modify: `src/components/game/CompanyStats.tsx`
- Modify: `src/components/game/QuarterlyActions.tsx`

- [ ] **Step 1: Create ExecutiveStats component**

```typescript
// src/components/game/ExecutiveStats.tsx
// Shows executive attributes: departmentPerformance, boardSupport, teamLoyalty, politicalCapital, stockPrice
// Uses PixelProgressBar for 0-100 values
// Shows stage label (E1/E2/E3) and vestedShares
```

- [ ] **Step 2: Create ExecutiveActions component**

```typescript
// src/components/game/ExecutiveActions.tsx
// Similar to QuarterlyActions but with executive action cards
// Each card shows: action name, stamina cost, brief effect description
// Drag/click to allocate actions within 10 stamina budget
```

- [ ] **Step 3: Update CompanyStats to conditionally show executive stats**

```typescript
// In CompanyStats or DashboardPanel:
if (state.phase2Path === "executive") {
  return <ExecutiveStats executive={state.executive!} />;
} else if (state.company) {
  return <CompanyStats company={state.company} />;
}
```

- [ ] **Step 4: Update QuarterlyActions to show executive actions when appropriate**

```typescript
// In QuarterlyActions:
if (state.phase2Path === "executive") {
  return <ExecutiveActions ... />;
}
// else existing Phase1/Phase2 action UI
```

- [ ] **Step 5: Commit**

```bash
git add src/components/game/ExecutiveStats.tsx src/components/game/ExecutiveActions.tsx
git add -u src/components/game/CompanyStats.tsx src/components/game/QuarterlyActions.tsx
git commit -m "feat: add executive dashboard and action planning UI"
```

### Task 28: Final Integration Test

**Files:**
- Modify: `tests/integration/resign-flow.test.ts`

- [ ] **Step 1: Add executive transition integration test**

```typescript
describe("executive transition flow", () => {
  it("transitions L8 player to executive path", async () => {
    // Setup L8 player state
    // Call resign API with path: "executive"
    // Verify: phase=2, phase2Path="executive", executive exists, company null
    // Verify: critical period = executive_onboarding
  });
});
```

- [ ] **Step 2: Run all integration tests**

Run: `npx vitest run tests/integration/`
Expected: PASS

- [ ] **Step 3: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add tests/integration/resign-flow.test.ts
git commit -m "test: add executive transition integration test"
```
