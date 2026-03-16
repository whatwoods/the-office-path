# Settings Panel Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a settings panel with AI model configuration, display/narrative settings, and auto-save toggle.

**Architecture:** New `settingsStore` (Zustand) for persistent settings in LocalStorage. `SettingsModal` component reuses existing `Modal`. AI config flows through request body to backend, where `provider.ts` creates dynamic provider instances. Settings are accessible from both the main menu and in-game TopStatusBar.

**Tech Stack:** Next.js 16 App Router, React 19, Zustand 5, Tailwind CSS 4, Vitest + React Testing Library

**Spec:** `docs/superpowers/specs/2026-03-16-settings-panel-design.md`

---

## Chunk 1: Settings Store & AI Provider

### Task 1: AIConfig Type

**Files:**
- Create: `src/types/settings.ts`

- [ ] **Step 1: Create the settings types file**

```ts
// src/types/settings.ts
export interface AIConfig {
  provider: 'openai' | 'anthropic' | 'deepseek'
  apiKey: string
  modelOverrides?: Record<string, string>
}

export interface Settings {
  ai: {
    provider: 'openai' | 'anthropic' | 'deepseek'
    apiKey: string
    modelOverrides: {
      world?: string
      event?: string
      npc?: string
      narrative?: string
    }
  }
  display: {
    narrativeSpeed: number
    fontSize: 'small' | 'medium' | 'large'
  }
  gameplay: {
    autoSave: boolean
  }
}

export const DEFAULT_SETTINGS: Settings = {
  ai: {
    provider: 'openai',
    apiKey: '',
    modelOverrides: {},
  },
  display: {
    narrativeSpeed: 40,
    fontSize: 'medium',
  },
  gameplay: {
    autoSave: true,
  },
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/settings.ts
git commit -m "feat: add AIConfig and Settings type definitions"
```

---

### Task 2: Settings Store

**Files:**
- Create: `src/store/settingsStore.ts`
- Test: `tests/store/settingsStore.test.ts`

- [ ] **Step 1: Write failing tests for settingsStore**

```ts
// tests/store/settingsStore.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { DEFAULT_SETTINGS } from '@/types/settings'

const storage: Record<string, string> = {}
vi.stubGlobal('localStorage', {
  getItem: (key: string) => storage[key] ?? null,
  setItem: (key: string, value: string) => { storage[key] = value },
  removeItem: (key: string) => { delete storage[key] },
})

import { useSettingsStore } from '@/store/settingsStore'

describe('useSettingsStore', () => {
  beforeEach(() => {
    Object.keys(storage).forEach(k => delete storage[k])
    useSettingsStore.setState({ settings: structuredClone(DEFAULT_SETTINGS) })
  })

  it('has default settings on init', () => {
    const { settings } = useSettingsStore.getState()
    expect(settings).toEqual(DEFAULT_SETTINGS)
  })

  it('updateAI updates ai settings and persists', () => {
    useSettingsStore.getState().updateAI({ provider: 'anthropic', apiKey: 'sk-test' })

    const { settings } = useSettingsStore.getState()
    expect(settings.ai.provider).toBe('anthropic')
    expect(settings.ai.apiKey).toBe('sk-test')

    const stored = JSON.parse(storage['office_path_settings'])
    expect(stored.ai.provider).toBe('anthropic')
  })

  it('updateDisplay updates display settings and persists', () => {
    useSettingsStore.getState().updateDisplay({ narrativeSpeed: 80, fontSize: 'large' })

    const { settings } = useSettingsStore.getState()
    expect(settings.display.narrativeSpeed).toBe(80)
    expect(settings.display.fontSize).toBe('large')
  })

  it('updateGameplay updates gameplay settings and persists', () => {
    useSettingsStore.getState().updateGameplay({ autoSave: false })

    const { settings } = useSettingsStore.getState()
    expect(settings.gameplay.autoSave).toBe(false)
  })

  it('loadSettings reads from localStorage and deep-merges with defaults', () => {
    // Simulate stored settings missing the gameplay field (forward compat)
    storage['office_path_settings'] = JSON.stringify({
      ai: { provider: 'deepseek', apiKey: 'dk-123', modelOverrides: {} },
      display: { narrativeSpeed: 60, fontSize: 'small' },
    })

    useSettingsStore.getState().loadSettings()

    const { settings } = useSettingsStore.getState()
    expect(settings.ai.provider).toBe('deepseek')
    expect(settings.gameplay.autoSave).toBe(true) // default filled in
  })

  it('loadSettings falls back to defaults on corrupt JSON', () => {
    storage['office_path_settings'] = '{broken'

    useSettingsStore.getState().loadSettings()

    expect(useSettingsStore.getState().settings).toEqual(DEFAULT_SETTINGS)
  })

  it('getAIConfig returns null when apiKey is empty', () => {
    const config = useSettingsStore.getState().getAIConfig()
    expect(config).toBeNull()
  })

  it('getAIConfig returns AIConfig when apiKey is set', () => {
    useSettingsStore.getState().updateAI({ provider: 'anthropic', apiKey: 'sk-test' })

    const config = useSettingsStore.getState().getAIConfig()
    expect(config).toEqual({
      provider: 'anthropic',
      apiKey: 'sk-test',
      modelOverrides: {},
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/store/settingsStore.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement settingsStore**

```ts
// src/store/settingsStore.ts
import { create } from 'zustand'
import type { AIConfig, Settings } from '@/types/settings'
import { DEFAULT_SETTINGS } from '@/types/settings'

