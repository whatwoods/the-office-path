# Integration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the game engine (Plan 1), AI agent pipeline (Plan 2), and frontend UI (Plan 3) into a working end-to-end game loop, fixing data flow gaps, engine bugs, and API inconsistencies.

**Architecture:** The frontend store (`useGameStore`) sends requests to Next.js API routes, which call AI orchestration pipelines that run engine functions + AI agents. The store must consume the full API response (not just `state` and `narrative`) to populate UI components like QuarterTransition, EventPopup, CriticalChoices, and PerformancePopup.

**Tech Stack:** Next.js 16 App Router, React 19, Zustand, Vitest, existing game engine + AI agents from Plans 1-2.

---

## File Structure

```
src/
  store/
    gameStore.ts                    — 修改：新增 criticalChoices、currentEvent 等字段 + 增强 actions + resignStartup
  app/
    api/game/
      new/route.ts                  — 修改：调用 AI 生成开场叙事 + 初始 choices
      turn/route.ts                 — 修改：统一响应格式，移除冗余字段
      resign/route.ts               — 新建：辞职创业路由（调用 transitionToPhase2 + AI 生成选择）
    game/page.tsx                   — 修改：接入 QuarterTransition、EventPopup、PerformancePopup
  components/game/
    PerformancePopup.tsx            — 新建：绩效弹窗组件
    ActionBar.tsx                   — 修改：CriticalChoices 从 store 读 choices + resign_startup 用 resignStartup()
  engine/
    critical-day.ts                 — 修改：stamina 硬编码 → staminaPerDay
  ai/orchestration/
    quarterly.ts                    — 修改：phone message 去重 + 手机回复上下文传递
    critical.ts                     — 修改：手机回复上下文传递
tests/
  integration/
    quarterly-flow.test.ts          — 新建：季度集成测试
    critical-flow.test.ts           — 新建：关键期集成测试
    new-game-flow.test.ts           — 新建：新游戏集成测试
    resign-flow.test.ts             — 新建：辞职创业集成测试
  components/game/
    PerformancePopup.test.tsx       — 新建：绩效弹窗测试
  ai/orchestration/
    quarterly-phone-context.test.ts — 新建：手机回复上下文测试
```

---

## Chunk 1: Engine Fixes + Store Enhancement

### Task 1: Fix Critical Day Stamina Hardcode

**Files:**
- Modify: `src/engine/critical-day.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/engine/critical-day-stamina.test.ts
import { describe, expect, it } from 'vitest'
import { settleCriticalDay } from '@/engine/critical-day'
import { createNewGame } from '@/engine/state'
import type { CriticalChoice } from '@/types/actions'

describe('settleCriticalDay stamina reset', () => {
  it('resets stamina to staminaPerDay, not hardcoded 3', () => {
    const state = createNewGame()
    // Override to critical mode with staminaPerDay = 5
    state.timeMode = 'critical'
    state.criticalPeriod = {
      type: 'project_sprint',
      currentDay: 1,
      maxDays: 5,
      staminaPerDay: 5,
    }
    state.staminaRemaining = 5

    const choice: CriticalChoice = {
      choiceId: 'test',
      label: '测试',
      staminaCost: 1,
      effects: {},
      category: '测试',
    }

    const result = settleCriticalDay(state, choice)

    // Should not be complete (day 1 of 5)
    expect(result.isComplete).toBe(false)
    // Stamina should reset to staminaPerDay (5), not hardcoded 3
    expect(result.state.staminaRemaining).toBe(5)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project engine tests/engine/critical-day-stamina.test.ts`
Expected: FAIL — `expected 5, received 3`

- [ ] **Step 3: Fix the hardcoded stamina**

In `src/engine/critical-day.ts`, change line 55:

```typescript
// Before:
    newState.staminaRemaining = 3;
// After:
    newState.staminaRemaining = newState.criticalPeriod!.staminaPerDay;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project engine tests/engine/critical-day-stamina.test.ts`
Expected: PASS

- [ ] **Step 5: Run all engine tests**

Run: `npx vitest run --project engine`
Expected: All engine tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/engine/critical-day.ts tests/engine/critical-day-stamina.test.ts
git commit -m "fix: use staminaPerDay instead of hardcoded 3 in critical day reset"
```

---

### Task 2: Phone Message Dedup

**Files:**
- Modify: `src/ai/orchestration/quarterly.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/ai/orchestration/quarterly-dedup.test.ts
import { describe, expect, it } from 'vitest'

// Test the dedup helper directly
import { deduplicateMessages } from '@/ai/orchestration/quarterly'
import type { PhoneApp } from '@/types/game'

