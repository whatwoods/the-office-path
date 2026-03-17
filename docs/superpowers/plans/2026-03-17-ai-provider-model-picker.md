# AI Provider Expansion And Model Picker Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the settings flow so players can choose more AI providers, configure a shared default model plus per-agent overrides, search provider model lists with manual-entry fallback, and get redirected into settings when trying to start a new game without an API key.

**Architecture:** Keep persistence in `settingsStore`, add a shared provider catalog so the runtime and UI agree on provider IDs, labels, and base URLs, and introduce a browser-side model-list helper plus reusable `ModelSearchInput` component. `provider.ts` resolves model choice via `override > defaultModel > provider default`, while the landing page only gates the `/intro` transition and leaves the rest of the app flow unchanged.

**Tech Stack:** Next.js 16, React 19, Zustand, Vitest, Testing Library, AI SDK packages (`@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/deepseek`, add `@ai-sdk/google`)

---

## File Structure

### New files

- `src/ai/providerCatalog.ts`
  Shared provider metadata: provider IDs, labels, runtime mode, default base URLs, model-list mode.
- `src/lib/aiModelList.ts`
  Browser-safe helper for fetching and normalizing model lists from the current provider.
- `src/components/game/ModelSearchInput.tsx`
  Reusable input + suggestion list component for the default model and per-agent overrides.
- `tests/lib/aiModelList.test.ts`
  Unit coverage for OpenAI-compatible fetches, Gemini fetch mapping, and manual fallback behavior.
- `tests/components/game/ModelSearchInput.test.tsx`
  Component coverage for filtering, manual typing, and suggestion selection.

### Modified files

- `package.json`
  Add the Google AI SDK provider dependency.
- `package-lock.json`
  Lockfile update for the new provider package.
- `src/types/settings.ts`
  Extend provider union and AI config schema with `baseUrl` and `defaultModel`.
- `src/store/settingsStore.ts`
  Persist and expose the expanded AI config fields.
- `src/ai/provider.ts`
  Create runtime providers from the catalog and use the new model-resolution priority.
- `src/components/game/SettingsModal.tsx`
  Replace raw model text inputs with `ModelSearchInput`, add new providers, `Base URL`, `defaultModel`, and advanced override section.
- `src/app/page.tsx`
  Block `/intro` navigation and open settings when the API key is blank.
- `tests/store/settingsStore.test.ts`
  Cover new settings fields and `getAIConfig()` output.
- `tests/ai/provider.test.ts`
  Cover new providers, `defaultModel`, `custom` base URL, and provider factory behavior.
- `src/ai/agents/world.ts`
  Pass `baseUrl` through to `getModel(...)`.
- `src/ai/agents/event.ts`
  Pass `baseUrl` through to `getModel(...)`.
- `src/ai/agents/npc.ts`
  Pass `baseUrl` through to `getModel(...)`.
- `src/ai/agents/narrative.ts`
  Pass `baseUrl` through to `getModel(...)`.
- `tests/components/game/SettingsModal.test.tsx`
  Cover custom provider UI, default model input, advanced toggle, and integration with the search input.
- `tests/app/page.test.tsx`
  Cover “new game opens settings when API key is missing”.
- `tests/ai/agents/ai-config.test.ts`
  Confirm agent calls pass the expanded aiConfig through to the runtime layer.
- `tests/store/gameStore.test.ts`
  Confirm request payloads include `baseUrl` and `defaultModel` when configured.

## Chunk 1: Settings Schema And Runtime Foundation

### Task 1: Extend settings types and persisted AI config

**Files:**
- Modify: `src/types/settings.ts`
- Modify: `src/store/settingsStore.ts`
- Modify: `tests/store/settingsStore.test.ts`

- [ ] **Step 1: Write failing store tests for provider expansion and new AI fields**

Append tests to `tests/store/settingsStore.test.ts`:

```ts
it('persists baseUrl and defaultModel for custom providers', () => {
  useSettingsStore.getState().updateAI({
    provider: 'custom',
    apiKey: 'custom-key',
    baseUrl: 'https://example.com/v1',
    defaultModel: 'custom:qwen-plus',
  })

  const { settings } = useSettingsStore.getState()
  expect(settings.ai.provider).toBe('custom')
  expect(settings.ai.baseUrl).toBe('https://example.com/v1')
  expect(settings.ai.defaultModel).toBe('custom:qwen-plus')

  const stored = JSON.parse(storage.office_path_settings)
  expect(stored.ai.baseUrl).toBe('https://example.com/v1')
  expect(stored.ai.defaultModel).toBe('custom:qwen-plus')
})

it('loadSettings deep-merges new AI fields with defaults', () => {
  storage.office_path_settings = JSON.stringify({
    ai: {
      provider: 'siliconflow',
      apiKey: 'sf-key',
      defaultModel: 'siliconflow:deepseek-ai/DeepSeek-V3',
      modelOverrides: {},
    },
  })

  useSettingsStore.getState().loadSettings()

  expect(useSettingsStore.getState().settings.ai.baseUrl).toBe('')
  expect(useSettingsStore.getState().settings.ai.defaultModel)
    .toBe('siliconflow:deepseek-ai/DeepSeek-V3')
})

it('getAIConfig returns baseUrl and defaultModel when apiKey is set', () => {
  useSettingsStore.getState().updateAI({
    provider: 'custom',
    apiKey: 'custom-key',
    baseUrl: 'https://example.com/v1',
    defaultModel: 'custom:qwen-plus',
  })

  expect(useSettingsStore.getState().getAIConfig()).toEqual({
    provider: 'custom',
    apiKey: 'custom-key',
    baseUrl: 'https://example.com/v1',
    defaultModel: 'custom:qwen-plus',
    modelOverrides: {},
  })
})
```

- [ ] **Step 2: Run the store test file and verify it fails for the expected schema mismatch**

Run:

```bash
npx vitest run tests/store/settingsStore.test.ts
```

Expected:
- FAIL because `custom` / `siliconflow` are not in the provider union yet
- FAIL because `baseUrl` and `defaultModel` are missing from `Settings` / `AIConfig`

- [ ] **Step 3: Implement the expanded settings schema and store support**

Update `src/types/settings.ts` so the shared types look like:

```ts
export type AIProvider =
  | 'openai'
  | 'anthropic'
  | 'deepseek'
  | 'siliconflow'
  | 'modelscope'
  | 'bailian'
  | 'longcat'
  | 'gemini'
  | 'custom'

export interface AIConfig {
  provider: AIProvider
  apiKey: string
  baseUrl?: string
  defaultModel?: string
  modelOverrides?: Record<string, string>
}
```

Also update `DEFAULT_SETTINGS.ai`:

```ts
ai: {
  provider: 'openai',
  apiKey: '',
  baseUrl: '',
  defaultModel: '',
  modelOverrides: {},
}
```

Update `src/store/settingsStore.ts` so `getAIConfig()` returns:

```ts
return {
  provider: ai.provider,
  apiKey: ai.apiKey,
  baseUrl: ai.baseUrl,
  defaultModel: ai.defaultModel,
  modelOverrides: ai.modelOverrides,
}
```

- [ ] **Step 4: Re-run the store test file and confirm it passes**

Run:

```bash
npx vitest run tests/store/settingsStore.test.ts
```

Expected:
- PASS

- [ ] **Step 5: Commit the schema/store changes**

```bash
git add src/types/settings.ts src/store/settingsStore.ts tests/store/settingsStore.test.ts
git commit -m "feat: extend AI settings schema for provider model picker"
```

### Task 2: Add shared provider catalog and expand runtime provider resolution

**Files:**
- Create: `src/ai/providerCatalog.ts`
- Modify: `src/ai/provider.ts`
- Modify: `tests/ai/provider.test.ts`
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Write failing runtime tests for new providers and `defaultModel` priority**

Append tests to `tests/ai/provider.test.ts`:

```ts
it('uses defaultModel when no agent override is provided', () => {
  const config: AIConfig = {
    provider: 'siliconflow',
    apiKey: 'sf-key',
    defaultModel: 'siliconflow:Qwen/Qwen2.5-72B-Instruct',
    modelOverrides: {},
  }

  expect(resolveAgentModel('npc', config))
    .toBe('siliconflow:Qwen/Qwen2.5-72B-Instruct')
})

it('creates a custom provider model with dynamic baseUrl', () => {
  const model = getModel('custom:qwen-plus', 'custom-key', 'https://example.com/v1')
  expect(model).toBeDefined()
  expect(model).toHaveProperty('modelId', 'qwen-plus')
})

it('returns a Gemini model for "gemini:gemini-2.5-flash"', () => {
  const model = getModel('gemini:gemini-2.5-flash', 'gm-key')
  expect(model).toBeDefined()
  expect(model).toHaveProperty('modelId', 'gemini-2.5-flash')
})
```

Adjust the existing `getModel()` test helper mocks so each provider factory exposes the passed settings when needed:

```ts
createOpenAI: vi.fn((options = {}) => {
  const provider = (modelId: string) => ({ modelId, provider: options.name ?? 'openai', options })
  return provider
})
```

- [ ] **Step 2: Run the provider test file and verify it fails for missing providers or wrong signature**

Run:

```bash
npx vitest run tests/ai/provider.test.ts
```

Expected:
- FAIL because `gemini` and `custom` are unknown providers
- FAIL because `resolveAgentModel()` ignores `defaultModel`
- FAIL because `getModel()` does not accept a `baseUrl` parameter yet

- [ ] **Step 3: Install the Google provider package before implementing runtime support**

Run:

```bash
npm install @ai-sdk/google
```

Expected:
- `package.json` and `package-lock.json` update successfully

- [ ] **Step 4: Create the shared provider catalog**

Create `src/ai/providerCatalog.ts` with a single source of truth:

```ts
import type { AIProvider } from '@/types/settings'

export interface ProviderCatalogEntry {
  id: AIProvider
  label: string
  runtime: 'openai-compatible' | 'anthropic' | 'gemini'
  modelListMode: 'openai-compatible' | 'gemini' | 'manual'
  defaultBaseUrl?: string
}

export const PROVIDER_CATALOG: Record<AIProvider, ProviderCatalogEntry> = {
  openai: { id: 'openai', label: 'OpenAI', runtime: 'openai-compatible', modelListMode: 'openai-compatible', defaultBaseUrl: 'https://api.openai.com/v1' },
  anthropic: { id: 'anthropic', label: 'Anthropic', runtime: 'anthropic', modelListMode: 'manual' },
  deepseek: { id: 'deepseek', label: 'DeepSeek', runtime: 'openai-compatible', modelListMode: 'openai-compatible', defaultBaseUrl: 'https://api.deepseek.com/v1' },
  siliconflow: { id: 'siliconflow', label: '硅基流动', runtime: 'openai-compatible', modelListMode: 'openai-compatible', defaultBaseUrl: 'https://api.siliconflow.cn/v1' },
  modelscope: { id: 'modelscope', label: '魔搭', runtime: 'openai-compatible', modelListMode: 'openai-compatible', defaultBaseUrl: 'https://api-inference.modelscope.cn/v1' },
  bailian: { id: 'bailian', label: '阿里云百炼', runtime: 'openai-compatible', modelListMode: 'openai-compatible', defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
  longcat: { id: 'longcat', label: '龙猫', runtime: 'openai-compatible', modelListMode: 'openai-compatible', defaultBaseUrl: 'https://api.longcat.chat/v1' },
  gemini: { id: 'gemini', label: 'Gemini', runtime: 'gemini', modelListMode: 'gemini' },
  custom: { id: 'custom', label: '自定义', runtime: 'openai-compatible', modelListMode: 'openai-compatible' },
}
```

- [ ] **Step 5: Update `provider.ts` to use the catalog and new resolution priority**

Implement the runtime shape:

```ts
export type ModelSpec = `${AIProvider}:${string}`

export function getModel(spec: ModelSpec, dynamicApiKey?: string, dynamicBaseUrl?: string) {
  const [providerName, ...rest] = spec.split(':')
  const modelId = rest.join(':')

  if (providerName === 'anthropic') {
    const provider = createAnthropic({ apiKey: dynamicApiKey ?? process.env.ANTHROPIC_API_KEY ?? '' })
    return provider(modelId)
  }

  if (providerName === 'gemini') {
    const provider = createGoogleGenerativeAI({ apiKey: dynamicApiKey ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? '' })
    return provider(modelId)
  }

  const catalog = PROVIDER_CATALOG[providerName as AIProvider]
  const baseURL = dynamicBaseUrl || catalog.defaultBaseUrl
  const provider = createOpenAI({
    apiKey: dynamicApiKey ?? process.env.OPENAI_API_KEY ?? '',
    baseURL,
    name: providerName,
  })
  return provider(modelId)
}

export function resolveAgentModel(agent: keyof typeof AGENT_MODELS, aiConfig?: AIConfig): ModelSpec {
  if (!aiConfig) return AGENT_MODELS[agent]
  const override = aiConfig.modelOverrides?.[agent]
  if (override) return override as ModelSpec
  if (aiConfig.defaultModel) return aiConfig.defaultModel as ModelSpec
  const modelId = DEFAULT_MODELS_BY_PROVIDER[aiConfig.provider][agent]
  return `${aiConfig.provider}:${modelId}` as ModelSpec
}
```

Ensure `custom` uses `aiConfig.baseUrl` when calling `getModel(...)`.

- [ ] **Step 6: Re-run the provider test file and confirm it passes**

Run:

```bash
npx vitest run tests/ai/provider.test.ts
```

Expected:
- PASS

- [ ] **Step 7: Commit the provider foundation**

```bash
git add package.json package-lock.json src/ai/providerCatalog.ts src/ai/provider.ts tests/ai/provider.test.ts
git commit -m "feat: add provider catalog and expanded AI runtime support"
```

### Task 3: Thread expanded aiConfig through agents and request payload expectations

**Files:**
- Modify: `src/ai/agents/world.ts`
- Modify: `src/ai/agents/event.ts`
- Modify: `src/ai/agents/npc.ts`
- Modify: `src/ai/agents/narrative.ts`
- Modify: `tests/ai/agents/ai-config.test.ts`
- Modify: `tests/store/gameStore.test.ts`

- [ ] **Step 1: Write failing tests for `baseUrl` passthrough and expanded request payloads**

Update `tests/ai/agents/ai-config.test.ts` so the shared config uses a custom provider:

```ts
const aiConfig: AIConfig = {
  provider: 'custom',
  apiKey: 'custom-key',
  baseUrl: 'https://example.com/v1',
  defaultModel: 'custom:qwen-plus',
  modelOverrides: {},
}
```

Update the mock:

```ts
resolveAgentModel: vi.fn(() => 'custom:qwen-plus')
```

And change assertions to:

```ts
expect(mockedGetModel).toHaveBeenCalledWith(
  'custom:qwen-plus',
  'custom-key',
  'https://example.com/v1',
)
```

Update `tests/store/gameStore.test.ts` by adding one focused assertion:

```ts
it('newGame includes baseUrl and defaultModel in aiConfig when configured', async () => {
  useSettingsStore.getState().updateAI({
    provider: 'custom',
    apiKey: 'custom-key',
    baseUrl: 'https://example.com/v1',
    defaultModel: 'custom:qwen-plus',
  })

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

  const body = JSON.parse(mockFetch.mock.calls[0][1].body)
  expect(body.aiConfig).toEqual({
    provider: 'custom',
    apiKey: 'custom-key',
    baseUrl: 'https://example.com/v1',
    defaultModel: 'custom:qwen-plus',
    modelOverrides: {},
  })
})
```

- [ ] **Step 2: Run the agent and game-store tests and verify they fail**

Run:

```bash
npx vitest run tests/ai/agents/ai-config.test.ts tests/store/gameStore.test.ts
```

Expected:
- FAIL because agents only pass two arguments to `getModel(...)`
- FAIL because existing request-body expectations do not include `baseUrl` / `defaultModel`