const STORAGE_KEY = 'office_path_settings'

function deepMerge(defaults: Settings, partial: Partial<Settings>): Settings {
  return {
    ai: { ...defaults.ai, ...partial.ai },
    display: { ...defaults.display, ...partial.display },
    gameplay: { ...defaults.gameplay, ...partial.gameplay },
  }
}

function persist(settings: Settings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

interface SettingsStore {
  settings: Settings
  loadSettings: () => void
  updateAI: (patch: Partial<Settings['ai']>) => void
  updateDisplay: (patch: Partial<Settings['display']>) => void
  updateGameplay: (patch: Partial<Settings['gameplay']>) => void
  getAIConfig: () => AIConfig | null
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: structuredClone(DEFAULT_SETTINGS),

  loadSettings: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      set({ settings: deepMerge(DEFAULT_SETTINGS, parsed) })
    } catch {
      set({ settings: structuredClone(DEFAULT_SETTINGS) })
    }
  },

  updateAI: (patch) => {
    const settings = { ...get().settings, ai: { ...get().settings.ai, ...patch } }
    set({ settings })
    persist(settings)
  },

  updateDisplay: (patch) => {
    const settings = { ...get().settings, display: { ...get().settings.display, ...patch } }
    set({ settings })
    persist(settings)
  },

  updateGameplay: (patch) => {
    const settings = { ...get().settings, gameplay: { ...get().settings.gameplay, ...patch } }
    set({ settings })
    persist(settings)
  },

  getAIConfig: () => {
    const { ai } = get().settings
    if (!ai.apiKey) return null
    return {
      provider: ai.provider,
      apiKey: ai.apiKey,
      modelOverrides: ai.modelOverrides,
    }
  },
}))
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/store/settingsStore.test.ts`
Expected: all 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/store/settingsStore.ts tests/store/settingsStore.test.ts
git commit -m "feat: add settingsStore with LocalStorage persistence"
```

---

### Task 3: Dynamic AI Provider

**Files:**
- Modify: `src/ai/provider.ts`
- Modify: `tests/ai/provider.test.ts`

- [ ] **Step 1: Add failing tests for dynamic API key and resolveAgentModel**

Append to `tests/ai/provider.test.ts`:

```ts
import { resolveAgentModel, type AIConfig } from "@/ai/provider";

describe("getModel with dynamic API key", () => {
  it("creates a model with dynamic key when provided", () => {
    const model = getModel("openai:gpt-4o", "sk-dynamic-123");
    expect(model).toBeDefined();
    expect(model).toHaveProperty("modelId", "gpt-4o");
  });

  it("falls back to env-based provider when no dynamic key", () => {
    const model = getModel("openai:gpt-4o");
    expect(model).toBeDefined();
    expect(model).toHaveProperty("modelId", "gpt-4o");
  });
});

describe("resolveAgentModel", () => {
  it("returns env-based model when no aiConfig", () => {
    const spec = resolveAgentModel("world");
    expect(spec).toBe("openai:gpt-4o-mini"); // AGENT_MODELS.world default
  });

  it("uses provider default model when aiConfig has no override", () => {
    const config: AIConfig = { provider: "anthropic", apiKey: "sk-test" };
    const spec = resolveAgentModel("narrative", config);
    expect(spec).toBe("anthropic:claude-sonnet-4-20250514");
  });

  it("uses modelOverride when provided", () => {
    const config: AIConfig = {
      provider: "openai",
      apiKey: "sk-test",
      modelOverrides: { world: "openai:gpt-4o" },
    };
    const spec = resolveAgentModel("world", config);
    expect(spec).toBe("openai:gpt-4o");
  });

  it("ignores override for unrelated agent", () => {
    const config: AIConfig = {
      provider: "deepseek",
      apiKey: "dk-test",
      modelOverrides: { world: "openai:gpt-4o" },
    };
    const spec = resolveAgentModel("event", config);
    expect(spec).toBe("deepseek:deepseek-chat");
  });
});
```

- [ ] **Step 2: Run tests to verify new tests fail**

Run: `npx vitest run tests/ai/provider.test.ts`
Expected: FAIL — `resolveAgentModel` not found

- [ ] **Step 3: Implement changes to provider.ts**

Replace `src/ai/provider.ts` with:

```ts
import { createAnthropic } from "@ai-sdk/anthropic";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createOpenAI } from "@ai-sdk/openai";
import type { AIConfig } from "@/types/settings";

export type { AIConfig } from "@/types/settings";

export type ModelSpec = `${"openai" | "anthropic" | "deepseek"}:${string}`;

const providers = {
  openai: createOpenAI({ apiKey: process.env.OPENAI_API_KEY ?? "" }),
  anthropic: createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" }),
  deepseek: createDeepSeek({ apiKey: process.env.DEEPSEEK_API_KEY ?? "" }),
} as const;

type ProviderName = keyof typeof providers;

const providerFactories = {
  openai: createOpenAI,
  anthropic: createAnthropic,
  deepseek: createDeepSeek,
} as const;

export function getModel(spec: ModelSpec, dynamicApiKey?: string) {
  if (!spec.includes(":")) {
    throw new Error(
      `Invalid model spec: "${spec}". Expected format "provider:model-id"`,
    );
  }

  const [providerName, ...rest] = spec.split(":");
  const modelId = rest.join(":");

  if (!(providerName in providers)) {
    throw new Error(`Unknown AI provider: ${providerName}`);
  }

  if (dynamicApiKey) {
    const factory = providerFactories[providerName as ProviderName];
    const dynamicProvider = factory({ apiKey: dynamicApiKey });
    return dynamicProvider(modelId);
  }

  const provider = providers[providerName as ProviderName];
  return provider(modelId);
}

const DEFAULT_MODELS_BY_PROVIDER: Record<
  ProviderName,
  Record<string, string>
> = {
  openai: { world: "gpt-4o-mini", event: "gpt-4o-mini", npc: "gpt-4o", narrative: "gpt-4o" },
  anthropic: { world: "claude-sonnet-4-20250514", event: "claude-sonnet-4-20250514", npc: "claude-sonnet-4-20250514", narrative: "claude-sonnet-4-20250514" },
  deepseek: { world: "deepseek-chat", event: "deepseek-chat", npc: "deepseek-chat", narrative: "deepseek-chat" },
};

export const AGENT_MODELS = {
  world: (process.env.WORLD_AGENT_MODEL ?? "openai:gpt-4o-mini") as ModelSpec,
  event: (process.env.EVENT_AGENT_MODEL ?? "openai:gpt-4o-mini") as ModelSpec,
  npc: (process.env.NPC_AGENT_MODEL ?? "openai:gpt-4o") as ModelSpec,
  narrative: (process.env.NARRATIVE_AGENT_MODEL ?? "openai:gpt-4o") as ModelSpec,
} as const;

export function resolveAgentModel(
  agent: keyof typeof AGENT_MODELS,
  aiConfig?: AIConfig,
): ModelSpec {
  if (!aiConfig) return AGENT_MODELS[agent];

  const override = aiConfig.modelOverrides?.[agent];
  if (override) return override as ModelSpec;

  const modelId = DEFAULT_MODELS_BY_PROVIDER[aiConfig.provider][agent];
  return `${aiConfig.provider}:${modelId}` as ModelSpec;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/ai/provider.test.ts`
Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/ai/provider.ts src/types/settings.ts tests/ai/provider.test.ts
git commit -m "feat: add dynamic API key support and resolveAgentModel"
```

---

### Task 4: Thread aiConfig Through Agent Functions

**Files:**
- Modify: `src/ai/agents/world.ts`
- Modify: `src/ai/agents/event.ts`
- Modify: `src/ai/agents/npc.ts`
- Modify: `src/ai/agents/narrative.ts`

Each agent function gets an optional `aiConfig?: AIConfig` as the **last** parameter. Internally, it replaces `getModel(AGENT_MODELS.xxx)` with `getModel(resolveAgentModel('xxx', aiConfig), aiConfig?.apiKey)`.

- [ ] **Step 1: Modify world.ts**

Change the import and function signature in `src/ai/agents/world.ts`:

```ts
// Import line change:
import { getModel, resolveAgentModel } from "@/ai/provider";
import type { AIConfig } from "@/types/settings";

// Function signature change (line 64):
export async function runWorldAgent(
  input: AgentInput,
  aiConfig?: AIConfig,
): Promise<WorldAgentOutput> {
  const { output } = await generateText({
    model: getModel(resolveAgentModel('world', aiConfig), aiConfig?.apiKey),
    // ... rest unchanged
  });
  return output!;
}
```

- [ ] **Step 2: Modify event.ts**

Same pattern in `src/ai/agents/event.ts`:

```ts
import { getModel, resolveAgentModel } from "@/ai/provider";
import type { AIConfig } from "@/types/settings";

// Function signature (line 88) — aiConfig after worldContext:
export async function runEventAgent(
  input: AgentInput,
  worldContext: WorldAgentOutput,
  aiConfig?: AIConfig,
): Promise<EventAgentOutput> {
  const { output } = await generateText({
    model: getModel(resolveAgentModel('event', aiConfig), aiConfig?.apiKey),
    // ... rest unchanged
  });
  return output!;
}
```

- [ ] **Step 3: Modify npc.ts**

In `src/ai/agents/npc.ts`:

```ts
import { getModel, resolveAgentModel } from "@/ai/provider";
import type { AIConfig } from "@/types/settings";

// Function signature (line 103) — aiConfig after playerContext:
export async function runNPCAgent(
  input: AgentInput,
  worldContext: WorldAgentOutput,
  eventContext: EventAgentOutput,
  playerActions: ActionAllocation[],
  playerContext?: string,
  aiConfig?: AIConfig,
): Promise<NPCAgentOutput> {
  const { output } = await generateText({
    model: getModel(resolveAgentModel('npc', aiConfig), aiConfig?.apiKey),
    // ... rest unchanged
  });
  return output!;
}
```

- [ ] **Step 4: Modify narrative.ts**

In `src/ai/agents/narrative.ts`:

```ts
import { getModel, resolveAgentModel } from "@/ai/provider";
import type { AIConfig } from "@/types/settings";