describe('deduplicateMessages', () => {
  it('removes duplicate messages by app+sender+content', () => {
    const messages: Array<{ app: PhoneApp; content: string; sender?: string }> = [
      { app: 'xiaoxin', content: '你好', sender: '张伟' },
      { app: 'xiaoxin', content: '你好', sender: '张伟' },
      { app: 'xiaoxin', content: '不同内容', sender: '张伟' },
      { app: 'maimai', content: '你好', sender: '张伟' },
    ]

    const result = deduplicateMessages(messages)
    expect(result).toHaveLength(3)
  })

  it('keeps messages with different senders', () => {
    const messages: Array<{ app: PhoneApp; content: string; sender?: string }> = [
      { app: 'xiaoxin', content: '你好', sender: '张伟' },
      { app: 'xiaoxin', content: '你好', sender: '李雪' },
    ]

    const result = deduplicateMessages(messages)
    expect(result).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project engine tests/ai/orchestration/quarterly-dedup.test.ts`
Expected: FAIL — function not found

- [ ] **Step 3: Add dedup function and apply it**

In `src/ai/orchestration/quarterly.ts`, add the helper function (before `runQuarterlyPipeline`):

```typescript
export function deduplicateMessages(
  messages: Array<{ app: PhoneApp; content: string; sender?: string }>,
): Array<{ app: PhoneApp; content: string; sender?: string }> {
  const seen = new Set<string>()
  return messages.filter((m) => {
    const key = `${m.app}:${m.sender ?? ""}:${m.content}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
```

Then update the phone message section (around line 121-138) to use it:

```typescript
  const allMessages = deduplicateMessages([
    ...eventOutput.phoneMessages,
    ...npcOutput.chatMessages.map((message) => ({
      app: message.app,
      content: message.content,
      sender: message.sender,
    })),
  ]);

  for (const message of allMessages) {
    settledState.phoneMessages.push(
      createPhoneMessage(settledState.currentQuarter, message),
    );
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project engine tests/ai/orchestration/quarterly-dedup.test.ts`
Expected: 2 tests PASS

- [ ] **Step 5: Run all engine tests**

Run: `npx vitest run --project engine`
Expected: All PASS

- [ ] **Step 6: Commit**

```bash
git add src/ai/orchestration/quarterly.ts tests/ai/orchestration/quarterly-dedup.test.ts
git commit -m "feat: add phone message deduplication in quarterly pipeline"
```

---

### Task 3: Simplify API Response Format

**Files:**
- Modify: `src/app/api/game/turn/route.ts`

- [ ] **Step 1: Update quarterly response**

Replace the quarterly response section (lines 62-72) in `src/app/api/game/turn/route.ts`:

```typescript
    const result = await runQuarterlyPipeline(state, body.plan);
    return Response.json({
      success: true,
      state: result.state,
      narrative: result.narrative,
      events: result.events,
      performanceRating: result.performanceRating ?? null,
      salaryChange: result.salaryChange ?? null,
    });
```

This removes `worldContext`, `npcActions`, `phoneMessages` (already merged into state by the pipeline).

- [ ] **Step 2: Update critical response**

Replace the critical response section (lines 44-51):

```typescript
      const result = await runCriticalDayPipeline(state, body.choice);
      return Response.json({
        success: true,
        state: result.state,
        narrative: result.narrative,
        nextChoices: result.nextChoices ?? [],
        isComplete: result.isComplete,
      });
```

This removes `npcActions` and ensures `nextChoices` is always an array (empty on last day).

- [ ] **Step 3: Commit**

```bash
git add src/app/api/game/turn/route.ts
git commit -m "feat: simplify /api/game/turn response, remove redundant fields"
```

---

### Task 4: Enhance Game Store

**Files:**
- Modify: `src/store/gameStore.ts`
- Modify: `tests/store/gameStore.test.ts`

- [ ] **Step 1: Write tests for new store behavior**

Add these tests to `tests/store/gameStore.test.ts` (append to the existing `describe` block):

```typescript
  it('submitQuarter stores events and triggers transition', async () => {
    const mockState = createNewGame()
    useGameStore.setState({ state: mockState })

    const returnedState = { ...mockState, currentQuarter: 1 }
    const testEvent = {
      type: 'deadline',
      title: '项目紧急',
      description: '需要加班',
      severity: 'medium' as const,
      triggersCritical: true,
    }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        state: returnedState,
        narrative: '这个季度...',
        events: [testEvent],
        performanceRating: null,
        salaryChange: null,
      }),
    })

    const plan = { actions: [{ action: 'work_hard' as const }] }
    await useGameStore.getState().submitQuarter(plan)

    const store = useGameStore.getState()
    expect(store.showQuarterTransition).toBe(true)
    expect(store.currentEvent).toEqual(testEvent)
    expect(store.narrativeQueue).toContain('这个季度...')
  })

  it('submitQuarter stores performance when present', async () => {
    const mockState = createNewGame()
    useGameStore.setState({ state: mockState })

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        state: mockState,
        narrative: '评审季度...',
        events: [],
        performanceRating: 'A',
        salaryChange: 5000,
      }),
    })

    const plan = { actions: [{ action: 'work_hard' as const }] }
    await useGameStore.getState().submitQuarter(plan)

    expect(useGameStore.getState().lastPerformance).toEqual({
      rating: 'A',
      salaryChange: 5000,
    })
  })

  it('submitChoice stores nextChoices from API', async () => {
    const mockState = createNewGame()
    mockState.timeMode = 'critical'
    mockState.criticalPeriod = {
      type: 'onboarding',
      currentDay: 1,
      maxDays: 5,
      staminaPerDay: 3,
    }
    useGameStore.setState({ state: mockState })

    const nextChoices = [
      { choiceId: 'c1', label: '选择A', staminaCost: 1, effects: {}, category: '学习' },
      { choiceId: 'c2', label: '选择B', staminaCost: 1, effects: {}, category: '社交' },
    ]
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        state: { ...mockState, criticalPeriod: { ...mockState.criticalPeriod!, currentDay: 2 } },
        narrative: '第一天...',
        nextChoices,
        isComplete: false,
      }),
    })

    const choice = { choiceId: 'test', label: '测试', staminaCost: 1, effects: {}, category: '测试' }
    await useGameStore.getState().submitChoice(choice)

    expect(useGameStore.getState().criticalChoices).toEqual(nextChoices)
  })

  it('submitChoice clears criticalChoices when complete', async () => {
    const mockState = createNewGame()
    mockState.timeMode = 'critical'
    mockState.criticalPeriod = {
      type: 'onboarding',
      currentDay: 5,
      maxDays: 5,
      staminaPerDay: 3,
    }
    useGameStore.setState({ state: mockState, criticalChoices: [
      { choiceId: 'old', label: '旧选择', staminaCost: 1, effects: {}, category: '测试' },
    ] })

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        state: { ...mockState, timeMode: 'quarterly', criticalPeriod: null },
        narrative: '关键期结束...',
        nextChoices: [],
        isComplete: true,
      }),
    })

    const choice = { choiceId: 'last', label: '最后', staminaCost: 1, effects: {}, category: '测试' }
    await useGameStore.getState().submitChoice(choice)

    expect(useGameStore.getState().criticalChoices).toEqual([])
    expect(useGameStore.getState().showQuarterTransition).toBe(true)
  })

  it('dismissQuarterTransition clears flag', () => {
    useGameStore.setState({ showQuarterTransition: true })
    useGameStore.getState().dismissQuarterTransition()
    expect(useGameStore.getState().showQuarterTransition).toBe(false)
  })

  it('dismissEvent clears current event', () => {
    useGameStore.setState({ currentEvent: { type: 'test', title: 'T', description: 'D', severity: 'low' as const, triggersCritical: false } })
    useGameStore.getState().dismissEvent()
    expect(useGameStore.getState().currentEvent).toBeNull()
  })

  it('dismissPerformance clears last performance', () => {
    useGameStore.setState({ lastPerformance: { rating: 'A', salaryChange: 5000 } })
    useGameStore.getState().dismissPerformance()
    expect(useGameStore.getState().lastPerformance).toBeNull()
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run --project ui tests/store/gameStore.test.ts`
Expected: FAIL — new fields/actions don't exist yet

- [ ] **Step 3: Add new fields to store interface**

In `src/store/gameStore.ts`, update the `GameStore` interface to add new fields:

```typescript
import type { GameEvent } from '@/types/events'

// Add to interface GameStore, after existing UI state fields:
  criticalChoices: CriticalChoice[]
  currentEvent: GameEvent | null
  showQuarterTransition: boolean
  lastPerformance: { rating: string; salaryChange: number } | null

// Add to interface GameStore, in Actions section:
  dismissQuarterTransition: () => void
  dismissEvent: () => void
  dismissPerformance: () => void
```

- [ ] **Step 4: Add new initial values**

In the `create<GameStore>` call, add initial values after existing ones:

```typescript
  criticalChoices: [],
  currentEvent: null,
  showQuarterTransition: false,
  lastPerformance: null,
```

- [ ] **Step 5: Update submitQuarter action**

Replace the existing `submitQuarter` implementation. First add the import at the top of the file:

```typescript
import { saveGame } from '@/save/storage'
```

Then replace `submitQuarter`:

```typescript
  submitQuarter: async (plan: QuarterPlan) => {
    const { state } = get()
    if (!state) return
    set({ isLoading: true, error: null })
    try {
      const res = await fetch('/api/game/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state, plan }),
      })
      const data = await res.json()
      if (!res.ok) {
        set({ error: data.error ?? '提交失败', isLoading: false })
        return
      }
      // Find first critical-triggering event
      const criticalEvent = (data.events ?? []).find(
        (e: GameEvent) => e.triggersCritical,
      )
      set({
        state: data.state,
        isLoading: false,
        narrativeQueue: data.narrative ? [data.narrative] : [],
        showQuarterTransition: true,
        currentEvent: criticalEvent ?? null,
        lastPerformance: data.performanceRating
          ? { rating: data.performanceRating, salaryChange: data.salaryChange ?? 0 }
          : null,
      })
      // Auto-save after quarter
      saveGame(data.state, 'auto')
      // Refresh promotion info
      get().refreshState()
    } catch {
      set({ error: '网络错误', isLoading: false })
    }
  },
```

- [ ] **Step 6: Update submitChoice action**

Replace the existing `submitChoice` implementation:

```typescript
  submitChoice: async (choice: CriticalChoice) => {
    const { state } = get()
    if (!state) return
    set({ isLoading: true, error: null })
    try {
      const res = await fetch('/api/game/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state, choice }),
      })
      const data = await res.json()
      if (!res.ok) {
        set({ error: data.error ?? '提交失败', isLoading: false })
        return
      }
      set({
        state: data.state,
        isLoading: false,
        narrativeQueue: data.narrative ? [data.narrative] : [],
        criticalChoices: data.nextChoices ?? [],
        showQuarterTransition: data.isComplete ? true : false,
      })
    } catch {
      set({ error: '网络错误', isLoading: false })
    }
  },
```

- [ ] **Step 7: Add dismiss actions**

Add after `clearError`:

```typescript
  dismissQuarterTransition: () => set({ showQuarterTransition: false }),
  dismissEvent: () => set({ currentEvent: null }),
  dismissPerformance: () => set({ lastPerformance: null }),
```

- [ ] **Step 8: Update beforeEach in tests to include new fields**

Update the `beforeEach` in `tests/store/gameStore.test.ts` to reset the new fields:

```typescript
  beforeEach(() => {
    useGameStore.setState({
      state: null,
      isLoading: false,
      error: null,
      activePanel: 'attributes',
      activePhoneApp: null,
      showSaveModal: false,
      narrativeQueue: [],
      promotionInfo: null,
      criticalChoices: [],
      currentEvent: null,
      showQuarterTransition: false,
      lastPerformance: null,
    })
    mockFetch.mockReset()
    Object.keys(storage).forEach(k => delete storage[k])
  })
```

- [ ] **Step 9: Run tests to verify they pass**

Run: `npx vitest run --project ui tests/store/gameStore.test.ts`
Expected: All tests PASS (existing + 7 new)

- [ ] **Step 10: Commit**

```bash
git add src/store/gameStore.ts tests/store/gameStore.test.ts
git commit -m "feat: enhance game store with criticalChoices, events, transitions, and performance data"
```

---

## Chunk 2: API Enhancement + UI Wiring

### Task 5: Enhance /api/game/new

**Files:**
- Modify: `src/app/api/game/new/route.ts`

- [ ] **Step 1: Update route to generate opening narrative and choices**

The new game starts in `timeMode: 'critical'` (onboarding), so the API needs to provide an opening narrative and the first day's choices.

```typescript
// src/app/api/game/new/route.ts
import { createNewGame } from "@/engine/state";
import { runNarrativeAgent } from "@/ai/agents/narrative";
import { validateChoices } from "@/ai/orchestration/conflict";
import type { CriticalPeriodType } from "@/types/game";

export async function POST() {
  try {
    const state = createNewGame();

    // Generate opening narrative and first day's choices
    const narrativeOutput = await runNarrativeAgent(
      {
        state,
        recentHistory: [],
      },
      { economy: "stable", trends: ["AI热潮"], companyStatus: "stable", newsItems: [] },
      { events: [], phoneMessages: [] },
      { npcActions: [], chatMessages: [], newNPCs: [], departedNPCs: [] },
      [],
      true,       // isCriticalPeriod
      undefined,  // playerContext
      true,       // generateChoices
    );

    const choices = state.criticalPeriod
      ? validateChoices(
          narrativeOutput.choices ?? [],
          state.staminaRemaining,
          state.criticalPeriod.type as CriticalPeriodType,
          state.player,
        )
      : [];

    return Response.json({
      success: true,
      state,
      narrative: narrativeOutput.narrative,
      criticalChoices: choices,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Update store's newGame to handle enhanced response**

In `src/store/gameStore.ts`, update the `newGame` action:

```typescript
  newGame: async () => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch('/api/game/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (!res.ok) {
        set({ error: data.error ?? '创建游戏失败', isLoading: false })
        return
      }
      set({
        state: data.state,
        isLoading: false,
        narrativeQueue: data.narrative ? [data.narrative] : [],
        criticalChoices: data.criticalChoices ?? [],
        showQuarterTransition: true,
      })
    } catch {
      set({ error: '网络错误', isLoading: false })
    }
  },
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/game/new/route.ts src/store/gameStore.ts
git commit -m "feat: enhance /api/game/new with opening narrative and initial choices"
```

---

### Task 6: PerformancePopup Component

**Files:**
- Create: `src/components/game/PerformancePopup.tsx`
- Create: `tests/components/game/PerformancePopup.test.tsx`

- [ ] **Step 1: Write the test**

```tsx
// tests/components/game/PerformancePopup.test.tsx
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PerformancePopup } from '@/components/game/PerformancePopup'

describe('PerformancePopup', () => {
  it('renders performance rating and salary change', () => {
    render(
      <PerformancePopup
        rating="A"
        salaryChange={5000}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByText('A')).toBeDefined()
    expect(screen.getByText(/\+5,000/)).toBeDefined()
  })

  it('renders negative salary change in red', () => {
    render(
      <PerformancePopup
        rating="C"
        salaryChange={-3000}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByText('C')).toBeDefined()
    expect(screen.getByText(/-3,000/)).toBeDefined()
  })

  it('calls onClose when dismiss button clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <PerformancePopup
        rating="B+"
        salaryChange={0}
        onClose={onClose}
      />,
    )

    await user.click(screen.getByText('确认'))
    expect(onClose).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project ui tests/components/game/PerformancePopup.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement PerformancePopup**

```tsx
// src/components/game/PerformancePopup.tsx
'use client'

import { Modal } from '@/components/ui/Modal'
import { PixelButton } from '@/components/ui/PixelButton'
import type { PerformanceRating } from '@/types/game'

interface PerformancePopupProps {
  rating: PerformanceRating
  salaryChange: number
  onClose: () => void
}

const RATING_COLORS: Record<string, string> = {
  S: 'text-[var(--pixel-gold)]',
  A: 'text-[var(--pixel-green)]',
  'B+': 'text-[var(--pixel-blue)]',
  B: 'text-[var(--pixel-text)]',
  C: 'text-[var(--pixel-red)]',
}

export function PerformancePopup({ rating, salaryChange, onClose }: PerformancePopupProps) {
  const salaryText = salaryChange >= 0
    ? `+${salaryChange.toLocaleString('zh-CN')}`
    : salaryChange.toLocaleString('zh-CN')

  return (
    <Modal open={true} onClose={onClose} title="季度绩效">
      <div className="text-center">
        <p className="text-xs text-[var(--pixel-text-dim)]">绩效评级</p>
        <p className={`text-4xl pixel-glow mt-2 ${RATING_COLORS[rating] ?? 'text-[var(--pixel-text)]'}`}>
          {rating}
        </p>

        {salaryChange !== 0 && (
          <div className="mt-4">
            <p className="text-xs text-[var(--pixel-text-dim)]">薪资调整</p>
            <p className={`text-lg mt-1 ${salaryChange > 0 ? 'text-[var(--pixel-green)]' : 'text-[var(--pixel-red)]'}`}>
              ¥{salaryText}
            </p>
          </div>
        )}

        <div className="mt-6">
          <PixelButton onClick={onClose}>确认</PixelButton>
        </div>
      </div>
    </Modal>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project ui tests/components/game/PerformancePopup.test.tsx`
Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/game/PerformancePopup.tsx tests/components/game/PerformancePopup.test.tsx
git commit -m "feat: add PerformancePopup component for quarterly review display"
```

---

### Task 7: Wire GamePage with Transitions, Events, Performance

**Files:**
- Modify: `src/app/game/page.tsx`

- [ ] **Step 1: Update GamePage to render QuarterTransition, EventPopup, PerformancePopup**

```tsx
// src/app/game/page.tsx
'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useGameStore } from '@/store/gameStore'
import { TopStatusBar } from '@/components/game/TopStatusBar'
import { ErrorBanner } from '@/components/game/ErrorBanner'
import { StoryPanel } from '@/components/game/StoryPanel'
import { DashboardPanel } from '@/components/game/DashboardPanel'
import { ActionBar } from '@/components/game/ActionBar'
import { SaveModal } from '@/components/game/SaveModal'
import { QuarterTransition } from '@/components/game/QuarterTransition'
import { EventPopup } from '@/components/game/EventPopup'
import { PerformancePopup } from '@/components/game/PerformancePopup'

export default function GamePage() {
  const router = useRouter()
  const state = useGameStore(s => s.state)
  const showSaveModal = useGameStore(s => s.showSaveModal)
  const setShowSaveModal = useGameStore(s => s.setShowSaveModal)
  const showQuarterTransition = useGameStore(s => s.showQuarterTransition)
  const dismissQuarterTransition = useGameStore(s => s.dismissQuarterTransition)
  const currentEvent = useGameStore(s => s.currentEvent)
  const dismissEvent = useGameStore(s => s.dismissEvent)
  const lastPerformance = useGameStore(s => s.lastPerformance)
  const dismissPerformance = useGameStore(s => s.dismissPerformance)

  useEffect(() => {
    if (!state) {
      router.push('/')
    }
  }, [state, router])

  if (!state) return null

  return (
    <div className="flex min-h-screen flex-col bg-[var(--pixel-bg)]">
      {/* 小屏幕提示 */}
      <div className="block min-[1024px]:hidden p-8 text-center text-[var(--pixel-text-amber)]">
        请使用电脑访问
      </div>

      <div className="hidden min-[1024px]:flex min-h-screen flex-col">
        <TopStatusBar />
        <ErrorBanner />

        {/* 主区域：故事区 70% + 仪表盘 30% */}
        <div className="flex flex-1 overflow-hidden">
          <div className="w-[70%] overflow-y-auto p-4">
            <StoryPanel />
          </div>
          <div className="w-[30%] border-l-4 border-[var(--pixel-border)] overflow-y-auto">
            <DashboardPanel />
          </div>
        </div>

        {/* 底部行动区 */}
        <ActionBar />
      </div>

      {/* Overlays */}
      {showQuarterTransition && (
        <QuarterTransition
          quarter={state.currentQuarter}
          criticalPeriod={state.criticalPeriod}
          onComplete={dismissQuarterTransition}
        />
      )}

      {currentEvent && (
        <EventPopup
          event={currentEvent}
          onConfirm={dismissEvent}
        />
      )}

      {lastPerformance && (
        <PerformancePopup
          rating={lastPerformance.rating}
          salaryChange={lastPerformance.salaryChange}
          onClose={dismissPerformance}
        />
      )}

      <SaveModal
        open={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        mode="full"
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/game/page.tsx
git commit -m "feat: wire GamePage with QuarterTransition, EventPopup, and PerformancePopup"
```

---

### Task 8: Wire ActionBar CriticalChoices from Store

**Files:**
- Modify: `src/components/game/ActionBar.tsx`

- [ ] **Step 1: Update ActionBar to read criticalChoices from store**

In `src/components/game/ActionBar.tsx`, add the store selector:

```typescript
  const criticalChoices = useGameStore(s => s.criticalChoices)
```

Then replace the `CriticalChoices` render to use it:

```tsx
          {isCritical && state.criticalPeriod ? (
            <CriticalChoices
              choices={criticalChoices}
              staminaRemaining={state.staminaRemaining}
              staminaPerDay={state.criticalPeriod.staminaPerDay}
              currentDay={state.criticalPeriod.currentDay}
              maxDays={state.criticalPeriod.maxDays}
              onChoose={handleChoose}
            />
          ) : (
```

The only change is `choices={criticalChoices}` instead of `choices={[]}`.

- [ ] **Step 2: Commit**

```bash
git add src/components/game/ActionBar.tsx
git commit -m "feat: wire CriticalChoices to read AI-generated choices from store"
```

---

### Task 9: resign_startup Route and Store Action

**Files:**
- Create: `src/app/api/game/resign/route.ts`
- Modify: `src/store/gameStore.ts`
- Modify: `src/components/game/ActionBar.tsx`

- [ ] **Step 1: Create the resign API route**

```typescript
// src/app/api/game/resign/route.ts
import { transitionToPhase2, canStartup } from "@/engine/phase-transition";
import { runNarrativeAgent } from "@/ai/agents/narrative";
import { validateChoices } from "@/ai/orchestration/conflict";
import type { CriticalPeriodType } from "@/types/game";

export async function POST(request: Request) {
  try {
    const { state } = await request.json();

    if (!canStartup(state.job.level)) {
      return Response.json(
        { success: false, error: "当前职级不满足创业条件" },
        { status: 400 },
      );
    }

    const newState = transitionToPhase2(state);

    // Generate startup narrative and first day choices
    const narrativeOutput = await runNarrativeAgent(
      { state: newState, recentHistory: [] },
      { economy: "stable", trends: [], companyStatus: "stable", newsItems: [] },
      { events: [], phoneMessages: [] },
      { npcActions: [], chatMessages: [], newNPCs: [], departedNPCs: [] },
      [],
      true,       // isCriticalPeriod
      undefined,  // playerContext
      true,       // generateChoices
    );

    const choices = newState.criticalPeriod
      ? validateChoices(
          narrativeOutput.choices ?? [],
          newState.staminaRemaining,
          newState.criticalPeriod.type as CriticalPeriodType,
          newState.player,
        )
      : [];

    return Response.json({
      success: true,
      state: newState,
      narrative: narrativeOutput.narrative,
      criticalChoices: choices,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Add resignStartup action to store**

In `src/store/gameStore.ts`, add to the interface:

```typescript
  resignStartup: () => Promise<void>
```

Add the implementation:

```typescript
  resignStartup: async () => {
    const { state } = get()
    if (!state) return
    set({ isLoading: true, error: null })
    try {
      const res = await fetch('/api/game/resign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state }),
      })
      const data = await res.json()
      if (!res.ok) {
        set({ error: data.error ?? '创业失败', isLoading: false })
        return
      }
      set({
        state: data.state,
        isLoading: false,
        narrativeQueue: data.narrative ? [data.narrative] : [],
        criticalChoices: data.criticalChoices ?? [],
        showQuarterTransition: true,
      })
    } catch {
      set({ error: '网络错误', isLoading: false })
    }
  },
```

- [ ] **Step 3: Update ActionBar resign_startup handler**

In `src/components/game/ActionBar.tsx`, replace the resign_startup `submitChoice()` call:

```typescript
  const resignStartup = useGameStore(s => s.resignStartup)

  // In the resign_startup button onClick handler:
  const handleResign = async () => {
    if (window.confirm('确定辞职创业？此操作不可逆')) {
      await resignStartup()
    }
  }
```

Replace the existing `onClick` that calls `submitChoice(...)` with `onClick={handleResign}`.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/game/resign/route.ts src/store/gameStore.ts src/components/game/ActionBar.tsx
git commit -m "feat: add /api/game/resign route and resignStartup store action for Phase 2 transition"
```

---

### Task 10: Phone Reply Context in AI Pipeline

**Files:**
- Modify: `src/ai/orchestration/quarterly.ts`
- Modify: `src/ai/orchestration/critical.ts`

- [ ] **Step 1: Write the test**

```typescript
// tests/ai/orchestration/quarterly-phone-context.test.ts
import { describe, expect, it } from 'vitest'

// Test the context builder helper
import { buildPhoneReplyContext } from '@/ai/orchestration/quarterly'
import type { PhoneMessage } from '@/types/game'

describe('buildPhoneReplyContext', () => {
  it('formats recent phone replies into context string', () => {
    const messages: PhoneMessage[] = [
      { id: '1', app: 'xiaoxin', sender: '张伟', content: '要一起吃饭吗？', read: true, quarter: 0, selectedReply: '好啊' },
      { id: '2', app: 'xiaoxin', sender: '李雪', content: '项目进展如何？', read: true, quarter: 0 },
      { id: '3', app: 'maimai', sender: '匿名', content: '有人了解星辰互联吗？', read: true, quarter: 0, selectedReply: '挺好的' },
    ]

    const context = buildPhoneReplyContext(messages)
    expect(context).toContain('张伟')
    expect(context).toContain('好啊')
    expect(context).toContain('匿名')
    expect(context).toContain('挺好的')
    // Message without selectedReply should not appear
    expect(context).not.toContain('李雪')
  })

  it('returns undefined when no replies exist', () => {
    const messages: PhoneMessage[] = [
      { id: '1', app: 'xiaoxin', sender: '张伟', content: '你好', read: true, quarter: 0 },
    ]

    const context = buildPhoneReplyContext(messages)
    expect(context).toBeUndefined()
  })

  it('limits to last 5 replies', () => {
    const messages: PhoneMessage[] = Array.from({ length: 8 }, (_, i) => ({
      id: String(i),
      app: 'xiaoxin' as const,
      sender: `NPC${i}`,
      content: `消息${i}`,
      read: true,
      quarter: 0,
      selectedReply: `回复${i}`,
    }))

    const context = buildPhoneReplyContext(messages)!
    // Should only contain last 5 (NPC3-NPC7)
    expect(context).not.toContain('NPC0')
    expect(context).toContain('NPC7')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project engine tests/ai/orchestration/quarterly-phone-context.test.ts`
Expected: FAIL — function not found

- [ ] **Step 3: Add helper and wire into quarterly pipeline**

In `src/ai/orchestration/quarterly.ts`, add the exported helper (before `runQuarterlyPipeline`):

```typescript
export function buildPhoneReplyContext(
  messages: PhoneMessage[],
): string | undefined {
  const replies = messages
    .filter((m): m is PhoneMessage & { selectedReply: string } => !!m.selectedReply)
    .slice(-5)
    .map((m) => `[${m.app}] ${m.sender}: "${m.content}" → 玩家回复: "${m.selectedReply}"`)
    .join('\n')

  return replies || undefined
}
```

Then update the `runNarrativeAgent` call (around line 140) to pass `playerContext`:

```typescript
  const playerContext = buildPhoneReplyContext(settledState.phoneMessages)

  const narrativeOutput = await runNarrativeAgent(
    agentInput,
    worldOutput,
    eventOutput,
    npcOutput,
    plan.actions,
    false,
    playerContext,
  );
```

Also update the `runNPCAgent` call (around line 87) to pass `playerContext`:

```typescript
  const rawNPCOutput = await runNPCAgent(
    agentInput,
    worldOutput,
    eventOutput,
    plan.actions,
    playerContext,
  );
```

Note: `playerContext` must be computed before both agent calls, so move the `buildPhoneReplyContext` call to before the NPC agent call (around line 85).

- [ ] **Step 4: Wire into critical pipeline**

In `src/ai/orchestration/critical.ts`, add the same context building before the narrative agent call (around line 120):

```typescript
import { buildPhoneReplyContext } from '@/ai/orchestration/quarterly'

// Before the narrativeOutput call:
const phoneContext = buildPhoneReplyContext(settledState.phoneMessages)
// Merge with existing playerContext (critical pipeline already has one for choices)
const fullPlayerContext = [playerContext, phoneContext].filter(Boolean).join('\n\n') || undefined
```

Then pass `fullPlayerContext` instead of `playerContext` to `runNarrativeAgent`.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run --project engine tests/ai/orchestration/quarterly-phone-context.test.ts`
Expected: 3 tests PASS

- [ ] **Step 6: Run all engine tests**

Run: `npx vitest run --project engine`
Expected: All PASS

- [ ] **Step 7: Commit**

```bash
git add src/ai/orchestration/quarterly.ts src/ai/orchestration/critical.ts tests/ai/orchestration/quarterly-phone-context.test.ts
git commit -m "feat: pass phone reply context to narrative and NPC agents"
```

---

## Chunk 3: Integration Tests

### Task 11: Quarterly Flow Integration Test

**Files:**
- Create: `tests/integration/quarterly-flow.test.ts`

- [ ] **Step 1: Write the quarterly integration test**

```typescript
// tests/integration/quarterly-flow.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useGameStore } from '@/store/gameStore'
import { createNewGame } from '@/engine/state'

// Mock fetch to simulate full API response
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Mock localStorage
const storage: Record<string, string> = {}
vi.stubGlobal('localStorage', {
  getItem: (key: string) => storage[key] ?? null,
  setItem: (key: string, value: string) => { storage[key] = value },
  removeItem: (key: string) => { delete storage[key] },
})

describe('Quarterly Flow Integration', () => {
  beforeEach(() => {
    useGameStore.setState({
      state: null,
      isLoading: false,
      error: null,
      activePanel: 'attributes',
      activePhoneApp: null,
      showSaveModal: false,
      narrativeQueue: [],
      promotionInfo: null,
      criticalChoices: [],
      currentEvent: null,
      showQuarterTransition: false,
      lastPerformance: null,
    })
    mockFetch.mockReset()
    Object.keys(storage).forEach(k => delete storage[k])
  })

  it('complete quarterly cycle: submit → narrative + transition + auto-save', async () => {
    // Setup: game in quarterly mode
    const state = createNewGame()
    state.timeMode = 'quarterly'
    state.criticalPeriod = null
    state.staminaRemaining = 10
    useGameStore.setState({ state })

    // Mock API response
    const nextState = { ...state, currentQuarter: 1 }
    mockFetch
      // submitQuarter call
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          state: nextState,
          narrative: '你埋头工作了一个季度。【NPC:王建国】"干得不错。"',
          events: [],
          performanceRating: null,
          salaryChange: null,
        }),
      })
      // refreshState call (auto-triggered)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          state: nextState,
          computed: { promotionEligible: false, promotionNextLevels: [], promotionFailReasons: ['专业不足'] },
        }),
      })

    // Act
    await useGameStore.getState().submitQuarter({ actions: [{ action: 'work_hard' }] })

    // Assert
    const store = useGameStore.getState()

    // State updated
    expect(store.state?.currentQuarter).toBe(1)

    // Narrative queued
    expect(store.narrativeQueue).toHaveLength(1)
    expect(store.narrativeQueue[0]).toContain('埋头工作')

    // Quarter transition triggered
    expect(store.showQuarterTransition).toBe(true)

    // No events → no event popup
    expect(store.currentEvent).toBeNull()

    // No performance this quarter
    expect(store.lastPerformance).toBeNull()

    // Auto-saved
    expect(storage['office_path_save_auto']).toBeDefined()

    // API called correctly
    expect(mockFetch).toHaveBeenCalledTimes(2) // submitQuarter + refreshState
    expect(mockFetch).toHaveBeenCalledWith('/api/game/turn', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('"plan"'),
    }))
  })

  it('performance review quarter: shows rating and salary change', async () => {
    const state = createNewGame()
    state.timeMode = 'quarterly'
    state.criticalPeriod = null
    state.currentQuarter = 3 // Q4 is review quarter
    useGameStore.setState({ state })

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          state: { ...state, currentQuarter: 4 },
          narrative: '绩效评审...',
          events: [],
          performanceRating: 'S',
          salaryChange: 10000,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          state: { ...state, currentQuarter: 4 },
          computed: { promotionEligible: true, promotionNextLevels: ['L2'], promotionFailReasons: [] },
        }),
      })

    await useGameStore.getState().submitQuarter({ actions: [{ action: 'work_hard' }] })

    const store = useGameStore.getState()
    expect(store.lastPerformance).toEqual({ rating: 'S', salaryChange: 10000 })
    expect(store.promotionInfo?.eligible).toBe(true)
  })

  it('event triggers critical period', async () => {
    const state = createNewGame()
    state.timeMode = 'quarterly'
    state.criticalPeriod = null
    useGameStore.setState({ state })

    const criticalEvent = {
      type: 'project_deadline',
      title: '项目冲刺',
      description: '项目要紧急上线',
      severity: 'high',
      triggersCritical: true,
      durationDays: 5,
    }

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          state: { ...state, timeMode: 'critical', criticalPeriod: { type: 'project_sprint', currentDay: 1, maxDays: 5, staminaPerDay: 3 } },
          narrative: '紧急通知...',
          events: [criticalEvent],
          performanceRating: null,
          salaryChange: null,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          state,
          computed: { promotionEligible: false, promotionNextLevels: [], promotionFailReasons: [] },
        }),
      })

    await useGameStore.getState().submitQuarter({ actions: [{ action: 'work_hard' }] })

    const store = useGameStore.getState()
    expect(store.currentEvent).toEqual(criticalEvent)
    expect(store.state?.timeMode).toBe('critical')
  })
})
```

- [ ] **Step 2: Run test**

Run: `npx vitest run --project ui tests/integration/quarterly-flow.test.ts`
Expected: 3 tests PASS

- [ ] **Step 3: Commit**

```bash
git add tests/integration/quarterly-flow.test.ts
git commit -m "test: add quarterly flow integration tests"
```

---

### Task 12: Critical Flow Integration Test

**Files:**
- Create: `tests/integration/critical-flow.test.ts`

- [ ] **Step 1: Write the critical flow integration test**

```typescript
// tests/integration/critical-flow.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useGameStore } from '@/store/gameStore'
import { createNewGame } from '@/engine/state'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

vi.stubGlobal('localStorage', {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
})

describe('Critical Flow Integration', () => {
  beforeEach(() => {
    useGameStore.setState({
      state: null,
      isLoading: false,
      error: null,
      activePanel: 'attributes',
      activePhoneApp: null,
      showSaveModal: false,
      narrativeQueue: [],
      promotionInfo: null,
      criticalChoices: [],
      currentEvent: null,
      showQuarterTransition: false,
      lastPerformance: null,
    })
    mockFetch.mockReset()
  })

  it('critical day: choice → nextChoices stored', async () => {
    const state = createNewGame()
    // Already in critical mode (onboarding)
    const nextChoices = [
      { choiceId: 'day2_a', label: '认真听培训', staminaCost: 1, effects: { statChanges: { professional: 2 } }, category: '学习' },
      { choiceId: 'day2_b', label: '和同事聊天', staminaCost: 1, effects: { npcFavorChanges: { '张伟': 5 } }, category: '社交' },
    ]

    useGameStore.setState({ state, criticalChoices: [
      { choiceId: 'day1_a', label: '自我介绍', staminaCost: 1, effects: {}, category: '社交' },
    ] })

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        state: { ...state, criticalPeriod: { ...state.criticalPeriod!, currentDay: 2 } },
        narrative: '你做了自我介绍...',
        nextChoices,
        isComplete: false,
      }),
    })

    await useGameStore.getState().submitChoice({
      choiceId: 'day1_a', label: '自我介绍', staminaCost: 1, effects: {}, category: '社交',
    })

    const store = useGameStore.getState()
    expect(store.criticalChoices).toEqual(nextChoices)
    expect(store.narrativeQueue).toHaveLength(1)
    expect(store.showQuarterTransition).toBe(false) // Not complete yet
  })

  it('critical period completion: clears choices, triggers transition', async () => {
    const state = createNewGame()
    state.criticalPeriod = { ...state.criticalPeriod!, currentDay: 5, maxDays: 5 }
    useGameStore.setState({ state, criticalChoices: [
      { choiceId: 'last', label: '最后选择', staminaCost: 1, effects: {}, category: '学习' },
    ] })

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        state: { ...state, timeMode: 'quarterly', criticalPeriod: null, staminaRemaining: 10 },
        narrative: '入职第一周结束了...',
        nextChoices: [],
        isComplete: true,
      }),
    })

    await useGameStore.getState().submitChoice({
      choiceId: 'last', label: '最后选择', staminaCost: 1, effects: {}, category: '学习',
    })

    const store = useGameStore.getState()
    expect(store.criticalChoices).toEqual([])
    expect(store.showQuarterTransition).toBe(true) // Transition to quarterly
    expect(store.state?.timeMode).toBe('quarterly')
  })

  it('multi-day critical sequence: day 1 → day 2 → day 3', async () => {
    const state = createNewGame()
    useGameStore.setState({ state })

    // Day 1
    const day2Choices = [
      { choiceId: 'd2a', label: '选项A', staminaCost: 1, effects: {}, category: '学习' },
    ]
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        state: { ...state, criticalPeriod: { ...state.criticalPeriod!, currentDay: 2 } },
        narrative: '第一天...',
        nextChoices: day2Choices,
        isComplete: false,
      }),
    })

    await useGameStore.getState().submitChoice({
      choiceId: 'd1', label: '第一天', staminaCost: 1, effects: {}, category: '学习',
    })
    expect(useGameStore.getState().criticalChoices).toEqual(day2Choices)

    // Day 2
    const day3Choices = [
      { choiceId: 'd3a', label: '第三天选项', staminaCost: 1, effects: {}, category: '学习' },
    ]
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        state: { ...state, criticalPeriod: { ...state.criticalPeriod!, currentDay: 3 } },
        narrative: '第二天...',
        nextChoices: day3Choices,
        isComplete: false,
      }),
    })

    await useGameStore.getState().submitChoice(day2Choices[0])
    expect(useGameStore.getState().criticalChoices).toEqual(day3Choices)
    expect(useGameStore.getState().narrativeQueue).toHaveLength(1) // Only latest
  })
})
```

- [ ] **Step 2: Run test**

Run: `npx vitest run --project ui tests/integration/critical-flow.test.ts`
Expected: 3 tests PASS

- [ ] **Step 3: Commit**

```bash
git add tests/integration/critical-flow.test.ts
git commit -m "test: add critical flow integration tests"
```

---

### Task 13: New Game Flow Integration Test

**Files:**
- Create: `tests/integration/new-game-flow.test.ts`

- [ ] **Step 1: Write the new game flow test**

```typescript
// tests/integration/new-game-flow.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useGameStore } from '@/store/gameStore'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

vi.stubGlobal('localStorage', {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
})

describe('New Game Flow Integration', () => {
  beforeEach(() => {
    useGameStore.setState({
      state: null,
      isLoading: false,
      error: null,
      activePanel: 'attributes',
      activePhoneApp: null,
      showSaveModal: false,
      narrativeQueue: [],
      promotionInfo: null,
      criticalChoices: [],
      currentEvent: null,
      showQuarterTransition: false,
      lastPerformance: null,
    })
    mockFetch.mockReset()
  })

  it('new game: state + narrative + choices + transition', async () => {
    const mockState = {
      version: '1.0',
      phase: 1,
      currentQuarter: 0,
      timeMode: 'critical',
      criticalPeriod: { type: 'onboarding', currentDay: 1, maxDays: 5, staminaPerDay: 3 },
      player: { health: 70, professional: 20, communication: 20, management: 10, network: 10, mood: 60, money: 5000, reputation: 10 },
      job: { companyName: '星辰互联', level: 'L1', salary: 3000, careerPath: 'undecided', quartersAtLevel: 0, totalQuarters: 0 },
      housing: { type: 'shared', hasMortgage: false },
      npcs: [],
      projectProgress: { completed: 0, majorCompleted: 0, currentProgress: 0 },
      performanceWindow: { workActionCount: 0, quartersInWindow: 0, history: [] },
      company: null,
      phoneMessages: [],
      history: [],
      world: { economyCycle: 'stable', industryTrends: [], companyStatus: 'stable' },
      staminaRemaining: 3,
      founderSalary: null,
    }

    const mockChoices = [
      { choiceId: 'intro_a', label: '主动自我介绍', staminaCost: 1, effects: { statChanges: { communication: 2 } }, category: '社交' },
      { choiceId: 'intro_b', label: '安静观察环境', staminaCost: 1, effects: { statChanges: { professional: 1 } }, category: '学习' },
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        state: mockState,
        narrative: '你拖着行李箱来到了星辰互联大厦...',
        criticalChoices: mockChoices,
      }),
    })

    await useGameStore.getState().newGame()

    const store = useGameStore.getState()

    // State set
    expect(store.state).toEqual(mockState)
    expect(store.isLoading).toBe(false)

    // Narrative queued
    expect(store.narrativeQueue).toHaveLength(1)
    expect(store.narrativeQueue[0]).toContain('行李箱')

    // Choices available for critical period
    expect(store.criticalChoices).toEqual(mockChoices)

    // Transition shown
    expect(store.showQuarterTransition).toBe(true)
  })

  it('new game handles API error gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'AI 服务不可用' }),
    })

    await useGameStore.getState().newGame()

    expect(useGameStore.getState().error).toBe('AI 服务不可用')
    expect(useGameStore.getState().state).toBeNull()
    expect(useGameStore.getState().criticalChoices).toEqual([])
  })
})
```

- [ ] **Step 2: Run test**

Run: `npx vitest run --project ui tests/integration/new-game-flow.test.ts`
Expected: 2 tests PASS

- [ ] **Step 3: Run all tests**

Run: `npx vitest run`
Expected: All engine and UI tests PASS

- [ ] **Step 4: Build check**

Run: `npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 5: Commit**

```bash
git add tests/integration/new-game-flow.test.ts
git commit -m "test: add new game flow integration test"
```

---

### Task 14: Resign Flow Integration Test

**Files:**
- Create: `tests/integration/resign-flow.test.ts`

- [ ] **Step 1: Write the resign flow test**

```typescript
// tests/integration/resign-flow.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useGameStore } from '@/store/gameStore'
import { createNewGame } from '@/engine/state'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

vi.stubGlobal('localStorage', {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
})

describe('Resign Flow Integration', () => {
  beforeEach(() => {
    useGameStore.setState({
      state: null,
      isLoading: false,
      error: null,
      activePanel: 'attributes',
      activePhoneApp: null,
      showSaveModal: false,
      narrativeQueue: [],
      promotionInfo: null,
      criticalChoices: [],
      currentEvent: null,
      showQuarterTransition: false,
      lastPerformance: null,
    })
    mockFetch.mockReset()
  })

  it('resignStartup transitions to Phase 2 with choices', async () => {
    const state = createNewGame()
    state.timeMode = 'quarterly'
    state.criticalPeriod = null
    state.job = { ...state.job, level: 'L6_tech' }
    useGameStore.setState({ state })

    const phase2State = {
      ...state,
      phase: 2,
      timeMode: 'critical',
      criticalPeriod: { type: 'startup_launch', currentDay: 1, maxDays: 7, staminaPerDay: 3 },
      company: { stage: 'garage', productQuality: 30, teamSatisfaction: 70 },
      job: { ...state.job, companyName: '我的公司' },
    }
    const mockChoices = [
      { choiceId: 'startup_a', label: '写商业计划', staminaCost: 1, effects: {}, category: '管理' },
      { choiceId: 'startup_b', label: '找联合创始人', staminaCost: 2, effects: {}, category: '社交' },
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        state: phase2State,
        narrative: '你递交了辞呈...',
        criticalChoices: mockChoices,
      }),
    })

    await useGameStore.getState().resignStartup()

    const store = useGameStore.getState()
    expect(store.state?.phase).toBe(2)
    expect(store.state?.timeMode).toBe('critical')
    expect(store.criticalChoices).toEqual(mockChoices)
    expect(store.narrativeQueue).toHaveLength(1)
    expect(store.showQuarterTransition).toBe(true)
  })

  it('resignStartup handles eligibility error', async () => {
    const state = createNewGame()
    state.timeMode = 'quarterly'
    state.criticalPeriod = null
    // L1 is not eligible for startup
    useGameStore.setState({ state })

    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: '当前职级不满足创业条件' }),
    })

    await useGameStore.getState().resignStartup()

    expect(useGameStore.getState().error).toBe('当前职级不满足创业条件')
    expect(useGameStore.getState().state?.phase).toBe(1) // Still phase 1
  })

  it('calls /api/game/resign endpoint', async () => {
    const state = createNewGame()
    state.job = { ...state.job, level: 'L6_tech' }
    useGameStore.setState({ state })

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        state: { ...state, phase: 2 },
        narrative: '创业开始',
        criticalChoices: [],
      }),
    })

    await useGameStore.getState().resignStartup()

    expect(mockFetch).toHaveBeenCalledWith('/api/game/resign', expect.objectContaining({
      method: 'POST',
    }))
  })
})
```

- [ ] **Step 2: Run test**

Run: `npx vitest run --project ui tests/integration/resign-flow.test.ts`
Expected: 3 tests PASS

- [ ] **Step 3: Run all tests and build**

Run: `npx vitest run && npm run build`
Expected: All tests PASS, build succeeds

- [ ] **Step 4: Commit**

```bash
git add tests/integration/resign-flow.test.ts
git commit -m "test: add resign flow integration test and verify full build"
```