- [ ] **Step 3: Update the agent runtime calls and request-payload expectations**

Change each agent file to pass the third argument:

```ts
model: getModel(
  resolveAgentModel('world', aiConfig),
  aiConfig?.apiKey,
  aiConfig?.baseUrl,
)
```

Update the existing `tests/store/gameStore.test.ts` aiConfig expectations to include:

```ts
baseUrl: '',
defaultModel: '',
```

for the non-custom providers, since `getAIConfig()` now returns those fields too.

- [ ] **Step 4: Re-run the agent and game-store tests and confirm they pass**

Run:

```bash
npx vitest run tests/ai/agents/ai-config.test.ts tests/store/gameStore.test.ts
```

Expected:
- PASS

- [ ] **Step 5: Commit the aiConfig passthrough updates**

```bash
git add src/ai/agents/world.ts src/ai/agents/event.ts src/ai/agents/npc.ts src/ai/agents/narrative.ts tests/ai/agents/ai-config.test.ts tests/store/gameStore.test.ts
git commit -m "test: cover expanded aiConfig runtime payloads"
```

## Chunk 2: Browser Model Fetching And Reusable Input

### Task 4: Build a browser-side model list helper with provider-aware normalization

**Files:**
- Create: `src/lib/aiModelList.ts`
- Create: `tests/lib/aiModelList.test.ts`

- [ ] **Step 1: Write failing tests for OpenAI-compatible and Gemini model fetching**

Create `tests/lib/aiModelList.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchProviderModels } from '@/lib/aiModelList'

describe('fetchProviderModels', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches and normalizes OpenAI-compatible models', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({
        data: [{ id: 'deepseek-chat' }, { id: 'deepseek-reasoner' }],
      }),
    })))

    await expect(fetchProviderModels({
      provider: 'deepseek',
      apiKey: 'dk-key',
      baseUrl: '',
    })).resolves.toEqual([
      { id: 'deepseek-chat', value: 'deepseek:deepseek-chat' },
      { id: 'deepseek-reasoner', value: 'deepseek:deepseek-reasoner' },
    ])
  })

  it('maps Gemini models to provider-prefixed values', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({
        models: [{ name: 'models/gemini-2.5-flash' }],
      }),
    })))

    await expect(fetchProviderModels({
      provider: 'gemini',
      apiKey: 'gm-key',
      baseUrl: '',
    })).resolves.toEqual([
      { id: 'gemini-2.5-flash', value: 'gemini:gemini-2.5-flash' },
    ])
  })

  it('returns an empty list for manual providers', async () => {
    await expect(fetchProviderModels({
      provider: 'anthropic',
      apiKey: 'sk-key',
      baseUrl: '',
    })).resolves.toEqual([])
  })
})
```

- [ ] **Step 2: Run the helper test file and verify it fails because the module does not exist**

Run:

```bash
npx vitest run tests/lib/aiModelList.test.ts
```

Expected:
- FAIL with module-not-found for `@/lib/aiModelList`

- [ ] **Step 3: Implement the model-list helper**

Create `src/lib/aiModelList.ts` with a thin, promise-returning helper:

```ts
import { PROVIDER_CATALOG } from '@/ai/providerCatalog'
import type { AIProvider } from '@/types/settings'

export interface ModelOption {
  id: string
  value: `${AIProvider}:${string}`
}

export async function fetchProviderModels(input: {
  provider: AIProvider
  apiKey: string
  baseUrl: string
}): Promise<ModelOption[]> {
  const catalog = PROVIDER_CATALOG[input.provider]

  if (!input.apiKey || catalog.modelListMode === 'manual') {
    return []
  }

  if (catalog.modelListMode === 'gemini') {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(input.apiKey)}`)
    if (!res.ok) throw new Error('Failed to fetch Gemini models')
    const data = await res.json() as { models?: Array<{ name: string }> }
    return (data.models ?? []).map(model => {
      const id = model.name.replace(/^models\//, '')
      return { id, value: `gemini:${id}` as const }
    })
  }

  const baseUrl = input.provider === 'custom' ? input.baseUrl : (catalog.defaultBaseUrl ?? '')
  if (!baseUrl) return []

  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/models`, {
    headers: { Authorization: `Bearer ${input.apiKey}` },
  })
  if (!res.ok) throw new Error('Failed to fetch provider models')
  const data = await res.json() as { data?: Array<{ id: string }> }
  return (data.data ?? []).map(model => ({
    id: model.id,
    value: `${input.provider}:${model.id}` as const,
  }))
}
```