// Function signature (line 124) — aiConfig after generateChoices:
export async function runNarrativeAgent(
  input: AgentInput,
  worldContext: WorldAgentOutput,
  eventContext: EventAgentOutput,
  npcContext: NPCAgentOutput,
  playerActions: ActionAllocation[],
  isCriticalPeriod: boolean,
  playerContext?: string,
  generateChoices: boolean = isCriticalPeriod,
  aiConfig?: AIConfig,
): Promise<NarrativeAgentOutput> {
  const { output } = await generateText({
    model: getModel(resolveAgentModel('narrative', aiConfig), aiConfig?.apiKey),
    // ... rest unchanged
  });
  return output!;
}
```

- [ ] **Step 5: Run existing agent tests to verify no regression**

Run: `npx vitest run tests/ai/agents/`
Expected: all existing tests still PASS (aiConfig is optional, defaults to undefined)

- [ ] **Step 6: Commit**

```bash
git add src/ai/agents/world.ts src/ai/agents/event.ts src/ai/agents/npc.ts src/ai/agents/narrative.ts
git commit -m "feat: thread aiConfig through all agent functions"
```

---

### Task 5: Thread aiConfig Through Orchestration Pipelines

**Files:**
- Modify: `src/ai/orchestration/quarterly.ts`
- Modify: `src/ai/orchestration/critical.ts`

- [ ] **Step 1: Modify quarterly.ts**

In `src/ai/orchestration/quarterly.ts`:

Add import:
```ts
import type { AIConfig } from "@/types/settings";
```

Change `runQuarterlyPipeline` signature (line 76):
```ts
export async function runQuarterlyPipeline(
  state: GameState,
  plan: QuarterPlan,
  aiConfig?: AIConfig,
): Promise<QuarterlyPipelineResult> {
```

Pass `aiConfig` to every agent call inside the function:
- `runWorldAgent(agentInput)` → `runWorldAgent(agentInput, aiConfig)`
- `runEventAgent(agentInput, worldOutput)` → `runEventAgent(agentInput, worldOutput, aiConfig)`
- `runNPCAgent(agentInput, worldOutput, eventOutput, plan.actions, phoneReplyContext)` → `runNPCAgent(agentInput, worldOutput, eventOutput, plan.actions, phoneReplyContext, aiConfig)`
- `runNarrativeAgent(agentInput, worldOutput, eventOutput, npcOutput, plan.actions, false, phoneReplyContext)` → `runNarrativeAgent(agentInput, worldOutput, eventOutput, npcOutput, plan.actions, false, phoneReplyContext, undefined, aiConfig)`
- The second `runNarrativeAgent` call (for critical opening choices, around line 207) also needs aiConfig as the last argument: append `aiConfig` after the last `true` argument.

- [ ] **Step 2: Modify critical.ts**

In `src/ai/orchestration/critical.ts`:

Add import:
```ts
import type { AIConfig } from "@/types/settings";
```

Change `runCriticalDayPipeline` signature (line 61):
```ts
export async function runCriticalDayPipeline(
  state: GameState,
  choice: CriticalChoice,
  aiConfig?: AIConfig,
): Promise<CriticalDayPipelineResult> {
```

Pass `aiConfig` to every agent call:
- `runNPCAgent(agentInput, worldContext, ..., playerContext)` → append `, aiConfig`
- `runEventAgent(agentInput, worldContext)` → `runEventAgent(agentInput, worldContext, aiConfig)`
- `runNarrativeAgent(agentInput, worldContext, eventOutput, npcOutput, [], true, playerContext, isCriticalStill)` → append `, aiConfig`

- [ ] **Step 3: Run orchestration tests to verify no regression**

Run: `npx vitest run tests/ai/orchestration/`
Expected: all existing tests still PASS

- [ ] **Step 4: Commit**

```bash
git add src/ai/orchestration/quarterly.ts src/ai/orchestration/critical.ts
git commit -m "feat: thread aiConfig through orchestration pipelines"
```

---

### Task 6: Route Handlers Accept aiConfig

**Files:**
- Modify: `src/app/api/game/new/route.ts`
- Modify: `src/app/api/game/turn/route.ts`
- Modify: `src/app/api/game/resign/route.ts`

- [ ] **Step 1: Modify /api/game/new route**

Change `src/app/api/game/new/route.ts`:

```ts
import { createNewGame } from "@/engine/state";
import { runNarrativeAgent } from "@/ai/agents/narrative";
import { validateChoices } from "@/ai/orchestration/conflict";
import type { AgentInput } from "@/types/agents";
import type { AIConfig } from "@/types/settings";
import type { CriticalPeriodType } from "@/types/game";

export async function POST(request: Request) {
  let aiConfig: AIConfig | undefined;
  try {
    const body = await request.json() as { aiConfig?: AIConfig };
    aiConfig = body.aiConfig;
  } catch {
    // No body or invalid JSON — proceed without aiConfig
  }

  const state = createNewGame();

  const agentInput: AgentInput = { state, recentHistory: [] };
  const worldContext = {
    economy: state.world.economyCycle,
    trends: state.world.industryTrends,
    companyStatus: state.world.companyStatus,
    newsItems: [],
  };

  const narrativeOutput = await runNarrativeAgent(
    agentInput,
    worldContext,
    { events: [], phoneMessages: [] },
    { npcActions: [], chatMessages: [] },
    [],
    true,
    "玩家入职了新公司。",
    true,
    aiConfig,
  );

  let criticalChoices;
  if (narrativeOutput.choices && state.criticalPeriod) {
    criticalChoices = validateChoices(
      narrativeOutput.choices,
      state.staminaRemaining,
      state.criticalPeriod.type as CriticalPeriodType,
      state.player,
    );
  }

  return Response.json({
    success: true,
    state,
    narrative: narrativeOutput.narrative,
    criticalChoices,
  });
}
```

- [ ] **Step 2: Modify /api/game/turn route**

In `src/app/api/game/turn/route.ts`, add to the body type:
```ts
import type { AIConfig } from "@/types/settings";

// Change the body type (line 9):
const body = (await request.json()) as {
  state?: GameState;
  plan?: QuarterPlan;
  choice?: CriticalChoice;
  aiConfig?: AIConfig;
};
```

Pass `body.aiConfig` to pipeline calls:
- `runCriticalDayPipeline(state, body.choice)` → `runCriticalDayPipeline(state, body.choice, body.aiConfig)`
- `runQuarterlyPipeline(state, body.plan)` → `runQuarterlyPipeline(state, body.plan, body.aiConfig)`

- [ ] **Step 3: Modify /api/game/resign route**

In `src/app/api/game/resign/route.ts`, add to the body type:
```ts
import type { AIConfig } from "@/types/settings";

// Change body type (line 10):
const body = (await request.json()) as { state?: GameState; aiConfig?: AIConfig };
```

Pass `body.aiConfig` to the `runNarrativeAgent` call — append `body.aiConfig` as the last argument.

- [ ] **Step 4: Update existing /api/game/new test**

The existing test calls `POST()` with no arguments. Since the signature now requires a `Request`, update `tests/app/api/game/new.test.ts`:

```ts
// Change line 21 from:
//   const res = await POST();
// To:
const res = await POST(new Request('http://localhost/api/game/new', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({}),
}));
```

- [ ] **Step 5: Run route handler and integration tests**

Run: `npx vitest run tests/app/ tests/integration/`
Expected: all existing tests still PASS

- [ ] **Step 6: Commit**

```bash
git add src/app/api/game/new/route.ts src/app/api/game/turn/route.ts src/app/api/game/resign/route.ts
git commit -m "feat: route handlers accept and pass aiConfig"
```

---

## Chunk 2: Frontend Integration

### Task 7: gameStore Injects aiConfig Into API Calls

**Files:**
- Modify: `src/store/gameStore.ts`
- Modify: `tests/store/gameStore.test.ts`

- [ ] **Step 1: Add failing test for aiConfig injection**

Append to `tests/store/gameStore.test.ts`:

```ts
// At the top with other imports:
import { useSettingsStore } from '@/store/settingsStore'

// Add test:
it('newGame includes aiConfig in request body when apiKey is set', async () => {
  useSettingsStore.getState().updateAI({ provider: 'anthropic', apiKey: 'sk-test-key' })

  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve({
      success: true,
      state: createNewGame(),
      narrative: '入职了。',
      criticalChoices: [],
    }),
  })

  await useGameStore.getState().newGame()

  const callArgs = mockFetch.mock.calls[0]
  const body = JSON.parse(callArgs[1].body)
  expect(body.aiConfig).toEqual({
    provider: 'anthropic',
    apiKey: 'sk-test-key',
    modelOverrides: {},
  })
})

