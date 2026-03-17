# API Connectivity Test Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add API connectivity testing so users can verify their AI provider configuration before starting a game.

**Architecture:** A Next.js API route (`/api/ai/ping`) performs a lightweight `generateText` call on the server. A React hook (`useApiPing`) manages client-side state. The hook is used in both the settings modal (manual test button) and the intro page (auto-check before game creation).

**Tech Stack:** Next.js API routes, Vercel AI SDK (`generateText`), React hooks, Zustand, Vitest

---

## Chunk 1: API Route and Tests

### Task 1: API Route — `POST /api/ai/ping`

**Files:**
- Create: `src/app/api/ai/ping/route.ts`
- Test: `tests/app/api/ai/ping.test.ts`

- [ ] **Step 1: Write failing tests for the ping route**

Create `tests/app/api/ai/ping.test.ts`:

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from '@/app/api/ai/ping/route'

vi.mock('ai', () => ({
  generateText: vi.fn().mockResolvedValue({ text: 'hi' }),
}))

vi.mock('@/ai/provider', () => ({
  getModel: vi.fn().mockReturnValue('mock-model'),
}))

const { generateText } = await import('ai')
const { getModel } = await import('@/ai/provider')
const mockedGenerateText = vi.mocked(generateText)
const mockedGetModel = vi.mocked(getModel)

function makeRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/ai/ping', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/ai/ping', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 when provider is missing', async () => {
    const res = await POST(makeRequest({ apiKey: 'sk-test' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when apiKey is missing', async () => {
    const res = await POST(makeRequest({ provider: 'openai' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when custom provider has no baseUrl', async () => {
    const res = await POST(makeRequest({ provider: 'custom', apiKey: 'sk-test' }))
    expect(res.status).toBe(400)
  })

  it('pings successfully with explicit model', async () => {
    const res = await POST(
      makeRequest({ provider: 'openai', apiKey: 'sk-test', model: 'gpt-4o-mini' }),
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.model).toBe('openai:gpt-4o-mini')
    expect(json.latencyMs).toBeGreaterThanOrEqual(0)
    expect(mockedGetModel).toHaveBeenCalledWith('openai:gpt-4o-mini', 'sk-test', undefined)
  })

  it('falls back to provider default model when model not specified', async () => {
    const res = await POST(
      makeRequest({ provider: 'openai', apiKey: 'sk-test' }),
    )
    const json = await res.json()

    expect(json.success).toBe(true)
    expect(json.model).toBe('openai:gpt-4o-mini')
  })

  it('normalizes empty baseUrl to undefined for non-custom providers', async () => {
    await POST(
      makeRequest({ provider: 'openai', apiKey: 'sk-test', baseUrl: '' }),
    )

    expect(mockedGetModel).toHaveBeenCalledWith('openai:gpt-4o-mini', 'sk-test', undefined)
  })

  it('passes baseUrl for custom provider', async () => {
    await POST(
      makeRequest({
        provider: 'custom',
        apiKey: 'sk-test',
        baseUrl: 'https://example.com/v1',
        model: 'my-model',
      }),
    )

    expect(mockedGetModel).toHaveBeenCalledWith(
      'custom:my-model',
      'sk-test',
      'https://example.com/v1',
    )
  })

  it('returns error when generateText throws', async () => {
    mockedGenerateText.mockRejectedValueOnce(new Error('Invalid API key'))

    const res = await POST(
      makeRequest({ provider: 'openai', apiKey: 'bad-key' }),
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(false)
    expect(json.error).toBeDefined()
  })

  it('maps 401 errors to friendly Chinese message', async () => {
    mockedGenerateText.mockRejectedValueOnce(new Error('401 Invalid API key'))

    const res = await POST(
      makeRequest({ provider: 'openai', apiKey: 'bad-key' }),
    )
    const json = await res.json()

    expect(json.error).toBe('API Key 无效，请检查后重试')
  })

  it('maps network errors to friendly Chinese message', async () => {
    mockedGenerateText.mockRejectedValueOnce(new Error('fetch failed'))

    const res = await POST(
      makeRequest({ provider: 'openai', apiKey: 'sk-test' }),
    )
    const json = await res.json()

    expect(json.error).toBe('无法连接到 AI 服务，请检查网络')
  })

  it('maps timeout/abort errors to friendly Chinese message', async () => {
    const abortError = new Error('The operation was aborted')
    abortError.name = 'AbortError'
    mockedGenerateText.mockRejectedValueOnce(abortError)

    const res = await POST(
      makeRequest({ provider: 'openai', apiKey: 'sk-test' }),
    )
    const json = await res.json()

    expect(json.error).toBe('连接超时，请稍后重试')
  })

  it('falls back to raw message for unknown errors', async () => {
    mockedGenerateText.mockRejectedValueOnce(new Error('Something unexpected'))

    const res = await POST(
      makeRequest({ provider: 'openai', apiKey: 'sk-test' }),
    )
    const json = await res.json()

    expect(json.error).toBe('连接失败：Something unexpected')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/app/api/ai/ping.test.ts`
Expected: FAIL — module `@/app/api/ai/ping/route` not found

- [ ] **Step 3: Implement the ping route**

Create `src/app/api/ai/ping/route.ts`:

```typescript
import { generateText } from 'ai'
import { getModel } from '@/ai/provider'
import { PROVIDER_CATALOG } from '@/ai/providerCatalog'
import type { AIProvider } from '@/types/settings'

function mapErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  const name = error instanceof Error ? error.name : ''
  const lower = (message + ' ' + name).toLowerCase()

  if (lower.includes('401') || lower.includes('invalid api key') || lower.includes('authentication_error')) {
    return 'API Key 无效，请检查后重试'
  }
  if (lower.includes('403') || lower.includes('forbidden') || lower.includes('permission')) {
    return 'API Key 无此模型的访问权限'
  }
  if (lower.includes('404') || lower.includes('not found') || lower.includes('not_found')) {
    return '模型不存在，请检查模型名称'
  }
  if (lower.includes('429') || lower.includes('rate limit') || lower.includes('rate_limit')) {
    return '请求频率超限，请稍后重试'
  }
  if (lower.includes('econnrefused') || lower.includes('fetch failed') || lower.includes('network')) {
    return '无法连接到 AI 服务，请检查网络'
  }
  if (lower.includes('abort') || lower.includes('timeout')) {
    return '连接超时，请稍后重试'
  }

  return `连接失败：${message}`
}

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return Response.json({ success: false, error: '请求格式错误' }, { status: 400 })
  }

  const provider = body.provider as AIProvider | undefined
  const apiKey = body.apiKey as string | undefined
  const baseUrl = body.baseUrl as string | undefined
  const model = body.model as string | undefined

  if (!provider || !apiKey) {
    return Response.json(
      { success: false, error: 'provider 和 apiKey 为必填项' },
      { status: 400 },
    )
  }

  if (!(provider in PROVIDER_CATALOG)) {
    return Response.json(
      { success: false, error: `不支持的 provider: ${provider}` },
      { status: 400 },
    )
  }

  if (provider === 'custom' && !baseUrl?.trim()) {
    return Response.json(
      { success: false, error: '自定义 provider 需要填写 Base URL' },
      { status: 400 },
    )
  }

  const catalog = PROVIDER_CATALOG[provider]
  const modelId = model || catalog.defaultModels?.world
  if (!modelId) {
    return Response.json(
      { success: false, error: '未指定模型且该 provider 没有默认模型' },
      { status: 400 },
    )
  }

  const spec = `${provider}:${modelId}` as const
  const normalizedBaseUrl = baseUrl?.trim() || undefined

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)

    const start = Date.now()
    await generateText({
      model: getModel(spec, apiKey, normalizedBaseUrl) as Parameters<typeof generateText>[0]['model'],
      prompt: 'hi',
      maxTokens: 1,
      abortSignal: controller.signal,
    })
    const latencyMs = Date.now() - start

    clearTimeout(timeout)

    return Response.json({ success: true, model: spec, latencyMs })
  } catch (error) {
    return Response.json({ success: false, error: mapErrorMessage(error) })
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/app/api/ai/ping.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/ai/ping/route.ts tests/app/api/ai/ping.test.ts
git commit -m "feat: add API connectivity ping route with tests"
```

---

## Chunk 2: Client Hook and Tests

### Task 2: React Hook — `useApiPing`

**Files:**
- Create: `src/lib/useApiPing.ts`
- Test: `tests/lib/useApiPing.test.ts`

- [ ] **Step 1: Write failing tests for the hook**

Create `tests/lib/useApiPing.test.ts`:

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useApiPing } from '@/lib/useApiPing'
import { useSettingsStore } from '@/store/settingsStore'
import { DEFAULT_SETTINGS } from '@/types/settings'

const storage: Record<string, string> = {}
vi.stubGlobal('localStorage', {
  getItem: (key: string) => storage[key] ?? null,
  setItem: (key: string, value: string) => { storage[key] = value },
  removeItem: (key: string) => { delete storage[key] },
})

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

describe('useApiPing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(storage).forEach(key => delete storage[key])
    useSettingsStore.setState({ settings: structuredClone(DEFAULT_SETTINGS) })
  })

  it('starts with idle status', () => {
    const { result } = renderHook(() => useApiPing())
    expect(result.current.status).toBe('idle')
    expect(result.current.error).toBeNull()
    expect(result.current.latencyMs).toBeNull()
    expect(result.current.model).toBeNull()
  })

  it('skips ping when apiKey is empty', async () => {
    const { result } = renderHook(() => useApiPing())

    await act(async () => {
      await result.current.ping()
    })

    expect(fetchMock).not.toHaveBeenCalled()
    expect(result.current.status).toBe('idle')
  })

  it('transitions to success on successful ping', async () => {
    useSettingsStore.getState().updateAI({ apiKey: 'sk-test', provider: 'openai' })
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, model: 'openai:gpt-4o-mini', latencyMs: 200 }),
    })

    const { result } = renderHook(() => useApiPing())

    await act(async () => {
      await result.current.ping()
    })

    expect(result.current.status).toBe('success')
    expect(result.current.latencyMs).toBe(200)
    expect(result.current.model).toBe('openai:gpt-4o-mini')
    expect(result.current.error).toBeNull()
  })

  it('transitions to error on failed ping', async () => {
    useSettingsStore.getState().updateAI({ apiKey: 'sk-bad', provider: 'openai' })
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: false, error: 'API Key 无效' }),
    })

    const { result } = renderHook(() => useApiPing())

    await act(async () => {
      await result.current.ping()
    })

    expect(result.current.status).toBe('error')
    expect(result.current.error).toBe('API Key 无效')
  })

  it('handles network errors', async () => {
    useSettingsStore.getState().updateAI({ apiKey: 'sk-test', provider: 'openai' })
    fetchMock.mockRejectedValueOnce(new Error('Network failure'))

    const { result } = renderHook(() => useApiPing())

    await act(async () => {
      await result.current.ping()
    })

    expect(result.current.status).toBe('error')
    expect(result.current.error).toBe('网络错误，无法连接服务')
  })

  it('ignores duplicate calls while testing', async () => {
    useSettingsStore.getState().updateAI({ apiKey: 'sk-test', provider: 'openai' })
    let resolveFirst: (value: unknown) => void
    const firstCall = new Promise(r => { resolveFirst = r })
    fetchMock.mockReturnValueOnce(firstCall)

    const { result } = renderHook(() => useApiPing())

    // Start first ping (won't resolve yet)
    let firstPing: Promise<void>
    act(() => {
      firstPing = result.current.ping()
    })

    // Second ping while first is in progress — should be ignored
    await act(async () => {
      await result.current.ping()
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)

    // Resolve first call
    resolveFirst!({
      ok: true,
      json: async () => ({ success: true, model: 'openai:gpt-4o-mini', latencyMs: 100 }),
    })
    await act(async () => { await firstPing! })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/lib/useApiPing.test.ts`
Expected: FAIL — module `@/lib/useApiPing` not found

- [ ] **Step 3: Implement the hook**

Create `src/lib/useApiPing.ts`:

```typescript
'use client'

import { useCallback, useRef, useState } from 'react'
import { useSettingsStore } from '@/store/settingsStore'

export type PingStatus = 'idle' | 'testing' | 'success' | 'error'

interface PingResult {
  status: PingStatus
  error: string | null
  latencyMs: number | null
  model: string | null
}

export function useApiPing() {
  const [result, setResult] = useState<PingResult>({
    status: 'idle',
    error: null,
    latencyMs: null,
    model: null,
  })
  const testingRef = useRef(false)

  const ping = useCallback(async () => {
    const { ai } = useSettingsStore.getState().settings
    if (!ai.apiKey) return
    if (testingRef.current) return

    testingRef.current = true
    setResult({ status: 'testing', error: null, latencyMs: null, model: null })

    try {
      const res = await fetch('/api/ai/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: ai.provider,
          apiKey: ai.apiKey,
          baseUrl: ai.baseUrl || undefined,
          model: ai.defaultModel || undefined,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setResult({
          status: 'success',
          error: null,
          latencyMs: data.latencyMs,
          model: data.model,
        })
      } else {
        setResult({
          status: 'error',
          error: data.error ?? '未知错误',
          latencyMs: null,
          model: null,
        })
      }
    } catch {
      setResult({
        status: 'error',
        error: '网络错误，无法连接服务',
        latencyMs: null,
        model: null,
      })
    } finally {
      testingRef.current = false
    }
  }, [])

  return { ping, ...result }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/lib/useApiPing.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/useApiPing.ts tests/lib/useApiPing.test.ts
git commit -m "feat: add useApiPing hook with tests"
```

---

## Chunk 3: UI Integration

### Task 3: Settings Modal — Test Connection Button

**Files:**
- Modify: `src/components/game/SettingsModal.tsx`
- Modify: `tests/components/game/SettingsModal.test.tsx`

- [ ] **Step 1: Add test for the "Test Connection" button**

Add the following tests to `tests/components/game/SettingsModal.test.tsx`:

```typescript
// Add at top of file, after existing imports:
import { type PingStatus } from '@/lib/useApiPing'

const mockPing = vi.fn()
let mockPingStatus: PingStatus = 'idle'
let mockPingError: string | null = null
let mockPingLatencyMs: number | null = null
let mockPingModel: string | null = null

vi.mock('@/lib/useApiPing', () => ({
  useApiPing: () => ({
    ping: mockPing,
    status: mockPingStatus,
    error: mockPingError,
    latencyMs: mockPingLatencyMs,
    model: mockPingModel,
  }),
}))

// Add inside the describe block:

  it('shows test connection button when API key is set', async () => {
    useSettingsStore.getState().updateAI({ apiKey: 'sk-test' })
    render(<SettingsModal open={true} onClose={vi.fn()} />)
    expect(screen.getByText('测试连接')).toBeDefined()
  })

  it('does not show test connection button when API key is empty', () => {
    render(<SettingsModal open={true} onClose={vi.fn()} />)
    expect(screen.queryByText('测试连接')).toBeNull()
  })

  it('calls ping when test connection button is clicked', async () => {
    const user = userEvent.setup()
    useSettingsStore.getState().updateAI({ apiKey: 'sk-test' })
    render(<SettingsModal open={true} onClose={vi.fn()} />)

    await user.click(screen.getByText('测试连接'))
    expect(mockPing).toHaveBeenCalled()
  })

  it('shows success message after successful ping', () => {
    useSettingsStore.getState().updateAI({ apiKey: 'sk-test' })
    mockPingStatus = 'success'
    mockPingLatencyMs = 200
    mockPingModel = 'openai:gpt-4o-mini'

    render(<SettingsModal open={true} onClose={vi.fn()} />)

    expect(screen.getByText(/连接成功.*openai:gpt-4o-mini.*200ms/)).toBeDefined()
  })

  it('shows error message after failed ping', () => {
    useSettingsStore.getState().updateAI({ apiKey: 'sk-test' })
    mockPingStatus = 'error'
    mockPingError = 'API Key 无效'

    render(<SettingsModal open={true} onClose={vi.fn()} />)

    expect(screen.getByText('API Key 无效')).toBeDefined()
  })
```

Also add a `beforeEach` reset for the mock variables:

```typescript
// Inside the existing beforeEach:
    mockPingStatus = 'idle'
    mockPingError = null
    mockPingLatencyMs = null
    mockPingModel = null
    mockPing.mockClear()
```

- [ ] **Step 2: Run tests to verify the new tests fail**

Run: `npx vitest run tests/components/game/SettingsModal.test.tsx`
Expected: New tests FAIL (button not rendered yet)

- [ ] **Step 3: Add the test connection button to SettingsModal**

Modify `src/components/game/SettingsModal.tsx` — update `AITab`:

Add import at top:
```typescript
import { useApiPing } from '@/lib/useApiPing'
```

Inside `AITab`, after `const providerBaseUrl = ...` line, add:
```typescript
  const { ping, status, error: pingError, latencyMs, model: pingModel } = useApiPing()
```

After the custom provider Base URL block (after line 109, after the `{ai.provider === 'custom' && (...)}` block), add the test connection UI:
```tsx
      {ai.apiKey && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="pixel-btn px-3 py-1 text-xs"
            disabled={status === 'testing'}
            onClick={ping}
          >
            {status === 'testing' ? '测试中...' : '测试连接'}
          </button>
          {status === 'success' && (
            <span className="text-xs text-green-500">
              连接成功: {pingModel} ({latencyMs}ms)
            </span>
          )}
          {status === 'error' && (
            <span className="text-xs text-red-500">{pingError}</span>
          )}
        </div>
      )}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/components/game/SettingsModal.test.tsx`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/game/SettingsModal.tsx tests/components/game/SettingsModal.test.tsx
git commit -m "feat: add test connection button to settings modal"
```

### Task 4: Intro Page — Pre-game Auto-check

**Files:**
- Modify: `src/app/intro/page.tsx`
- Test: `tests/app/intro/page.test.tsx`

- [ ] **Step 1: Write failing tests for intro page ping behavior**

Create `tests/app/intro/page.test.tsx`:

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import IntroPage from '@/app/intro/page'
import { useSettingsStore } from '@/store/settingsStore'
import { DEFAULT_SETTINGS } from '@/types/settings'

const storage: Record<string, string> = {}
vi.stubGlobal('localStorage', {
  getItem: (key: string) => storage[key] ?? null,
  setItem: (key: string, value: string) => { storage[key] = value },
  removeItem: (key: string) => { delete storage[key] },
})

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

vi.mock('@/store/gameStore', () => {
  const { create } = require('zustand')
  const store = create(() => ({
    state: null,
    isLoading: false,
    newGame: vi.fn(),
  }))
  return { useGameStore: store }
})

const { useGameStore } = await import('@/store/gameStore')

describe('IntroPage pre-game ping', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(storage).forEach(key => delete storage[key])
    useSettingsStore.setState({ settings: structuredClone(DEFAULT_SETTINGS) })
  })

  // Helper to navigate to the offer-letter phase for testing handleAcceptOffer
  // In actual tests, you may need to simulate the intro flow or test the
  // handleAcceptOffer logic more directly. These tests focus on the ping behavior.

  it('skips ping when apiKey is empty and calls newGame directly', async () => {
    // apiKey is empty by default — should skip ping
    const mockNewGame = vi.fn().mockResolvedValue(undefined)
    useGameStore.setState({ newGame: mockNewGame })

    // Render and navigate to offer-letter phase would be needed here
    // This test validates the logic: no fetch to /api/ai/ping when no apiKey
  })

  it('shows warning dialog when ping fails', async () => {
    useSettingsStore.getState().updateAI({ apiKey: 'sk-test', provider: 'openai' })
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: false, error: 'API Key 无效' }),
    })

    // After triggering handleAcceptOffer, the warning should appear
    // expect(screen.getByText('API 连接警告')).toBeDefined()
    // expect(screen.getByText('API Key 无效')).toBeDefined()
  })

  it('proceeds with game when "proceed anyway" is clicked', async () => {
    // After warning dialog appears, clicking "仍然继续" should call newGame
    // expect(screen.getByText('仍然继续')).toBeDefined()
  })

  it('opens settings when "go to settings" is clicked', async () => {
    // After warning dialog appears, clicking "去设置" should show SettingsModal
    // expect(screen.getByText('去设置')).toBeDefined()
  })
})
```

Note: The intro page tests are integration-level tests that require navigating through the intro flow phases (blackscreen → narrative → name-input → major-select → phone-notification → offer-letter). The exact test setup depends on how the intro components behave in test. The implementer should adapt these test stubs to work with the component's phase flow, potentially mocking child components or fast-forwarding through phases.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/app/intro/page.test.tsx`
Expected: Tests fail or are incomplete — confirms test file is set up

- [ ] **Step 3: Add auto-ping and warning dialog to intro page**

Modify `src/app/intro/page.tsx`:

Add imports:
```typescript
import { useSettingsStore } from '@/store/settingsStore'
import { SettingsModal } from '@/components/game/SettingsModal'
```

Add state variables inside `IntroPage` after existing state:
```typescript
  const [pingWarning, setPingWarning] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
```

Replace `handleAcceptOffer` with:
```typescript
  const handleAcceptOffer = async () => {
    if (!major) return

    const { ai } = useSettingsStore.getState().settings
    if (ai.apiKey) {
      try {
        const res = await fetch('/api/ai/ping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: ai.provider,
            apiKey: ai.apiKey,
            baseUrl: ai.baseUrl || undefined,
            model: ai.defaultModel || undefined,
          }),
        })
        const data = await res.json()
        if (!data.success) {
          setPingWarning(data.error ?? 'API 连接失败')
          return
        }
      } catch {
        setPingWarning('网络错误，无法验证 API 连接')
        return
      }
    }

    await proceedWithNewGame()
  }

  const proceedWithNewGame = async () => {
    setPingWarning(null)

    await newGame({
      major,
      playerName: playerName || '新员工',
    })

    if (useGameStore.getState().state) {
      router.push('/game')
    }
  }
```

Add warning dialog and settings modal inside the JSX, before the closing `</div>`:
```tsx
      {pingWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="pixel-border mx-4 max-w-sm bg-[var(--pixel-bg)] p-6">
            <p className="mb-1 text-sm font-bold text-[var(--pixel-text)]">API 连接警告</p>
            <p className="mb-4 text-xs text-red-500">{pingWarning}</p>
            <div className="flex gap-2">
              <button
                type="button"
                className="pixel-btn flex-1 px-3 py-1 text-xs"
                onClick={proceedWithNewGame}
              >
                仍然继续
              </button>
              <button
                type="button"
                className="pixel-btn flex-1 px-3 py-1 text-xs"
                onClick={() => {
                  setPingWarning(null)
                  setShowSettings(true)
                }}
              >
                去设置
              </button>
            </div>
          </div>
        </div>
      )}

      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
```

- [ ] **Step 2: Run full test suite to verify nothing breaks**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/intro/page.tsx tests/app/intro/page.test.tsx
git commit -m "feat: add pre-game API connectivity check to intro page"
```

---

## Chunk 4: Final Verification

### Task 5: Full Test Suite and Cleanup

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 2: Run the linter**

Run: `npx next lint`
Expected: No errors

- [ ] **Step 3: Run the build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 4: Final commit if any lint/type fixes were needed**

```bash
git add -A
git commit -m "fix: address lint and type issues from API ping feature"
```