- [ ] **Step 4: Re-run the helper test file and confirm it passes**

Run:

```bash
npx vitest run tests/lib/aiModelList.test.ts
```

Expected:
- PASS

- [ ] **Step 5: Commit the model-list helper**

```bash
git add src/lib/aiModelList.ts tests/lib/aiModelList.test.ts
git commit -m "feat: add browser model list helper"
```

### Task 5: Create a reusable searchable model input component

**Files:**
- Create: `src/components/game/ModelSearchInput.tsx`
- Create: `tests/components/game/ModelSearchInput.test.tsx`

- [ ] **Step 1: Write failing component tests**

Create `tests/components/game/ModelSearchInput.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ModelSearchInput } from '@/components/game/ModelSearchInput'

const fetchProviderModels = vi.fn()
vi.mock('@/lib/aiModelList', () => ({ fetchProviderModels }))

describe('ModelSearchInput', () => {
  beforeEach(() => {
    fetchProviderModels.mockReset()
  })

  it('allows manual typing when the provider list is unavailable', async () => {
    fetchProviderModels.mockRejectedValueOnce(new Error('no list'))
    const onChange = vi.fn()
    const user = userEvent.setup()

    render(
      <ModelSearchInput
        label="默认模型"
        provider="openai"
        apiKey="sk-key"
        baseUrl=""
        value=""
        onChange={onChange}
      />,
    )

    await user.click(screen.getByLabelText('默认模型'))
    await user.type(screen.getByLabelText('默认模型'), 'gpt-4.1')

    expect(onChange).toHaveBeenLastCalledWith('openai:gpt-4.1')
    expect(screen.getByText('未获取到模型列表，可手动输入')).toBeDefined()
  })

  it('shows matching options after a successful fetch', async () => {
    fetchProviderModels.mockResolvedValueOnce([
      { id: 'gpt-4o-mini', value: 'openai:gpt-4o-mini' },
      { id: 'gpt-4.1', value: 'openai:gpt-4.1' },
    ])
    const onChange = vi.fn()
    const user = userEvent.setup()

    render(
      <ModelSearchInput
        label="默认模型"
        provider="openai"
        apiKey="sk-key"
        baseUrl=""
        value=""
        onChange={onChange}
      />,
    )

    await user.click(screen.getByLabelText('默认模型'))
    await waitFor(() => expect(screen.getByText('gpt-4.1')).toBeDefined())
    await user.type(screen.getByLabelText('默认模型'), '4.1')
    await user.click(screen.getByText('gpt-4.1'))

    expect(onChange).toHaveBeenLastCalledWith('openai:gpt-4.1')
  })
})
```

- [ ] **Step 2: Run the component test file and verify it fails because the component does not exist**

Run:

```bash
npx vitest run tests/components/game/ModelSearchInput.test.tsx
```

Expected:
- FAIL with module-not-found for `@/components/game/ModelSearchInput`

- [ ] **Step 3: Implement the reusable input**

Create `src/components/game/ModelSearchInput.tsx` with:

```tsx
interface ModelSearchInputProps {
  label: string
  provider: AIProvider
  apiKey: string
  baseUrl: string
  value: string
  onChange: (value: string) => void
}
```

Behavior rules:

- `inputValue` shows the raw model ID portion when the stored value starts with `${provider}:`
- `onFocus` lazily loads the provider models
- manual typing always calls `onChange(`${provider}:${typedValue}`)` when `typedValue` is non-empty
- clearing the field calls `onChange('')`
- successful fetch stores the normalized options locally and filters with a case-insensitive `includes`
- failed fetch sets an inline status string but never disables the input