it('newGame omits aiConfig when apiKey is empty', async () => {
  useSettingsStore.setState({ settings: structuredClone(DEFAULT_SETTINGS) })

  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve({
      success: true,
      state: createNewGame(),
      narrative: '入职了。',
      criticalChoices: [],
    }),
  })

  await useGameStore.getState().newGame()

  const callArgs = mockFetch.mock.calls[0]
  const body = JSON.parse(callArgs[1].body)
  expect(body.aiConfig).toBeUndefined()
})

it('submitQuarter respects autoSave setting', async () => {
  const mockState = createNewGame()
  useGameStore.setState({ state: { ...mockState, timeMode: 'quarterly' as const, criticalPeriod: null, staminaRemaining: 10 } })
  useSettingsStore.getState().updateGameplay({ autoSave: false })

  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve({
      success: true,
      state: mockState,
      narrative: '季度...',
      events: [],
    }),
  })

  const plan = { actions: [{ action: 'work_hard' as const }] }
  await useGameStore.getState().submitQuarter(plan as any)

  expect(storage['office_path_save_auto']).toBeUndefined()
})
```

- [ ] **Step 2: Run new tests to verify they fail**

Run: `npx vitest run tests/store/gameStore.test.ts`
Expected: FAIL

- [ ] **Step 3: Modify gameStore.ts**

In `src/store/gameStore.ts`, add import and helper:

```ts
import { useSettingsStore } from '@/store/settingsStore'

function buildAIConfig(): Record<string, unknown> | undefined {
  const config = useSettingsStore.getState().getAIConfig()
  return config ? { aiConfig: config } : undefined
}
```

Modify `newGame`:
```ts
newGame: async () => {
  set({ isLoading: true, error: null })
  try {
    const res = await fetch('/api/game/new', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...buildAIConfig() }),
    })
    // ... rest unchanged
```

**Note:** The existing test `'newGame fetches and stores opening narrative + critical choices'` asserts the fetch call does not have a `body` property. Update that assertion:

```ts
// Change from:
expect(mockFetch).toHaveBeenCalledWith('/api/game/new', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
})
// To:
expect(mockFetch).toHaveBeenCalledWith('/api/game/new', expect.objectContaining({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
}))
```

Modify `submitQuarter` — add aiConfig to body:
```ts
body: JSON.stringify({ state, plan, ...buildAIConfig() }),
```

And change the auto-save line:
```ts
// Replace: storageSave(data.state, 'auto')
// With:
if (useSettingsStore.getState().settings.gameplay.autoSave) {
  storageSave(data.state, 'auto')
}
```

Modify `submitChoice` — add aiConfig to body:
```ts
body: JSON.stringify({ state, choice, ...buildAIConfig() }),
```

Modify `resignStartup` — add aiConfig to body:
```ts
body: JSON.stringify({ state, ...buildAIConfig() }),
```

- [ ] **Step 4: Run all gameStore tests**

Run: `npx vitest run tests/store/gameStore.test.ts`
Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/store/gameStore.ts tests/store/gameStore.test.ts
git commit -m "feat: gameStore injects aiConfig and respects autoSave setting"
```

---

### Task 8: NarrativeDisplay Reads Narrative Speed

**Files:**
- Modify: `src/components/game/NarrativeDisplay.tsx`
- Modify: `tests/components/game/NarrativeDisplay.test.tsx`

- [ ] **Step 1: Read existing NarrativeDisplay test to understand patterns**

Check `tests/components/game/NarrativeDisplay.test.tsx` for existing test structure.

- [ ] **Step 2: Add failing test for custom speed**

Append to NarrativeDisplay tests:

```tsx
import { useSettingsStore } from '@/store/settingsStore'

it('uses narrativeSpeed from settings store', () => {
  useSettingsStore.getState().updateDisplay({ narrativeSpeed: 20 })

  render(
    <NarrativeDisplay
      segments={[{ type: 'text', content: '测试' }]}
      onComplete={vi.fn()}
    />
  )

  // The component should read from settingsStore instead of hardcoded 40ms
  // Verify it renders (basic smoke test — speed is internal implementation detail)
  expect(screen.getByTestId('narrative-text')).toBeDefined()
})
```

- [ ] **Step 3: Modify NarrativeDisplay.tsx**

In `src/components/game/NarrativeDisplay.tsx`:

Replace the hardcoded constant:
```ts
// Remove: const CHAR_INTERVAL = 40
// Add import:
import { useSettingsStore } from '@/store/settingsStore'
```

Inside the component, read the setting:
```ts
const narrativeSpeed = useSettingsStore(s => s.settings.display.narrativeSpeed)
```

In the `useEffect` that does the typewriter tick, replace `CHAR_INTERVAL` with `narrativeSpeed`:
```ts
intervalRef.current = setInterval(() => {
  // ...
}, narrativeSpeed)
```

Add `narrativeSpeed` to the useEffect dependency array.

- [ ] **Step 4: Run NarrativeDisplay tests**

Run: `npx vitest run tests/components/game/NarrativeDisplay.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/game/NarrativeDisplay.tsx tests/components/game/NarrativeDisplay.test.tsx
git commit -m "feat: NarrativeDisplay reads speed from settingsStore"
```

---

### Task 9: SettingsModal Component

**Files:**
- Create: `src/components/game/SettingsModal.tsx`
- Create: `tests/components/game/SettingsModal.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// tests/components/game/SettingsModal.test.tsx
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SettingsModal } from '@/components/game/SettingsModal'
import { useSettingsStore } from '@/store/settingsStore'
import { DEFAULT_SETTINGS } from '@/types/settings'

const storage: Record<string, string> = {}
vi.stubGlobal('localStorage', {
  getItem: (key: string) => storage[key] ?? null,
  setItem: (key: string, value: string) => { storage[key] = value },
  removeItem: (key: string) => { delete storage[key] },
})

describe('SettingsModal', () => {
  beforeEach(() => {
    Object.keys(storage).forEach(k => delete storage[k])
    useSettingsStore.setState({ settings: structuredClone(DEFAULT_SETTINGS) })
  })

  it('does not render when closed', () => {
    const { container } = render(<SettingsModal open={false} onClose={vi.fn()} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders three tabs', () => {
    render(<SettingsModal open={true} onClose={vi.fn()} />)
    expect(screen.getByText('AI 模型')).toBeDefined()
    expect(screen.getByText('显示')).toBeDefined()
    expect(screen.getByText('游戏')).toBeDefined()
  })

  it('AI tab shows provider select and API key input', () => {
    render(<SettingsModal open={true} onClose={vi.fn()} />)
    expect(screen.getByLabelText('AI 服务商')).toBeDefined()
    expect(screen.getByLabelText('API Key')).toBeDefined()
  })

  it('changing provider updates settings', async () => {
    const user = userEvent.setup()
    render(<SettingsModal open={true} onClose={vi.fn()} />)

    const select = screen.getByLabelText('AI 服务商')
    await user.selectOptions(select, 'anthropic')

    expect(useSettingsStore.getState().settings.ai.provider).toBe('anthropic')
  })

  it('display tab shows narrative speed slider and font size', async () => {
    const user = userEvent.setup()
    render(<SettingsModal open={true} onClose={vi.fn()} />)

    await user.click(screen.getByText('显示'))

    expect(screen.getByLabelText('叙事速度')).toBeDefined()
    expect(screen.getByLabelText('字体大小')).toBeDefined()
  })

  it('gameplay tab shows auto-save toggle', async () => {
    const user = userEvent.setup()
    render(<SettingsModal open={true} onClose={vi.fn()} />)

    await user.click(screen.getByText('游戏'))

    expect(screen.getByLabelText('自动存档')).toBeDefined()
  })

  it('toggling auto-save updates settings', async () => {
    const user = userEvent.setup()
    render(<SettingsModal open={true} onClose={vi.fn()} />)

    await user.click(screen.getByText('游戏'))
    const toggle = screen.getByLabelText('自动存档')
    await user.click(toggle)

    expect(useSettingsStore.getState().settings.gameplay.autoSave).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/components/game/SettingsModal.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement SettingsModal**

```tsx
// src/components/game/SettingsModal.tsx
'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { useSettingsStore } from '@/store/settingsStore'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