Minimum UI structure:

```tsx
<label htmlFor={inputId}>{label}</label>
<input id={inputId} aria-label={label} ... />
{status && <p>{status}</p>}
{filteredOptions.length > 0 && (
  <ul role="listbox">
    {filteredOptions.map(option => (
      <li key={option.value}>
        <button type="button" onClick={() => onChange(option.value)}>
          {option.id}
        </button>
      </li>
    ))}
  </ul>
)}
```

- [ ] **Step 4: Re-run the component test file and confirm it passes**

Run:

```bash
npx vitest run tests/components/game/ModelSearchInput.test.tsx
```

Expected:
- PASS

- [ ] **Step 5: Commit the reusable input**

```bash
git add src/components/game/ModelSearchInput.tsx tests/components/game/ModelSearchInput.test.tsx
git commit -m "feat: add searchable AI model input component"
```

## Chunk 3: Settings UI Integration And Landing Gate

### Task 6: Integrate new provider fields and model search inputs into `SettingsModal`

**Files:**
- Modify: `src/components/game/SettingsModal.tsx`
- Modify: `tests/components/game/SettingsModal.test.tsx`

- [ ] **Step 1: Write failing modal tests for the expanded AI tab**

Append tests to `tests/components/game/SettingsModal.test.tsx`:

```tsx
it('shows all supported AI providers', () => {
  render(<SettingsModal open={true} onClose={vi.fn()} />)

  const provider = screen.getByLabelText('AI 服务商')
  expect(screen.getByRole('option', { name: '硅基流动' })).toBeDefined()
  expect(screen.getByRole('option', { name: '魔搭' })).toBeDefined()
  expect(screen.getByRole('option', { name: '阿里云百炼' })).toBeDefined()
  expect(screen.getByRole('option', { name: '龙猫' })).toBeDefined()
  expect(screen.getByRole('option', { name: 'Gemini' })).toBeDefined()
  expect(screen.getByRole('option', { name: '自定义' })).toBeDefined()
  expect(provider).toBeDefined()
})

it('shows Base URL when the custom provider is selected', async () => {
  const user = userEvent.setup()
  render(<SettingsModal open={true} onClose={vi.fn()} />)

  await user.selectOptions(screen.getByLabelText('AI 服务商'), 'custom')

  expect(screen.getByLabelText('Base URL')).toBeDefined()
})

it('shows default model and advanced override controls', async () => {
  const user = userEvent.setup()
  render(<SettingsModal open={true} onClose={vi.fn()} />)

  expect(screen.getByLabelText('默认模型')).toBeDefined()
  expect(screen.queryByLabelText('world 模型覆盖')).toBeNull()

  await user.click(screen.getByText('高级设置'))

  expect(screen.getByLabelText('world 模型覆盖')).toBeDefined()
  expect(screen.getByLabelText('narrative 模型覆盖')).toBeDefined()
})
```

- [ ] **Step 2: Run the modal test file and verify it fails for the missing UI**

Run:

```bash
npx vitest run tests/components/game/SettingsModal.test.tsx
```

Expected:
- FAIL because the new provider options, `Base URL`, `默认模型`, and advanced section do not exist yet

- [ ] **Step 3: Replace the raw AI inputs with the new modal layout**

Update `src/components/game/SettingsModal.tsx`:

- import `PROVIDER_CATALOG` and `ModelSearchInput`
- render provider options from the catalog instead of hard-coded three entries
- show `Base URL` only when `ai.provider === 'custom'`
- add `默认模型` above the advanced section
- replace each raw model `<input>` with:

```tsx
<ModelSearchInput
  label="默认模型"
  provider={ai.provider}
  apiKey={ai.apiKey}
  baseUrl={ai.baseUrl ?? ''}
  value={ai.defaultModel ?? ''}
  onChange={value => updateAI({ defaultModel: value })}
/>
```

Advanced overrides:

```tsx
{advancedOpen && (
  <ModelSearchInput
    label="world 模型覆盖"
    provider={ai.provider}
    apiKey={ai.apiKey}
    baseUrl={ai.baseUrl ?? ''}
    value={ai.modelOverrides.world ?? ''}
    onChange={value =>
      updateAI({
        modelOverrides: {
          ...ai.modelOverrides,
          world: value || undefined,
        },
      })
    }
  />
)}
```

- [ ] **Step 4: Re-run the modal test file and confirm it passes**

Run:

```bash
npx vitest run tests/components/game/SettingsModal.test.tsx
```

Expected:
- PASS

- [ ] **Step 5: Commit the modal integration**

```bash
git add src/components/game/SettingsModal.tsx tests/components/game/SettingsModal.test.tsx
git commit -m "feat: expand settings modal with provider model picker"
```

### Task 7: Gate landing-page “new game” behind API key presence

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `tests/app/page.test.tsx`

- [ ] **Step 1: Write failing landing-page tests for the new gate**

Update `tests/app/page.test.tsx`:

```tsx
import { useSettingsStore } from '@/store/settingsStore'
import { DEFAULT_SETTINGS } from '@/types/settings'

beforeEach(() => {
  useSettingsStore.setState({ settings: structuredClone(DEFAULT_SETTINGS) })
})

it('opens settings instead of routing when API key is missing', async () => {
  const user = userEvent.setup()
  render(<LandingPage />)

  await user.click(screen.getByText('新游戏'))

  expect(push).not.toHaveBeenCalled()
  expect(screen.getAllByText('设置').length).toBeGreaterThan(1)
})

it('routes to /intro when API key is present', async () => {
  useSettingsStore.getState().updateAI({ apiKey: 'sk-test-key' })
  const user = userEvent.setup()

  render(<LandingPage />)

  await user.click(screen.getByText('新游戏'))

  expect(push).toHaveBeenCalledWith('/intro')
})
```

- [ ] **Step 2: Run the landing-page test file and verify the new gate test fails**

Run:

```bash
npx vitest run tests/app/page.test.tsx
```

Expected:
- FAIL because the page still always calls `router.push('/intro')`

- [ ] **Step 3: Implement the gate in `src/app/page.tsx`**

Change `handleNewGame`:

```ts
const handleNewGame = () => {
  const { apiKey } = useSettingsStore.getState().settings.ai
  if (!apiKey.trim()) {
    setShowSettings(true)
    return
  }

  router.push('/intro')
}
```

- [ ] **Step 4: Re-run the landing-page test file and confirm it passes**

Run:

```bash
npx vitest run tests/app/page.test.tsx
```

Expected:
- PASS

- [ ] **Step 5: Commit the landing-page gate**

```bash
git add src/app/page.tsx tests/app/page.test.tsx
git commit -m "feat: require AI settings before starting a new game"
```

### Task 8: Run the focused regression suite and verify the full feature slice stays green

**Files:**
- Verify only:
  - `tests/store/settingsStore.test.ts`
  - `tests/ai/provider.test.ts`
  - `tests/ai/agents/ai-config.test.ts`
  - `tests/store/gameStore.test.ts`
  - `tests/lib/aiModelList.test.ts`
  - `tests/components/game/ModelSearchInput.test.tsx`
  - `tests/components/game/SettingsModal.test.tsx`
  - `tests/app/page.test.tsx`

- [ ] **Step 1: Run the focused regression suite**

Run:

```bash
npx vitest run tests/store/settingsStore.test.ts tests/ai/provider.test.ts tests/ai/agents/ai-config.test.ts tests/store/gameStore.test.ts tests/lib/aiModelList.test.ts tests/components/game/ModelSearchInput.test.tsx tests/components/game/SettingsModal.test.tsx tests/app/page.test.tsx
```

Expected:
- PASS
- 0 failed tests

- [ ] **Step 2: Run the full test suite if the focused slice is green**

Run:

```bash
npm test
```

Expected:
- PASS

- [ ] **Step 3: Commit the final integrated feature**

```bash
git add src package.json package-lock.json tests
git commit -m "feat: add AI provider expansion and searchable model picker"
```