type Tab = 'ai' | 'display' | 'gameplay'

const TAB_LABELS: Record<Tab, string> = {
  ai: 'AI 模型',
  display: '显示',
  gameplay: '游戏',
}

function AITab() {
  const ai = useSettingsStore(s => s.settings.ai)
  const updateAI = useSettingsStore(s => s.updateAI)
  const [showKey, setShowKey] = useState(false)

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="provider" className="mb-1 block text-xs text-[var(--pixel-text-dim)]">
          AI 服务商
        </label>
        <select
          id="provider"
          aria-label="AI 服务商"
          className="pixel-border-light w-full bg-[var(--pixel-bg-light)] px-3 py-2 text-sm text-[var(--pixel-text)]"
          value={ai.provider}
          onChange={e => updateAI({ provider: e.target.value as 'openai' | 'anthropic' | 'deepseek' })}
        >
          <option value="openai">OpenAI</option>
          <option value="anthropic">Anthropic (Claude)</option>
          <option value="deepseek">DeepSeek</option>
        </select>
      </div>

      <div>
        <label htmlFor="apiKey" className="mb-1 block text-xs text-[var(--pixel-text-dim)]">
          API Key
        </label>
        <div className="flex gap-2">
          <input
            id="apiKey"
            aria-label="API Key"
            type={showKey ? 'text' : 'password'}
            className="pixel-border-light flex-1 bg-[var(--pixel-bg-light)] px-3 py-2 text-sm text-[var(--pixel-text)]"
            value={ai.apiKey}
            onChange={e => updateAI({ apiKey: e.target.value })}
            placeholder="sk-..."
          />
          <button
            className="pixel-btn px-2 py-1 text-xs"
            onClick={() => setShowKey(!showKey)}
          >
            {showKey ? '隐藏' : '显示'}
          </button>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs text-[var(--pixel-text-dim)]">模型覆盖（留空用默认）</p>
        {(['world', 'event', 'npc', 'narrative'] as const).map(agent => (
          <div key={agent} className="mb-2">
            <label htmlFor={`model-${agent}`} className="mb-1 block text-[10px] text-[var(--pixel-text-dim)]">
              {agent}
            </label>
            <input
              id={`model-${agent}`}
              type="text"
              className="pixel-border-light w-full bg-[var(--pixel-bg-light)] px-2 py-1 text-xs text-[var(--pixel-text)]"
              value={ai.modelOverrides[agent] ?? ''}
              onChange={e => updateAI({
                modelOverrides: { ...ai.modelOverrides, [agent]: e.target.value || undefined },
              })}
              placeholder={`例: ${ai.provider}:model-id`}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

function DisplayTab() {
  const display = useSettingsStore(s => s.settings.display)
  const updateDisplay = useSettingsStore(s => s.updateDisplay)

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="narrativeSpeed" className="mb-1 block text-xs text-[var(--pixel-text-dim)]">
          叙事速度
        </label>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-[var(--pixel-text-dim)]">快</span>
          <input
            id="narrativeSpeed"
            aria-label="叙事速度"
            type="range"
            min={10}
            max={100}
            step={5}
            value={display.narrativeSpeed}
            onChange={e => updateDisplay({ narrativeSpeed: Number(e.target.value) })}
            className="flex-1"
          />
          <span className="text-[10px] text-[var(--pixel-text-dim)]">慢</span>
          <span className="w-10 text-right text-xs text-[var(--pixel-text)]">{display.narrativeSpeed}ms</span>
        </div>
      </div>

      <div>
        <label htmlFor="fontSize" className="mb-1 block text-xs text-[var(--pixel-text-dim)]">
          字体大小
        </label>
        <select
          id="fontSize"
          aria-label="字体大小"
          className="pixel-border-light w-full bg-[var(--pixel-bg-light)] px-3 py-2 text-sm text-[var(--pixel-text)]"
          value={display.fontSize}
          onChange={e => updateDisplay({ fontSize: e.target.value as 'small' | 'medium' | 'large' })}
        >
          <option value="small">小</option>
          <option value="medium">中</option>
          <option value="large">大</option>
        </select>
      </div>
    </div>
  )
}

function GameplayTab() {
  const gameplay = useSettingsStore(s => s.settings.gameplay)
  const updateGameplay = useSettingsStore(s => s.updateGameplay)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label htmlFor="autoSave" className="text-sm text-[var(--pixel-text)]">
          自动存档
        </label>
        <input
          id="autoSave"
          aria-label="自动存档"
          type="checkbox"
          checked={gameplay.autoSave}
          onChange={e => updateGameplay({ autoSave: e.target.checked })}
          className="h-4 w-4"
        />
      </div>
    </div>
  )
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('ai')

  return (
    <Modal open={open} onClose={onClose} title="设置">
      <div className="mb-4 flex gap-2">
        {(Object.entries(TAB_LABELS) as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            className={`pixel-btn px-3 py-1 text-xs ${activeTab === key ? 'bg-[var(--pixel-accent)] text-[var(--pixel-bg)]' : ''}`}
            onClick={() => setActiveTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'ai' && <AITab />}
      {activeTab === 'display' && <DisplayTab />}
      {activeTab === 'gameplay' && <GameplayTab />}
    </Modal>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/components/game/SettingsModal.test.tsx`
Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/game/SettingsModal.tsx tests/components/game/SettingsModal.test.tsx
git commit -m "feat: add SettingsModal component with AI, display, and gameplay tabs"
```

---

### Task 10: Entry Points — Main Menu & TopStatusBar

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/components/game/TopStatusBar.tsx`

- [ ] **Step 1: Modify page.tsx — add settings button**

In `src/app/page.tsx`:

Add import:
```tsx
import { SettingsModal } from '@/components/game/SettingsModal'
import { useSettingsStore } from '@/store/settingsStore'
```

Add state and effect inside `LandingPage`:
```tsx
const [showSettings, setShowSettings] = useState(false)

// Load settings from localStorage on mount
useEffect(() => {
  useSettingsStore.getState().loadSettings()
}, [])
```

Change the existing React import from `import { useState } from 'react'` to:
```tsx
import { useState, useEffect } from 'react'
```

Add the settings button after the "读取存档" button:
```tsx
<PixelButton onClick={() => setShowSettings(true)}>
  设置
</PixelButton>
```

Add the modal before the closing `</div>` of the hidden div:
```tsx
{showSettings && (
  <SettingsModal
    open={showSettings}
    onClose={() => setShowSettings(false)}
  />
)}
```

- [ ] **Step 2: Modify TopStatusBar.tsx — add gear button**

In `src/components/game/TopStatusBar.tsx`:

Add imports:
```tsx
import { useState } from 'react'
import { SettingsModal } from '@/components/game/SettingsModal'
```

Add state inside `TopStatusBar`:
```tsx
const [showSettings, setShowSettings] = useState(false)
```

Add gear button next to the save button:
```tsx
<button
  className="pixel-btn px-2 py-0.5 text-xs"
  onClick={() => setShowSettings(true)}
>
  ⚙
</button>
```

Add the modal at the end of the component return, before the closing `</div>`:
```tsx
{showSettings && (
  <SettingsModal
    open={showSettings}
    onClose={() => setShowSettings(false)}
  />
)}
```

- [ ] **Step 3: Run existing TopStatusBar tests to verify no regression**

Run: `npx vitest run tests/components/game/TopStatusBar.test.tsx`
Expected: existing tests still PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx src/components/game/TopStatusBar.tsx
git commit -m "feat: add settings entry points in main menu and TopStatusBar"
```

---

### Task 11: Font Size on StoryPanel

**Files:**
- Modify: `src/components/game/StoryPanel.tsx`

- [ ] **Step 1: Modify StoryPanel to apply fontSize class**

In `src/components/game/StoryPanel.tsx`:

Add import:
```tsx
import { useSettingsStore } from '@/store/settingsStore'
```

Inside `StoryPanel`, read fontSize:
```tsx
const fontSize = useSettingsStore(s => s.settings.display.fontSize)

const fontSizeClass = {
  small: 'text-xs',
  medium: 'text-sm',
  large: 'text-base',
}[fontSize]
```

Apply the class on the container div:
```tsx
return (
  <div data-testid="story-panel" className={`p-4 ${fontSizeClass}`}>
    <NarrativeDisplay segments={segments} onComplete={handleComplete} />
  </div>
)
```

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run`
Expected: all tests PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/game/StoryPanel.tsx
git commit -m "feat: StoryPanel applies fontSize setting from settingsStore"
```

---

### Task 12: Final Verification

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: all tests PASS

- [ ] **Step 2: Run TypeScript type check**

Run: `npx tsc --noEmit`
Expected: no type errors

- [ ] **Step 3: Run dev server smoke test**

Run: `npx next dev` — verify the app loads, settings button appears on the main menu, and clicking it opens the modal.

- [ ] **Step 4: Final commit if any fixups needed**
