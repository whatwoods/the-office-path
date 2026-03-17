# Frontend UI Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete frontend UI for "打工之道" — a pixel-retro Chinese workplace simulator with story area, dashboard panels, phone apps, action cards, and save management.

**Architecture:** Single Zustand store manages all game state and UI state. Two pages (`/` landing, `/game` main). GamePage uses a 3-zone layout: story (left 70%), dashboard tabs (right 30%), action bar (bottom fixed). Pixel/retro theme via Tailwind CSS variables + Chinese pixel font. All phone apps share a common framework component with per-app content renderers. Store must also persist `criticalChoices` and `currentEvent`, because `/api/game/new`, `/api/game/turn`, and `/api/game/resign` now return UI-driving payloads that cannot be derived from `state` alone.

**Tech Stack:** Next.js 16 App Router, React 19, Zustand, Tailwind CSS v4, Vitest + React Testing Library (jsdom), existing game engine + save system from Plan 1.

---

## File Structure

```
src/
  app/
    api/
      game/
        new/route.ts             — 修改：返回 opening narrative + criticalChoices
        turn/route.ts            — 修改：季度响应补充 criticalChoices
        resign/route.ts          — 新建：辞职创业专用 route
    page.tsx                    — LandingPage（改写现有文件）
    layout.tsx                  — 根布局（改写：加载像素字体，更新 metadata）
    globals.css                 — 像素风主题 CSS 变量（改写）
    game/
      page.tsx                  — GamePage 入口（新建）
  ai/
    schemas.ts                  — 修改：同步 PhoneMessage / GameEvent schema
    orchestration/
      phone-context.ts          — 新建：提取最近手机回复作为 AI 上下文
  components/
    ui/
      PixelButton.tsx           — 像素风按钮基础组件
      PixelProgressBar.tsx      — 像素分段进度条
      PixelCard.tsx             — 像素风卡片容器
      Modal.tsx                 — 通用 Modal 组件
    game/
      TopStatusBar.tsx          — 顶部状态栏
      ErrorBanner.tsx           — 错误提示横幅
      StoryPanel.tsx            — 故事区容器
      NarrativeDisplay.tsx      — 打字机叙事渲染
      EventPopup.tsx            — 事件弹窗
      QuarterTransition.tsx     — 季度过渡动画
      DashboardPanel.tsx        — 右侧仪表盘容器
      PanelTabs.tsx             — 标签切换
      AttributesTab.tsx         — 属性面板
      CompanyStats.tsx          — Phase 2 公司属性折叠区
      RelationshipsTab.tsx      — 关系面板
      PhoneTab.tsx              — 手机面板入口
      PhoneAppGrid.tsx          — App 图标网格
      PhoneAppView.tsx          — App 内容容器（通用框架）
      phone/
        XiaoxinApp.tsx          — 小信（聊天气泡）
        MaimaiApp.tsx           — 麦麦（论坛帖子）
        JinritiaotiaoApp.tsx    — 今日条条（新闻卡片）
        ZhifubeiApp.tsx         — 支付呗（收支流水）
        HrzhipinApp.tsx         — BOSS真聘（职位卡片）
        GenericMessageApp.tsx   — 通用消息流（饱了吗等5个App共用）
      ActionBar.tsx             — 行动区容器
      QuarterlyActions.tsx      — 季度行动卡片
      CriticalChoices.tsx       — 关键期选择卡片
      SubmitButton.tsx          — 提交按钮
      SaveModal.tsx             — 存档管理弹窗
  store/
    gameStore.ts                — Zustand store
  lib/
    narrative.ts                — 叙事文本解析工具（分段、NPC对话识别）
  types/
    game.ts                     — 修改：PhoneMessage 添加 replyOptions/selectedReply
    events.ts                   — 修改：GameEvent 添加 criticalType
public/
  fonts/
    zpix.woff2                  — 像素字体文件
tests/
  ai/
    orchestration/
      phone-context.test.ts
  app/
    api/
      game/
        new.test.ts
        turn.test.ts
        resign.test.ts
  components/
    ui/
      PixelProgressBar.test.tsx — 进度条渲染测试
    game/
      TopStatusBar.test.tsx
      NarrativeDisplay.test.tsx
      AttributesTab.test.tsx
      RelationshipsTab.test.tsx
      PhoneTab.test.tsx
      QuarterlyActions.test.tsx
      CriticalChoices.test.tsx
      SaveModal.test.tsx
  store/
    gameStore.test.ts
  lib/
    narrative.test.ts
```

**Modifications to existing files:**
- `package.json` — Add `zustand` dependency, `@testing-library/user-event` devDependency
- `vitest.config.ts` — Replace with `vitest.workspace.ts` (dual env: node + jsdom)
- `src/app/layout.tsx` — Replace Geist fonts with Zpix pixel font, update metadata
- `src/app/page.tsx` — Replace boilerplate with LandingPage
- `src/app/globals.css` — Replace with pixel theme CSS variables
- `src/types/game.ts` — Extend `PhoneMessage` with `replyOptions?` and `selectedReply?`
- `src/types/events.ts` — Extend `GameEvent` with `criticalType?`
- `src/ai/schemas.ts` — Keep `PhoneMessageSchema` / `GameEventSchema` in sync with frontend state
- `src/app/api/game/new/route.ts` — Return opening narrative + `criticalChoices` for onboarding bootstrap
- `src/app/api/game/turn/route.ts` — Return `criticalChoices` when quarterly events push the player into a critical period
- `src/ai/orchestration/quarterly.ts` — Enter critical mode from triggering events and surface the entry payload
- `src/ai/orchestration/critical.ts` — Merge phone reply context into the existing `playerContext`

---

## Chunk 1: Foundation

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install zustand and testing utilities**

```bash
npm install zustand
npm install -D @testing-library/user-event
```

- [ ] **Step 2: Verify installation**

Run: `npm ls zustand @testing-library/user-event`
Expected: Both packages listed, no `MISSING` or `ERR`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add zustand and @testing-library/user-event"
```

---

### Task 2: Download Pixel Font

**Files:**
- Create: `public/fonts/zpix.woff2`

- [ ] **Step 1: Download Zpix pixel font**

Download the Zpix font woff2 file from the Zpix GitHub release (https://github.com/SolidZORO/zpix-pixel-font/releases). Place it at `public/fonts/zpix.woff2`.

If curl is available:

```bash
curl -L -o public/fonts/zpix.woff2 "https://github.com/SolidZORO/zpix-pixel-font/releases/download/v3.1.8/zpix.woff2"
```

Verify the file exists:

```bash
ls -la public/fonts/zpix.woff2
```

Expected: File exists, non-zero size

- [ ] **Step 2: Commit**

```bash
git add public/fonts/zpix.woff2
git commit -m "feat: add Zpix pixel font"
```

---

### Task 3: Vitest Workspace Config

**Files:**
- Delete: `vitest.config.ts`
- Create: `vitest.workspace.ts`

- [ ] **Step 1: Replace vitest config with workspace config**

Delete `vitest.config.ts` and create `vitest.workspace.ts`:

```typescript
// vitest.workspace.ts
import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  {
    test: {
      name: 'engine',
      environment: 'node',
      globals: true,
      include: ['tests/**/*.test.ts'],
      exclude: ['tests/components/**', 'tests/store/**', 'tests/lib/**'],
    },
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
  },
  {
    plugins: [react()],
    test: {
      name: 'ui',
      environment: 'jsdom',
      globals: true,
      include: ['tests/**/*.test.tsx', 'tests/store/**/*.test.ts', 'tests/lib/**/*.test.ts'],
    },
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
  },
])
```

- [ ] **Step 2: Verify existing engine tests still pass**

Run: `npx vitest run --project engine`
Expected: All existing engine tests PASS

- [ ] **Step 3: Commit**

```bash
git add vitest.workspace.ts
git rm vitest.config.ts
git commit -m "feat: split vitest into engine (node) and ui (jsdom) workspaces"
```

---

### Task 4: Pixel Theme CSS

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Rewrite globals.css with pixel theme**

```css
/* src/app/globals.css */
@import "tailwindcss";

:root {
  /* 像素风调色板 */
  --pixel-bg: #1a1a2e;
  --pixel-bg-light: #16213e;
  --pixel-bg-panel: #0f3460;
  --pixel-text: #e0e0e0;
  --pixel-text-bright: #00ff88;
  --pixel-text-amber: #ffc107;
  --pixel-text-dim: #888888;
  --pixel-border: #4a4a6a;
  --pixel-border-light: #6a6a8a;
  --pixel-accent: #e94560;
  --pixel-green: #00ff88;
  --pixel-red: #ff4444;
  --pixel-yellow: #ffc107;
  --pixel-blue: #4fc3f7;
  --pixel-gold: #ffd700;

  /* 进度条颜色 */
  --bar-health: #00ff88;
  --bar-professional: #4fc3f7;
  --bar-communication: #ffc107;
  --bar-management: #e94560;
  --bar-network: #bb86fc;
  --bar-mood: #ff9800;
  --bar-reputation: #ffd700;

  /* 好感度分级 */
  --favor-low: #ff4444;
  --favor-mid: #ffc107;
  --favor-high: #00ff88;
  --favor-max: #ffd700;
}

@theme inline {
  --color-background: var(--pixel-bg);
  --color-foreground: var(--pixel-text);
  --font-pixel: var(--font-zpix);
}

body {
  background: var(--pixel-bg);
  color: var(--pixel-text);
  font-family: var(--font-zpix), 'Courier New', monospace;
  image-rendering: pixelated;
}

/* 像素风通用样式 */
.pixel-border {
  border: 4px solid var(--pixel-border);
  border-radius: 0;
  box-shadow:
    4px 4px 0 var(--pixel-border),
    -1px -1px 0 var(--pixel-border-light);
}

.pixel-border-light {
  border: 2px solid var(--pixel-border);
  border-radius: 0;
}

/* CRT 文字发光效果 */
.pixel-glow {
  text-shadow: 0 0 4px currentColor;
}

/* 像素风按钮 */
.pixel-btn {
  border: 4px solid var(--pixel-border);
  border-radius: 0;
  padding: 8px 16px;
  background: var(--pixel-bg-panel);
  color: var(--pixel-text);
  cursor: pointer;
  transition: none;
  image-rendering: pixelated;
}

.pixel-btn:hover {
  background: var(--pixel-border);
  color: var(--pixel-text-bright);
  box-shadow: 4px 4px 0 var(--pixel-bg);
}

.pixel-btn:active {
  box-shadow: none;
  transform: translate(2px, 2px);
}

.pixel-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* 闪烁动画 */
@keyframes flash-green {
  0%, 100% { opacity: 1; }
  50% { background-color: rgba(0, 255, 136, 0.3); }
}

@keyframes flash-red {
  0%, 100% { opacity: 1; }
  50% { background-color: rgba(255, 68, 68, 0.3); }
}

.flash-increase {
  animation: flash-green 0.5s ease-in-out 2;
}

.flash-decrease {
  animation: flash-red 0.5s ease-in-out 2;
}

/* 季度过渡淡出 */
@keyframes fade-out {
  0% { opacity: 1; }
  70% { opacity: 1; }
  100% { opacity: 0; }
}

.quarter-transition {
  animation: fade-out 1.5s ease-in-out forwards;
}
```

- [ ] **Step 2: Verify CSS loads without errors**

Run: `npm run build`
Expected: Build succeeds without CSS-related errors

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add pixel/retro theme CSS variables and utility classes"
```

---

### Task 5: Base UI Components

**Files:**
- Create: `src/components/ui/PixelButton.tsx`
- Create: `src/components/ui/PixelProgressBar.tsx`
- Create: `src/components/ui/PixelCard.tsx`
- Create: `src/components/ui/Modal.tsx`
- Create: `tests/components/ui/PixelProgressBar.test.tsx`

- [ ] **Step 1: Write the PixelProgressBar test**

```tsx
// tests/components/ui/PixelProgressBar.test.tsx
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PixelProgressBar } from '@/components/ui/PixelProgressBar'

describe('PixelProgressBar', () => {
  it('renders correct number of filled segments', () => {
    render(<PixelProgressBar value={73} max={100} label="健康" />)
    expect(screen.getByText('健康')).toBeDefined()
    expect(screen.getByText('73')).toBeDefined()
    // 73/100 = 7.3 → 7 filled segments out of 10
    const segments = screen.getAllByTestId('segment')
    expect(segments).toHaveLength(10)
    const filled = segments.filter(s => s.getAttribute('data-filled') === 'true')
    expect(filled).toHaveLength(7)
  })

  it('renders 0 value correctly', () => {
    render(<PixelProgressBar value={0} max={100} label="声望" />)
    const filled = screen.getAllByTestId('segment').filter(
      s => s.getAttribute('data-filled') === 'true',
    )
    expect(filled).toHaveLength(0)
  })

  it('renders 100 value correctly', () => {
    render(<PixelProgressBar value={100} max={100} label="专业" />)
    const filled = screen.getAllByTestId('segment').filter(
      s => s.getAttribute('data-filled') === 'true',
    )
    expect(filled).toHaveLength(10)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project ui tests/components/ui/PixelProgressBar.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement all base UI components**

```tsx
// src/components/ui/PixelButton.tsx
'use client'

interface PixelButtonProps {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: 'default' | 'danger' | 'accent'
  className?: string
}

export function PixelButton({
  children,
  onClick,
  disabled = false,
  variant = 'default',
  className = '',
}: PixelButtonProps) {
  const variantStyles = {
    default: '',
    danger: 'border-[var(--pixel-red)] text-[var(--pixel-red)]',
    accent: 'border-[var(--pixel-accent)] text-[var(--pixel-accent)]',
  }

  return (
    <button
      className={`pixel-btn ${variantStyles[variant]} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}
```

```tsx
// src/components/ui/PixelProgressBar.tsx
'use client'

interface PixelProgressBarProps {
  value: number
  max: number
  label: string
  color?: string
  className?: string
}

export function PixelProgressBar({
  value,
  max,
  label,
  color = 'var(--pixel-green)',
  className = '',
}: PixelProgressBarProps) {
  const segments = 10
  const filled = Math.floor((value / max) * segments)

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="w-12 text-xs text-[var(--pixel-text-dim)]">{label}</span>
      <div className="flex gap-0.5">
        {Array.from({ length: segments }, (_, i) => (
          <div
            key={i}
            data-testid="segment"
            data-filled={i < filled ? 'true' : 'false'}
            className="h-3 w-3"
            style={{
              backgroundColor: i < filled ? color : 'var(--pixel-bg)',
              border: '1px solid var(--pixel-border)',
            }}
          />
        ))}
      </div>
      <span className="w-8 text-right text-xs text-[var(--pixel-text)]">{value}</span>
    </div>
  )
}
```

```tsx
// src/components/ui/PixelCard.tsx
'use client'

interface PixelCardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  selected?: boolean
}

export function PixelCard({
  children,
  className = '',
  onClick,
  selected = false,
}: PixelCardProps) {
  return (
    <div
      className={`pixel-border p-3 bg-[var(--pixel-bg-light)] ${
        selected ? 'border-[var(--pixel-text-bright)]' : ''
      } ${onClick ? 'cursor-pointer hover:bg-[var(--pixel-bg-panel)]' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
```

```tsx
// src/components/ui/Modal.tsx
'use client'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />
      <div className="pixel-border relative z-10 max-h-[80vh] w-[500px] overflow-y-auto bg-[var(--pixel-bg)] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="pixel-glow text-lg text-[var(--pixel-text-bright)]">{title}</h2>
          <button
            className="pixel-btn px-2 py-1 text-xs"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project ui tests/components/ui/PixelProgressBar.test.tsx`
Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/ tests/components/ui/
git commit -m "feat: add base UI components (PixelButton, PixelProgressBar, PixelCard, Modal)"
```

---

### Task 6: Extend PhoneMessage Type

**Files:**
- Modify: `src/types/game.ts`

- [ ] **Step 1: Add replyOptions and selectedReply to PhoneMessage**

In `src/types/game.ts`, update the `PhoneMessage` interface:

```typescript
export interface PhoneMessage {
  id: string;
  app: PhoneApp;
  sender: string;
  content: string;
  read: boolean;
  quarter: number;
  replyOptions?: string[];
  selectedReply?: string;
}
```

- [ ] **Step 2: Verify existing tests still pass**

Run: `npx vitest run --project engine`
Expected: All engine tests PASS (adding optional fields is backwards-compatible)

- [ ] **Step 3: Commit**

```bash
git add src/types/game.ts
git commit -m "feat: extend PhoneMessage with replyOptions and selectedReply"
```

---

### Task 7: Narrative Parser

**Files:**
- Create: `src/lib/narrative.ts`
- Create: `tests/lib/narrative.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/lib/narrative.test.ts
import { describe, expect, it } from 'vitest'
import { parseNarrative, type NarrativeSegment } from '@/lib/narrative'

describe('parseNarrative', () => {
  it('parses plain text into a single segment', () => {
    const result = parseNarrative('这个季度你埋头苦干。')
    expect(result).toEqual([
      { type: 'text', content: '这个季度你埋头苦干。' },
    ])
  })

  it('parses NPC dialogue markers', () => {
    const input = '你走进办公室。\n【NPC:王建国】"早啊，新来的！"\n你紧张地点了点头。'
    const result = parseNarrative(input)
    expect(result).toEqual([
      { type: 'text', content: '你走进办公室。' },
      { type: 'dialogue', speaker: '王建国', content: '早啊，新来的！' },
      { type: 'text', content: '你紧张地点了点头。' },
    ])
  })

  it('handles multiple consecutive dialogues', () => {
    const input = '【NPC:王建国】"开会了"\n【NPC:张伟】"来了来了"'
    const result = parseNarrative(input)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ type: 'dialogue', speaker: '王建国', content: '开会了' })
    expect(result[1]).toEqual({ type: 'dialogue', speaker: '张伟', content: '来了来了' })
  })

  it('handles text with no dialogues', () => {
    const input = '第一段。\n\n第二段。'
    const result = parseNarrative(input)
    expect(result).toEqual([
      { type: 'text', content: '第一段。' },
      { type: 'text', content: '第二段。' },
    ])
  })

  it('trims empty segments', () => {
    const input = '\n\n你走进去了。\n\n'
    const result = parseNarrative(input)
    expect(result).toEqual([
      { type: 'text', content: '你走进去了。' },
    ])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project ui tests/lib/narrative.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement the parser**

```typescript
// src/lib/narrative.ts
export interface NarrativeSegment {
  type: 'text' | 'dialogue'
  content: string
  speaker?: string
}

const DIALOGUE_REGEX = /^【NPC:(.+?)】[""「](.+?)[""」]$/

export function parseNarrative(raw: string): NarrativeSegment[] {
  const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  const segments: NarrativeSegment[] = []

  for (const line of lines) {
    const match = line.match(DIALOGUE_REGEX)
    if (match) {
      segments.push({
        type: 'dialogue',
        speaker: match[1],
        content: match[2],
      })
    } else {
      segments.push({
        type: 'text',
        content: line,
      })
    }
  }

  return segments
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project ui tests/lib/narrative.test.ts`
Expected: 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/narrative.ts tests/lib/narrative.test.ts
git commit -m "feat: add narrative text parser with NPC dialogue detection"
```

---

### Task 8: Zustand Game Store

**Files:**
- Create: `src/store/gameStore.ts`
- Create: `tests/store/gameStore.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/store/gameStore.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useGameStore } from '@/store/gameStore'
import { createNewGame } from '@/engine/state'

// Mock fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Mock localStorage
const storage: Record<string, string> = {}
vi.stubGlobal('localStorage', {
  getItem: (key: string) => storage[key] ?? null,
  setItem: (key: string, value: string) => { storage[key] = value },
  removeItem: (key: string) => { delete storage[key] },
})

describe('useGameStore', () => {
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
      currentEvent: null,
      criticalChoices: [],
    })
    mockFetch.mockReset()
    Object.keys(storage).forEach(k => delete storage[k])
  })

  it('has correct initial state', () => {
    const store = useGameStore.getState()
    expect(store.state).toBeNull()
    expect(store.isLoading).toBe(false)
    expect(store.activePanel).toBe('attributes')
    expect(store.currentEvent).toBeNull()
    expect(store.criticalChoices).toEqual([])
  })

  it('newGame fetches and stores opening narrative + critical choices', async () => {
    const mockState = createNewGame()
    const openingChoices = [
      {
        choiceId: 'onboarding_d1_a',
        label: '认真听培训',
        staminaCost: 1,
        effects: { statChanges: { professional: 2 } },
        category: '学习',
      },
    ]
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        state: mockState,
        narrative: '入职第一天，你抱着笔记本走进了工位区。',
        criticalChoices: openingChoices,
      }),
    })

    await useGameStore.getState().newGame()

    const store = useGameStore.getState()
    expect(store.state).toEqual(mockState)
    expect(store.narrativeQueue).toEqual(['入职第一天，你抱着笔记本走进了工位区。'])
    expect(store.criticalChoices).toEqual(openingChoices)
    expect(store.isLoading).toBe(false)
    expect(mockFetch).toHaveBeenCalledWith('/api/game/new', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
  })

  it('newGame sets error on failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: '服务器错误' }),
    })

    await useGameStore.getState().newGame()

    expect(useGameStore.getState().error).toBe('服务器错误')
    expect(useGameStore.getState().state).toBeNull()
  })

  it('submitQuarter stores currentEvent and criticalChoices from the API response', async () => {
    const mockState = createNewGame()
    // Put into quarterly mode for testing
    const quarterlyState = {
      ...mockState,
      timeMode: 'quarterly' as const,
      criticalPeriod: null,
      staminaRemaining: 10,
    }
    useGameStore.setState({ state: quarterlyState })

    const returnedState = {
      ...quarterlyState,
      currentQuarter: 2,
      timeMode: 'critical' as const,
      criticalPeriod: {
        type: 'project_sprint' as const,
        currentDay: 1,
        maxDays: 5,
        staminaPerDay: 3,
      },
      staminaRemaining: 3,
    }
    const criticalEvent = {
      type: 'project_deadline',
      title: '大客户项目进入冲刺周',
      description: '老板临时拍板，下周必须交付。',
      severity: 'high' as const,
      triggersCritical: true,
      criticalType: 'project_sprint' as const,
    }
    const nextChoices = [
      {
        choiceId: 'project_sprint_d1_a',
        label: '先拆分任务',
        staminaCost: 1,
        effects: { statChanges: { professional: 1 } },
        category: '协作',
      },
    ]
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        state: returnedState,
        narrative: '这个季度...',
        events: [criticalEvent],
        criticalChoices: nextChoices,
      }),
    })

    const plan = { actions: [{ action: 'work_hard' as const }] }
    await useGameStore.getState().submitQuarter(plan)

    expect(mockFetch).toHaveBeenCalledWith('/api/game/turn', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('"plan"'),
    }))
    expect(useGameStore.getState().state).toEqual(returnedState)
    expect(useGameStore.getState().currentEvent).toEqual(criticalEvent)
    expect(useGameStore.getState().criticalChoices).toEqual(nextChoices)
    // Auto-save should have fired
    expect(storage['office_path_save_auto']).toBeDefined()
  })

  it('submitChoice stores nextChoices for the next critical day', async () => {
    const mockState = createNewGame()
    useGameStore.setState({ state: mockState })

    const returnedState = { ...mockState }
    const nextChoices = [
      {
        choiceId: 'onboarding_d2_a',
        label: '主动认识同组同事',
        staminaCost: 1,
        effects: { statChanges: { communication: 1 } },
        category: '社交',
      },
    ]
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        state: returnedState,
        narrative: '你选择了...',
        nextChoices,
      }),
    })

    const choice = {
      choiceId: 'test_a',
      label: '认真听培训',
      staminaCost: 1,
      effects: { statChanges: { professional: 2 } },
      category: '学习',
    }
    await useGameStore.getState().submitChoice(choice)

    expect(mockFetch).toHaveBeenCalledWith('/api/game/turn', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('"choice"'),
    }))
    expect(useGameStore.getState().criticalChoices).toEqual(nextChoices)
  })

  it('resignStartup calls the dedicated route and stores startup choices', async () => {
    const mockState = {
      ...createNewGame(),
      timeMode: 'quarterly' as const,
      criticalPeriod: null,
      job: {
        ...createNewGame().job,
        level: 'L6_tech' as const,
      },
    }
    useGameStore.setState({ state: mockState })

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        state: {
          ...mockState,
          phase: 2,
          timeMode: 'critical',
          criticalPeriod: {
            type: 'startup_launch',
            currentDay: 1,
            maxDays: 7,
            staminaPerDay: 3,
          },
          staminaRemaining: 3,
        },
        narrative: '你把工牌放在桌上，心里一下子轻了。',
        criticalChoices: [
          {
            choiceId: 'startup_launch_d1_a',
            label: '先把最小可用产品列出来',
            staminaCost: 1,
            effects: { statChanges: { professional: 2 } },
            category: '搭建',
          },
        ],
      }),
    })

    await useGameStore.getState().resignStartup()

    expect(mockFetch).toHaveBeenCalledWith('/api/game/resign', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('"state"'),
    }))
    expect(useGameStore.getState().state?.phase).toBe(2)
    expect(useGameStore.getState().criticalChoices).toHaveLength(1)
  })

  it('saveGame and loadGame work with localStorage', () => {
    const mockState = createNewGame()
    useGameStore.setState({ state: mockState })

    useGameStore.getState().saveGame('slot1')
    expect(storage['office_path_save_slot1']).toBeDefined()

    // Clear state
    useGameStore.setState({ state: null })
    expect(useGameStore.getState().state).toBeNull()

    // Load
    useGameStore.getState().loadGame('slot1')
    expect(useGameStore.getState().state).toEqual(mockState)
  })

  it('loadGame sets error for empty slot', () => {
    useGameStore.getState().loadGame('slot2')
    expect(useGameStore.getState().error).toBe('存档不存在')
  })

  it('refreshState fetches promotion info', async () => {
    const mockState = createNewGame()
    useGameStore.setState({ state: mockState })

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        state: mockState,
        computed: {
          promotionEligible: true,
          promotionNextLevels: ['L2'],
          promotionFailReasons: [],
        },
      }),
    })

    await useGameStore.getState().refreshState()

    expect(useGameStore.getState().promotionInfo).toEqual({
      eligible: true,
      nextLevels: ['L2'],
      failReasons: [],
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project ui tests/store/gameStore.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement the store**

```typescript
// src/store/gameStore.ts
import { create } from 'zustand'
import type { GameState, PhoneApp } from '@/types/game'
import type { QuarterPlan, CriticalChoice } from '@/types/actions'
import type { GameEvent } from '@/types/events'
import {
  saveGame as storageSave,
  loadGame as storageLoad,
} from '@/save/storage'
import type { SaveSlot } from '@/save/storage'

interface PromotionInfo {
  eligible: boolean
  nextLevels: string[]
  failReasons: string[]
}

interface GameStore {
  // Core state
  state: GameState | null
  isLoading: boolean
  error: string | null

  // UI state
  activePanel: 'attributes' | 'relationships' | 'phone'
  activePhoneApp: PhoneApp | null
  showSaveModal: boolean
  narrativeQueue: string[]
  promotionInfo: PromotionInfo | null
  currentEvent: GameEvent | null
  criticalChoices: CriticalChoice[]

  // Actions
  newGame: () => Promise<void>
  submitQuarter: (plan: QuarterPlan) => Promise<void>
  submitChoice: (choice: CriticalChoice) => Promise<void>
  resignStartup: () => Promise<void>
  refreshState: () => Promise<void>
  saveGame: (slot: string) => void
  loadGame: (slot: string) => void
  setActivePanel: (panel: 'attributes' | 'relationships' | 'phone') => void
  setActivePhoneApp: (app: PhoneApp | null) => void
  setShowSaveModal: (show: boolean) => void
  dismissCurrentEvent: () => void
  replyToPhoneMessage: (messageId: string, reply: string) => void
  clearError: () => void
}

export const useGameStore = create<GameStore>((set, get) => ({
  state: null,
  isLoading: false,
  error: null,
  activePanel: 'attributes',
  activePhoneApp: null,
  showSaveModal: false,
  narrativeQueue: [],
  promotionInfo: null,
  currentEvent: null,
  criticalChoices: [],

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
        currentEvent: null,
      })
    } catch {
      set({ error: '网络错误', isLoading: false })
    }
  },

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
      const currentEvent =
        data.events?.find((event: GameEvent) => event.triggersCritical) ?? null
      set({
        state: data.state,
        isLoading: false,
        narrativeQueue: data.narrative ? [data.narrative] : [],
        currentEvent,
        criticalChoices: data.criticalChoices ?? [],
      })
      // Auto-save after quarter
      storageSave(data.state, 'auto')
    } catch {
      set({ error: '网络错误', isLoading: false })
    }
  },

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
        currentEvent: null,
      })
    } catch {
      set({ error: '网络错误', isLoading: false })
    }
  },

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
        set({ error: data.error ?? '创业切换失败', isLoading: false })
        return
      }
      set({
        state: data.state,
        isLoading: false,
        narrativeQueue: data.narrative ? [data.narrative] : [],
        criticalChoices: data.criticalChoices ?? [],
        currentEvent: null,
      })
    } catch {
      set({ error: '网络错误', isLoading: false })
    }
  },

  refreshState: async () => {
    const { state } = get()
    if (!state) return
    try {
      const res = await fetch('/api/game/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state }),
      })
      const data = await res.json()
      if (res.ok && data.computed) {
        set({
          promotionInfo: {
            eligible: data.computed.promotionEligible,
            nextLevels: data.computed.promotionNextLevels,
            failReasons: data.computed.promotionFailReasons,
          },
        })
      }
    } catch {
      // Silent fail for promotion check
    }
  },

  saveGame: (slot: string) => {
    const { state } = get()
    if (!state) return
    storageSave(state, slot as SaveSlot)
  },

  loadGame: (slot: string) => {
    const loaded = storageLoad(slot as SaveSlot)
    if (!loaded) {
      set({ error: '存档不存在' })
      return
    }
    set({
      state: loaded,
      error: null,
      narrativeQueue: [],
      currentEvent: null,
      criticalChoices: [],
    })
  },

  setActivePanel: (panel) => set({ activePanel: panel }),
  setActivePhoneApp: (app) => set({ activePhoneApp: app }),
  setShowSaveModal: (show) => set({ showSaveModal: show }),
  dismissCurrentEvent: () => set({ currentEvent: null }),
  replyToPhoneMessage: (messageId, reply) => {
    const { state } = get()
    if (!state) return
    set({
      state: {
        ...state,
        phoneMessages: state.phoneMessages.map(m =>
          m.id === messageId ? { ...m, read: true, selectedReply: reply } : m,
        ),
      },
    })
  },
  clearError: () => set({ error: null }),
}))
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project ui tests/store/gameStore.test.ts`
Expected: 9 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/store/gameStore.ts tests/store/gameStore.test.ts
git commit -m "feat: add Zustand game store with critical choices, event popup state, and resign flow"
```

---

## Chunk 2: Pages & Story Area

### Task 9: Root Layout

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Rewrite layout with pixel font and metadata**

```tsx
// src/app/layout.tsx
import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'

const zpix = localFont({
  src: '../../public/fonts/zpix.woff2',
  variable: '--font-zpix',
  display: 'swap',
})

export const metadata: Metadata = {
  title: '打工之道 — 职场模拟器',
  description: '一个基于 AI Agent 的打工模拟器。从应届毕业生开始，升职加薪，或辞职创业。',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${zpix.variable} antialiased`}>
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Verify dev server starts**

Run: `npm run dev`
Expected: Server starts, no font loading errors in console. Visit `http://localhost:3000` to confirm page renders.

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: update root layout with Zpix pixel font and Chinese metadata"
```

---

### Task 10: LandingPage

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Replace boilerplate with LandingPage**

```tsx
// src/app/page.tsx
'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { PixelButton } from '@/components/ui/PixelButton'
import { SaveModal } from '@/components/game/SaveModal'
import { useGameStore } from '@/store/gameStore'

export default function LandingPage() {
  const router = useRouter()
  const { newGame, isLoading } = useGameStore()
  const [showLoad, setShowLoad] = useState(false)

  const handleNewGame = async () => {
    await newGame()
    router.push('/game')
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--pixel-bg)]">
      {/* 小屏幕提示 */}
      <div className="block min-[1024px]:hidden p-8 text-center text-[var(--pixel-text-amber)]">
        请使用电脑访问
      </div>

      <div className="hidden min-[1024px]:flex flex-col items-center gap-12">
        {/* 游戏标题 */}
        <div className="text-center">
          <h1 className="pixel-glow text-6xl text-[var(--pixel-text-bright)] mb-4">
            打工之道
          </h1>
          <p className="text-lg text-[var(--pixel-text-dim)]">
            一个 AI 驱动的职场模拟器
          </p>
        </div>

        {/* 菜单按钮 */}
        <div className="flex flex-col gap-4">
          <PixelButton onClick={handleNewGame} disabled={isLoading}>
            {isLoading ? '创建中...' : '新游戏'}
          </PixelButton>
          <PixelButton onClick={() => setShowLoad(true)}>
            读取存档
          </PixelButton>
        </div>
      </div>

      {showLoad && (
        <SaveModal
          open={showLoad}
          onClose={() => setShowLoad(false)}
          mode="load"
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: replace boilerplate with LandingPage (title + new game + load save)"
```

---

### Task 11: GamePage Shell, TopStatusBar, ErrorBanner

**Files:**
- Create: `src/app/game/page.tsx`
- Create: `src/components/game/TopStatusBar.tsx`
- Create: `src/components/game/ErrorBanner.tsx`
- Create: `tests/components/game/TopStatusBar.test.tsx`

- [ ] **Step 1: Write the TopStatusBar test**

```tsx
// tests/components/game/TopStatusBar.test.tsx
import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useGameStore } from '@/store/gameStore'
import { TopStatusBar } from '@/components/game/TopStatusBar'
import { createNewGame } from '@/engine/state'

describe('TopStatusBar', () => {
  beforeEach(() => {
    useGameStore.setState({ state: createNewGame(), showSaveModal: false })
  })

  it('displays quarter, level, and money', () => {
    render(<TopStatusBar />)
    expect(screen.getByText(/Q0/)).toBeDefined()
    expect(screen.getByText(/L1/)).toBeDefined()
    expect(screen.getByText(/5,000/)).toBeDefined()
  })

  it('displays game title', () => {
    render(<TopStatusBar />)
    expect(screen.getByText('打工之道')).toBeDefined()
  })

  it('shows nothing when state is null', () => {
    useGameStore.setState({ state: null })
    const { container } = render(<TopStatusBar />)
    expect(container.textContent).toBe('')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project ui tests/components/game/TopStatusBar.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement TopStatusBar**

```tsx
// src/components/game/TopStatusBar.tsx
'use client'

import { useGameStore } from '@/store/gameStore'

export function TopStatusBar() {
  const state = useGameStore(s => s.state)
  const setShowSaveModal = useGameStore(s => s.setShowSaveModal)

  if (!state) return null

  const money = state.player.money.toLocaleString('zh-CN')

  return (
    <div className="pixel-border-light flex h-12 items-center justify-between bg-[var(--pixel-bg-panel)] px-4">
      <span className="pixel-glow text-[var(--pixel-text-bright)]">打工之道</span>
      <div className="flex items-center gap-6 text-sm">
        <span>Q{state.currentQuarter}</span>
        <span>{state.job.level} {state.job.companyName}</span>
        <span className="text-[var(--pixel-text-amber)]">¥{money}</span>
        {state.criticalPeriod && (
          <span className="text-[var(--pixel-accent)]">
            关键期 {state.criticalPeriod.currentDay}/{state.criticalPeriod.maxDays}
          </span>
        )}
        <button
          className="pixel-btn px-2 py-0.5 text-xs"
          onClick={() => setShowSaveModal(true)}
        >
          存档
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Implement ErrorBanner**

```tsx
// src/components/game/ErrorBanner.tsx
'use client'

import { useEffect } from 'react'
import { useGameStore } from '@/store/gameStore'

export function ErrorBanner() {
  const error = useGameStore(s => s.error)
  const clearError = useGameStore(s => s.clearError)

  useEffect(() => {
    if (!error) return
    const timer = setTimeout(clearError, 3000)
    return () => clearTimeout(timer)
  }, [error, clearError])

  if (!error) return null

  return (
    <div className="flex items-center justify-between bg-[var(--pixel-red)] px-4 py-2 text-sm text-white">
      <span>{error}</span>
      <button onClick={clearError} className="text-white hover:underline">
        ✕
      </button>
    </div>
  )
}
```

- [ ] **Step 5: Create GamePage shell**

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

export default function GamePage() {
  const router = useRouter()
  const state = useGameStore(s => s.state)
  const showSaveModal = useGameStore(s => s.showSaveModal)
  const setShowSaveModal = useGameStore(s => s.setShowSaveModal)

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

      <SaveModal
        open={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        mode="full"
      />
    </div>
  )
}
```

Note: `StoryPanel`, `DashboardPanel`, `ActionBar`, `SaveModal` will be implemented in later tasks. For now, create placeholder stubs so GamePage compiles:

```tsx
// src/components/game/StoryPanel.tsx
'use client'
export function StoryPanel() {
  return <div data-testid="story-panel" />
}
```

```tsx
// src/components/game/DashboardPanel.tsx
'use client'
export function DashboardPanel() {
  return <div data-testid="dashboard-panel" />
}
```

```tsx
// src/components/game/ActionBar.tsx
'use client'
export function ActionBar() {
  return <div data-testid="action-bar" />
}
```

```tsx
// src/components/game/SaveModal.tsx
'use client'
interface SaveModalProps {
  open: boolean
  onClose: () => void
  mode: 'load' | 'full'
}
export function SaveModal({ open, onClose, mode }: SaveModalProps) {
  if (!open) return null
  return <div data-testid="save-modal" />
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run --project ui tests/components/game/TopStatusBar.test.tsx`
Expected: 3 tests PASS

- [ ] **Step 7: Commit**

```bash
git add src/app/game/ src/components/game/TopStatusBar.tsx src/components/game/ErrorBanner.tsx src/components/game/StoryPanel.tsx src/components/game/DashboardPanel.tsx src/components/game/ActionBar.tsx src/components/game/SaveModal.tsx tests/components/game/TopStatusBar.test.tsx
git commit -m "feat: add GamePage shell with TopStatusBar, ErrorBanner, and stub panels"
```

---

### Task 12: NarrativeDisplay

**Files:**
- Replace stub: `src/components/game/StoryPanel.tsx`
- Create: `src/components/game/NarrativeDisplay.tsx`
- Create: `src/components/game/QuarterTransition.tsx`
- Create: `src/components/game/EventPopup.tsx`
- Create: `tests/components/game/NarrativeDisplay.test.tsx`

- [ ] **Step 1: Write the NarrativeDisplay test**

```tsx
// tests/components/game/NarrativeDisplay.test.tsx
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NarrativeDisplay } from '@/components/game/NarrativeDisplay'

describe('NarrativeDisplay', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders segments with typewriter effect', () => {
    render(
      <NarrativeDisplay
        segments={[{ type: 'text', content: 'AB' }]}
        onComplete={vi.fn()}
      />,
    )
    // Initially empty
    expect(screen.queryByText('AB')).toBeNull()

    // After enough ticks (2 chars × 40ms interval)
    act(() => { vi.advanceTimersByTime(40) })
    expect(screen.getByTestId('narrative-text').textContent).toBe('A')

    act(() => { vi.advanceTimersByTime(40) })
    expect(screen.getByTestId('narrative-text').textContent).toBe('AB')
  })

  it('renders NPC dialogue as speech bubble', () => {
    render(
      <NarrativeDisplay
        segments={[{ type: 'dialogue', speaker: '王建国', content: '早啊' }]}
        onComplete={vi.fn()}
      />,
    )
    // Skip to end
    act(() => { vi.advanceTimersByTime(5000) })

    expect(screen.getByText('王建国')).toBeDefined()
    expect(screen.getByTestId('dialogue-content').textContent).toContain('早啊')
  })

  it('skip button shows all text immediately', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const onComplete = vi.fn()
    render(
      <NarrativeDisplay
        segments={[{ type: 'text', content: '很长的一段文字内容在这里' }]}
        onComplete={onComplete}
      />,
    )

    await user.click(screen.getByText('跳过'))

    expect(screen.getByTestId('narrative-text').textContent).toBe('很长的一段文字内容在这里')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project ui tests/components/game/NarrativeDisplay.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement NarrativeDisplay**

```tsx
// src/components/game/NarrativeDisplay.tsx
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { NarrativeSegment } from '@/lib/narrative'

interface NarrativeDisplayProps {
  segments: NarrativeSegment[]
  onComplete: () => void
}

const CHAR_INTERVAL = 40 // ms per character
const SEGMENT_PAUSE = 300 // ms between segments

export function NarrativeDisplay({ segments, onComplete }: NarrativeDisplayProps) {
  const [currentSegmentIdx, setCurrentSegmentIdx] = useState(0)
  const [displayedChars, setDisplayedChars] = useState(0)
  const [skipped, setSkipped] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const currentSegment = segments[currentSegmentIdx]
  const isLastSegment = currentSegmentIdx >= segments.length - 1
  const segmentComplete = currentSegment
    ? displayedChars >= currentSegment.content.length
    : true

  // Typewriter tick
  useEffect(() => {
    if (skipped || !currentSegment || segmentComplete) return

    intervalRef.current = setInterval(() => {
      setDisplayedChars(prev => {
        const next = prev + 1
        if (next >= currentSegment.content.length) {
          if (intervalRef.current) clearInterval(intervalRef.current)
        }
        return next
      })
    }, CHAR_INTERVAL)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [currentSegmentIdx, skipped, currentSegment, segmentComplete])

  // Move to next segment after pause
  useEffect(() => {
    if (!segmentComplete || isLastSegment || skipped) return

    const timer = setTimeout(() => {
      setCurrentSegmentIdx(prev => prev + 1)
      setDisplayedChars(0)
    }, SEGMENT_PAUSE)

    return () => clearTimeout(timer)
  }, [segmentComplete, isLastSegment, skipped])

  // Notify completion
  useEffect(() => {
    if (segments.length > 0 && segmentComplete && isLastSegment) {
      onComplete()
    }
  }, [segmentComplete, isLastSegment, onComplete])

  const handleSkip = useCallback(() => {
    setSkipped(true)
    setCurrentSegmentIdx(segments.length - 1)
    if (segments.length > 0) {
      setDisplayedChars(segments[segments.length - 1].content.length)
    }
  }, [segments])

  if (segments.length === 0) return null

  return (
    <div className="relative">
      <div className="space-y-4">
        {segments.slice(0, currentSegmentIdx + 1).map((seg, i) => {
          const isCurrentSeg = i === currentSegmentIdx
          const text = isCurrentSeg && !skipped
            ? seg.content.slice(0, displayedChars)
            : seg.content

          if (seg.type === 'dialogue') {
            return (
              <div key={i} className="flex items-start gap-3 my-3">
                <span className="pixel-border-light shrink-0 bg-[var(--pixel-bg-panel)] px-2 py-1 text-xs text-[var(--pixel-text-amber)]">
                  {seg.speaker}
                </span>
                <div
                  data-testid="dialogue-content"
                  className="pixel-border-light bg-[var(--pixel-bg-light)] p-3 text-sm"
                >
                  {text}
                </div>
              </div>
            )
          }

          return (
            <p
              key={i}
              data-testid="narrative-text"
              className="text-sm leading-7 text-[var(--pixel-text)]"
            >
              {text}
            </p>
          )
        })}
      </div>

      {!skipped && !segmentComplete && (
        <button
          onClick={handleSkip}
          className="pixel-btn absolute right-0 bottom-0 px-2 py-1 text-xs"
        >
          跳过
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Implement QuarterTransition**

```tsx
// src/components/game/QuarterTransition.tsx
'use client'

import { useEffect, useState, useRef } from 'react'
import type { CriticalPeriod } from '@/types/game'

interface QuarterTransitionProps {
  quarter: number
  criticalPeriod: CriticalPeriod | null
  onComplete: () => void
}

export function QuarterTransition({
  quarter,
  criticalPeriod,
  onComplete,
}: QuarterTransitionProps) {
  const [visible, setVisible] = useState(true)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      onCompleteRef.current()
    }, 1500)
    return () => clearTimeout(timer)
  }, [])

  if (!visible) return null

  return (
    <div className="quarter-transition fixed inset-0 z-40 flex items-center justify-center bg-[var(--pixel-bg)]">
      <div className="text-center">
        {criticalPeriod ? (
          <>
            <p className="mb-2 text-lg text-[var(--pixel-accent)]">关键期</p>
            <h2 className="pixel-glow text-4xl text-[var(--pixel-text-bright)]">
              {criticalPeriod.type === 'onboarding' && '入职第一周'}
              {criticalPeriod.type === 'promotion_review' && '晋升答辩'}
              {criticalPeriod.type === 'company_crisis' && '公司危机'}
              {criticalPeriod.type === 'project_sprint' && '项目冲刺'}
              {criticalPeriod.type === 'job_negotiation' && '跳槽谈判'}
              {criticalPeriod.type === 'startup_launch' && '创业启动'}
              {criticalPeriod.type === 'fundraising' && '融资谈判'}
              {criticalPeriod.type === 'ipo_review' && '上市审核'}
            </h2>
            <p className="mt-2 text-[var(--pixel-text-dim)]">
              第 {criticalPeriod.currentDay} 天 / 共 {criticalPeriod.maxDays} 天
            </p>
          </>
        ) : (
          <h2 className="pixel-glow text-4xl text-[var(--pixel-text-bright)]">
            第 {quarter} 季度
          </h2>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Implement EventPopup**

```tsx
// src/components/game/EventPopup.tsx
'use client'

import type { GameEvent } from '@/types/events'
import { PixelButton } from '@/components/ui/PixelButton'

interface EventPopupProps {
  event: GameEvent
  onConfirm: () => void
}

const SEVERITY_COLORS: Record<string, string> = {
  low: 'text-[var(--pixel-blue)]',
  medium: 'text-[var(--pixel-yellow)]',
  high: 'text-[var(--pixel-accent)]',
  critical: 'text-[var(--pixel-red)]',
}

export function EventPopup({ event, onConfirm }: EventPopupProps) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" />
      <div className="pixel-border relative z-10 w-[420px] bg-[var(--pixel-bg)] p-6 text-center">
        <span className={`text-xs ${SEVERITY_COLORS[event.severity] ?? ''}`}>
          {event.severity === 'low' && '日常'}
          {event.severity === 'medium' && '重要'}
          {event.severity === 'high' && '紧急'}
          {event.severity === 'critical' && '危机'}
        </span>
        <h3 className="pixel-glow mt-2 text-xl text-[var(--pixel-text-bright)]">
          {event.title}
        </h3>
        <p className="mt-3 text-sm text-[var(--pixel-text)]">{event.description}</p>
        {event.triggersCritical && (
          <p className="mt-2 text-xs text-[var(--pixel-accent)]">将进入关键期模式</p>
        )}
        <div className="mt-4">
          <PixelButton onClick={onConfirm}>确认</PixelButton>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Update StoryPanel to wire up NarrativeDisplay**

Replace the stub `src/components/game/StoryPanel.tsx`:

```tsx
// src/components/game/StoryPanel.tsx
'use client'

import { useCallback, useMemo } from 'react'
import { useGameStore } from '@/store/gameStore'
import { NarrativeDisplay } from '@/components/game/NarrativeDisplay'
import { parseNarrative } from '@/lib/narrative'

export function StoryPanel() {
  const narrativeQueue = useGameStore(s => s.narrativeQueue)

  const currentNarrative = narrativeQueue[0] ?? null

  const segments = useMemo(() => {
    if (!currentNarrative) return []
    return parseNarrative(currentNarrative)
  }, [currentNarrative])

  const handleComplete = useCallback(() => {
    // Remove consumed narrative from queue
    useGameStore.setState(prev => ({
      narrativeQueue: prev.narrativeQueue.slice(1),
    }))
  }, [])

  if (segments.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-[var(--pixel-text-dim)]">
        等待下一段故事...
      </div>
    )
  }

  return (
    <div data-testid="story-panel" className="p-4">
      <NarrativeDisplay segments={segments} onComplete={handleComplete} />
    </div>
  )
}
```

Note: `QuarterTransition` can remain a standalone overlay, but `EventPopup` must not stay disconnected. In Task 22 below, revisit `GamePage` and render `EventPopup` from `useGameStore(s => s.currentEvent)`. The popup confirm button is UI-only: by the time it appears, the backend has already transitioned `state` into critical mode and returned `criticalChoices`; confirming simply dismisses the overlay.

Run: `npx vitest run --project ui tests/components/game/NarrativeDisplay.test.tsx`
Expected: 3 tests PASS

- [ ] **Step 8: Commit**

```bash
git add src/components/game/StoryPanel.tsx src/components/game/NarrativeDisplay.tsx src/components/game/QuarterTransition.tsx src/components/game/EventPopup.tsx tests/components/game/NarrativeDisplay.test.tsx
git commit -m "feat: add story area with NarrativeDisplay typewriter effect, QuarterTransition, EventPopup"
```

---

## Chunk 3: Dashboard Panels & Phone System

### Task 13: DashboardPanel + PanelTabs

**Files:**
- Replace stub: `src/components/game/DashboardPanel.tsx`
- Create: `src/components/game/PanelTabs.tsx`

- [ ] **Step 1: Implement PanelTabs**

```tsx
// src/components/game/PanelTabs.tsx
'use client'

import { useGameStore } from '@/store/gameStore'

const TABS = [
  { key: 'attributes' as const, label: '属性' },
  { key: 'relationships' as const, label: '关系' },
  { key: 'phone' as const, label: '📱' },
] as const

export function PanelTabs() {
  const activePanel = useGameStore(s => s.activePanel)
  const setActivePanel = useGameStore(s => s.setActivePanel)

  return (
    <div className="flex border-b-4 border-[var(--pixel-border)]">
      {TABS.map(tab => (
        <button
          key={tab.key}
          onClick={() => setActivePanel(tab.key)}
          className={`flex-1 py-2 text-center text-sm ${
            activePanel === tab.key
              ? 'bg-[var(--pixel-bg-panel)] text-[var(--pixel-text-bright)] pixel-glow'
              : 'bg-[var(--pixel-bg)] text-[var(--pixel-text-dim)] hover:text-[var(--pixel-text)]'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Update DashboardPanel**

```tsx
// src/components/game/DashboardPanel.tsx
'use client'

import { useGameStore } from '@/store/gameStore'
import { PanelTabs } from '@/components/game/PanelTabs'
import { AttributesTab } from '@/components/game/AttributesTab'
import { RelationshipsTab } from '@/components/game/RelationshipsTab'
import { PhoneTab } from '@/components/game/PhoneTab'

export function DashboardPanel() {
  const activePanel = useGameStore(s => s.activePanel)

  return (
    <div data-testid="dashboard-panel" className="flex h-full flex-col">
      <PanelTabs />
      <div className="flex-1 overflow-y-auto p-3">
        {activePanel === 'attributes' && <AttributesTab />}
        {activePanel === 'relationships' && <RelationshipsTab />}
        {activePanel === 'phone' && <PhoneTab />}
      </div>
    </div>
  )
}
```

Note: `AttributesTab`, `RelationshipsTab`, `PhoneTab` are implemented in the next tasks. Create placeholder stubs now:

```tsx
// src/components/game/AttributesTab.tsx
'use client'
export function AttributesTab() {
  return <div data-testid="attributes-tab" />
}
```

```tsx
// src/components/game/RelationshipsTab.tsx
'use client'
export function RelationshipsTab() {
  return <div data-testid="relationships-tab" />
}
```

```tsx
// src/components/game/PhoneTab.tsx
'use client'
export function PhoneTab() {
  return <div data-testid="phone-tab" />
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/game/DashboardPanel.tsx src/components/game/PanelTabs.tsx src/components/game/AttributesTab.tsx src/components/game/RelationshipsTab.tsx src/components/game/PhoneTab.tsx
git commit -m "feat: add DashboardPanel with PanelTabs and tab switching"
```

---

### Task 14: AttributesTab + CompanyStats

**Files:**
- Replace stub: `src/components/game/AttributesTab.tsx`
- Create: `src/components/game/CompanyStats.tsx`
- Create: `tests/components/game/AttributesTab.test.tsx`

- [ ] **Step 1: Write the test**

```tsx
// tests/components/game/AttributesTab.test.tsx
import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useGameStore } from '@/store/gameStore'
import { AttributesTab } from '@/components/game/AttributesTab'
import { createNewGame } from '@/engine/state'

describe('AttributesTab', () => {
  beforeEach(() => {
    useGameStore.setState({ state: createNewGame(), promotionInfo: null })
  })

  it('renders all 7 attribute bars', () => {
    render(<AttributesTab />)
    expect(screen.getByText('健康')).toBeDefined()
    expect(screen.getByText('专业')).toBeDefined()
    expect(screen.getByText('沟通')).toBeDefined()
    expect(screen.getByText('管理')).toBeDefined()
    expect(screen.getByText('人脉')).toBeDefined()
    expect(screen.getByText('心情')).toBeDefined()
    expect(screen.getByText('声望')).toBeDefined()
  })

  it('renders money as number not progress bar', () => {
    render(<AttributesTab />)
    expect(screen.getByText(/¥5,000/)).toBeDefined()
  })

  it('shows promotion badge when eligible', () => {
    useGameStore.setState({
      promotionInfo: {
        eligible: true,
        nextLevels: ['L2'],
        failReasons: [],
      },
    })
    render(<AttributesTab />)
    expect(screen.getByText('可晋升')).toBeDefined()
    expect(screen.getByText('L2')).toBeDefined()
  })

  it('shows company stats in phase 2', () => {
    const state = createNewGame()
    state.phase = 2
    state.company = {
      stage: 'garage',
      productQuality: 30,
      teamSatisfaction: 60,
      customerCount: 5,
      brandAwareness: 10,
      employeeCount: 2,
      quarterlyRevenue: 50000,
      quarterlyExpenses: 30000,
      cashFlow: 20000,
      valuation: 500000,
      officeType: 'home',
      founderEquity: 100,
      consecutiveNegativeCashFlow: 0,
      consecutiveProfitableQuarters: 0,
      hasSeriesAFunding: false,
      annualGrowthRate: 0,
    }
    useGameStore.setState({ state })
    render(<AttributesTab />)
    expect(screen.getByText('公司')).toBeDefined()
    expect(screen.getByText(/车库创业/)).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project ui tests/components/game/AttributesTab.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement CompanyStats**

```tsx
// src/components/game/CompanyStats.tsx
'use client'

import { useState } from 'react'
import type { CompanyState, CompanyStage } from '@/types/company'
import { PixelProgressBar } from '@/components/ui/PixelProgressBar'

const STAGE_LABELS: Record<CompanyStage, string> = {
  garage: '车库创业',
  small_team: '小型团队',
  series_a: 'A轮公司',
  growth: '成长期',
  pre_ipo: '上市冲刺',
  public: '上市公司',
}

interface CompanyStatsProps {
  company: CompanyState
}

export function CompanyStats({ company }: CompanyStatsProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="mt-4 border-t-2 border-[var(--pixel-border)] pt-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left text-sm text-[var(--pixel-text-amber)]"
      >
        公司 {expanded ? '▼' : '▶'} {STAGE_LABELS[company.stage] ?? company.stage}
      </button>

      {expanded && (
        <div className="mt-2 space-y-1">
          <PixelProgressBar
            value={company.productQuality}
            max={100}
            label="产品"
            color="var(--bar-professional)"
          />
          <PixelProgressBar
            value={company.teamSatisfaction}
            max={100}
            label="团队"
            color="var(--bar-mood)"
          />
          <PixelProgressBar
            value={company.brandAwareness}
            max={100}
            label="品牌"
            color="var(--bar-reputation)"
          />
          <div className="mt-2 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-[var(--pixel-text-dim)]">客户</span>
              <span>{company.customerCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--pixel-text-dim)]">员工</span>
              <span>{company.employeeCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--pixel-text-dim)]">季度营收</span>
              <span className="text-[var(--pixel-green)]">
                ¥{company.quarterlyRevenue.toLocaleString('zh-CN')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--pixel-text-dim)]">季度支出</span>
              <span className="text-[var(--pixel-red)]">
                ¥{company.quarterlyExpenses.toLocaleString('zh-CN')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--pixel-text-dim)]">现金流</span>
              <span className={company.cashFlow >= 0 ? 'text-[var(--pixel-green)]' : 'text-[var(--pixel-red)]'}>
                ¥{company.cashFlow.toLocaleString('zh-CN')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--pixel-text-dim)]">估值</span>
              <span>¥{company.valuation.toLocaleString('zh-CN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--pixel-text-dim)]">股权</span>
              <span>{company.founderEquity}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Implement AttributesTab**

```tsx
// src/components/game/AttributesTab.tsx
'use client'

import { useGameStore } from '@/store/gameStore'
import { PixelProgressBar } from '@/components/ui/PixelProgressBar'
import { CompanyStats } from '@/components/game/CompanyStats'
import { useRef, useEffect, useState } from 'react'
import type { PlayerAttributes } from '@/types/game'

const ATTRIBUTE_CONFIG = [
  { key: 'health' as const, label: '健康', color: 'var(--bar-health)' },
  { key: 'professional' as const, label: '专业', color: 'var(--bar-professional)' },
  { key: 'communication' as const, label: '沟通', color: 'var(--bar-communication)' },
  { key: 'management' as const, label: '管理', color: 'var(--bar-management)' },
  { key: 'network' as const, label: '人脉', color: 'var(--bar-network)' },
  { key: 'mood' as const, label: '心情', color: 'var(--bar-mood)' },
  { key: 'reputation' as const, label: '声望', color: 'var(--bar-reputation)' },
] as const

type AttrKey = typeof ATTRIBUTE_CONFIG[number]['key']

export function AttributesTab() {
  const state = useGameStore(s => s.state)
  const promotionInfo = useGameStore(s => s.promotionInfo)
  const prevAttrs = useRef<PlayerAttributes | null>(null)
  const [flashMap, setFlashMap] = useState<Record<string, 'increase' | 'decrease'>>({})

  // Detect attribute changes and trigger flash
  useEffect(() => {
    if (!state || !prevAttrs.current) {
      if (state) prevAttrs.current = { ...state.player }
      return
    }
    const flashes: Record<string, 'increase' | 'decrease'> = {}
    for (const attr of ATTRIBUTE_CONFIG) {
      const prev = prevAttrs.current[attr.key]
      const curr = state.player[attr.key]
      if (curr > prev) flashes[attr.key] = 'increase'
      else if (curr < prev) flashes[attr.key] = 'decrease'
    }
    prevAttrs.current = { ...state.player }
    if (Object.keys(flashes).length > 0) {
      setFlashMap(flashes)
      const timer = setTimeout(() => setFlashMap({}), 1000)
      return () => clearTimeout(timer)
    }
  }, [state?.player])

  if (!state) return null

  const money = state.player.money.toLocaleString('zh-CN')

  return (
    <div data-testid="attributes-tab" className="space-y-2">
      {/* 晋升提示 */}
      {promotionInfo?.eligible && (
        <div className="pixel-border-light mb-3 bg-[var(--pixel-bg-panel)] p-2 text-center">
          <span className="text-xs text-[var(--pixel-gold)]">可晋升</span>
          <div className="mt-1 flex justify-center gap-2">
            {promotionInfo.nextLevels.map(level => (
              <span key={level} className="text-sm text-[var(--pixel-text-bright)]">{level}</span>
            ))}
          </div>
        </div>
      )}

      {/* 7 项属性进度条 */}
      {ATTRIBUTE_CONFIG.map(attr => (
        <div
          key={attr.key}
          className={flashMap[attr.key] === 'increase' ? 'flash-increase' : flashMap[attr.key] === 'decrease' ? 'flash-decrease' : ''}
        >
          <PixelProgressBar
            value={state.player[attr.key]}
            max={100}
            label={attr.label}
            color={attr.color}
          />
        </div>
      ))}

      {/* 金钱 */}
      <div className="flex items-center gap-2 pt-1">
        <span className="w-12 text-xs text-[var(--pixel-text-dim)]">金钱</span>
        <span className="text-sm text-[var(--pixel-text-amber)]">¥{money}</span>
      </div>

      {/* Phase 2 公司属性 */}
      {state.phase === 2 && state.company && (
        <CompanyStats company={state.company} />
      )}
    </div>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run --project ui tests/components/game/AttributesTab.test.tsx`
Expected: 4 tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/game/AttributesTab.tsx src/components/game/CompanyStats.tsx tests/components/game/AttributesTab.test.tsx
git commit -m "feat: add AttributesTab with pixel progress bars, promotion badge, and Phase 2 company stats"
```

---

### Task 15: RelationshipsTab

**Files:**
- Replace stub: `src/components/game/RelationshipsTab.tsx`
- Create: `tests/components/game/RelationshipsTab.test.tsx`

- [ ] **Step 1: Write the test**

```tsx
// tests/components/game/RelationshipsTab.test.tsx
import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useGameStore } from '@/store/gameStore'
import { RelationshipsTab } from '@/components/game/RelationshipsTab'
import { createNewGame } from '@/engine/state'

describe('RelationshipsTab', () => {
  beforeEach(() => {
    useGameStore.setState({ state: createNewGame() })
  })

  it('renders active NPCs', () => {
    render(<RelationshipsTab />)
    expect(screen.getByText('王建国')).toBeDefined()
    expect(screen.getByText('张伟')).toBeDefined()
    expect(screen.getByText('李雪')).toBeDefined()
  })

  it('shows NPC role and favor', () => {
    render(<RelationshipsTab />)
    expect(screen.getByText('直属领导')).toBeDefined()
  })

  it('expands NPC detail on click and hides hiddenGoal when favor < 60', async () => {
    const user = userEvent.setup()
    render(<RelationshipsTab />)

    // 王建国 has favor 50 → hiddenGoal should be hidden
    await user.click(screen.getByText('王建国'))
    expect(screen.getByText(/表面和善/)).toBeDefined()
    expect(screen.queryByText(/升总监/)).toBeNull()
  })

  it('shows hiddenGoal when favor >= 60', async () => {
    const state = createNewGame()
    // 小美 has favor 55, bump to 60
    const xiaomei = state.npcs.find(n => n.name === '小美')!
    xiaomei.favor = 65
    useGameStore.setState({ state })

    const user = userEvent.setup()
    render(<RelationshipsTab />)
    await user.click(screen.getByText('小美'))
    expect(screen.getByText(/八卦情报站/)).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project ui tests/components/game/RelationshipsTab.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement RelationshipsTab**

```tsx
// src/components/game/RelationshipsTab.tsx
'use client'

import { useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import { PixelProgressBar } from '@/components/ui/PixelProgressBar'
import type { NPC } from '@/types/game'

function getFavorColor(favor: number): string {
  if (favor <= 20) return 'var(--favor-low)'
  if (favor <= 50) return 'var(--favor-mid)'
  if (favor <= 80) return 'var(--favor-high)'
  return 'var(--favor-max)'
}

function NPCRow({ npc }: { npc: NPC }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="pixel-border-light mb-2 bg-[var(--pixel-bg-light)] p-2">
      <div
        className="flex cursor-pointer items-center justify-between"
        onClick={() => setExpanded(!expanded)}
      >
        <div>
          <span className="text-sm">{npc.name}</span>
          <span className="ml-2 text-xs text-[var(--pixel-text-dim)]">{npc.role}</span>
        </div>
        <span className="text-xs text-[var(--pixel-text-dim)]">{npc.currentStatus}</span>
      </div>

      <PixelProgressBar
        value={npc.favor}
        max={100}
        label="好感"
        color={getFavorColor(npc.favor)}
        className="mt-1"
      />

      {expanded && (
        <div className="mt-2 border-t border-[var(--pixel-border)] pt-2 text-xs">
          <p className="text-[var(--pixel-text-dim)]">{npc.personality}</p>
          {npc.favor >= 60 && (
            <p className="mt-1 text-[var(--pixel-text-amber)]">
              内心想法：{npc.hiddenGoal}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export function RelationshipsTab() {
  const state = useGameStore(s => s.state)
  const [showInactive, setShowInactive] = useState(false)

  if (!state) return null

  const activeNpcs = state.npcs.filter(n => n.isActive)
  const inactiveNpcs = state.npcs.filter(n => !n.isActive)

  return (
    <div data-testid="relationships-tab">
      {activeNpcs.map(npc => (
        <NPCRow key={npc.id} npc={npc} />
      ))}

      {inactiveNpcs.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowInactive(!showInactive)}
            className="text-xs text-[var(--pixel-text-dim)]"
          >
            历史人物 {showInactive ? '▼' : '▶'} ({inactiveNpcs.length})
          </button>
          {showInactive && (
            <div className="mt-2 opacity-60">
              {inactiveNpcs.map(npc => (
                <NPCRow key={npc.id} npc={npc} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project ui tests/components/game/RelationshipsTab.test.tsx`
Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/game/RelationshipsTab.tsx tests/components/game/RelationshipsTab.test.tsx
git commit -m "feat: add RelationshipsTab with NPC list, favor bars, and expandable details"
```

---

### Task 16: PhoneTab + PhoneAppGrid + PhoneAppView

**Files:**
- Replace stub: `src/components/game/PhoneTab.tsx`
- Create: `src/components/game/PhoneAppGrid.tsx`
- Create: `src/components/game/PhoneAppView.tsx`
- Create: `tests/components/game/PhoneTab.test.tsx`

- [ ] **Step 1: Write the test**

```tsx
// tests/components/game/PhoneTab.test.tsx
import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useGameStore } from '@/store/gameStore'
import { PhoneTab } from '@/components/game/PhoneTab'
import { createNewGame } from '@/engine/state'

describe('PhoneTab', () => {
  beforeEach(() => {
    const state = createNewGame()
    state.phoneMessages = [
      { id: '1', app: 'xiaoxin', sender: '张伟', content: '下班去吃饭？', read: false, quarter: 1 },
      { id: '2', app: 'maimai', sender: '匿名', content: '听说要裁员', read: false, quarter: 1 },
      { id: '3', app: 'xiaoxin', sender: '李雪', content: '代码review了', read: true, quarter: 1 },
    ]
    useGameStore.setState({ state, activePhoneApp: null })
  })

  it('renders app grid with unread counts', () => {
    render(<PhoneTab />)
    expect(screen.getByText('小信')).toBeDefined()
    expect(screen.getByText('麦麦')).toBeDefined()
    // 小信 has 1 unread, 麦麦 has 1 unread
    const badges = screen.getAllByTestId('unread-badge')
    expect(badges.length).toBeGreaterThanOrEqual(2)
  })

  it('opens app view on click', async () => {
    const user = userEvent.setup()
    render(<PhoneTab />)

    await user.click(screen.getByText('小信'))

    expect(useGameStore.getState().activePhoneApp).toBe('xiaoxin')
  })

  it('shows back button in app view', async () => {
    useGameStore.setState({ activePhoneApp: 'xiaoxin' })
    render(<PhoneTab />)

    expect(screen.getByText('返回')).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project ui tests/components/game/PhoneTab.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement PhoneAppGrid**

```tsx
// src/components/game/PhoneAppGrid.tsx
'use client'

import { useGameStore } from '@/store/gameStore'
import type { PhoneApp } from '@/types/game'

const APP_CONFIG: { key: PhoneApp; label: string; icon: string; phase2Only?: boolean }[] = [
  { key: 'xiaoxin', label: '小信', icon: '💬' },
  { key: 'maimai', label: '麦麦', icon: '👥' },
  { key: 'jinritiaotiao', label: '今日条条', icon: '📰' },
  { key: 'zhifubei', label: '支付呗', icon: '💰' },
  { key: 'hrzhipin', label: 'BOSS真聘', icon: '💼' },
  { key: 'baolema', label: '饱了吗', icon: '🍔' },
  { key: 'huajiazhaogang', label: '花甲找房', icon: '🏠' },
  { key: 'tiantian', label: '天天财富', icon: '📈' },
  { key: 'dingding', label: '叮叮', icon: '🔔', phase2Only: true },
  { key: 'huabingtong', label: '画饼通', icon: '🎯', phase2Only: true },
]

export function PhoneAppGrid() {
  const state = useGameStore(s => s.state)
  const setActivePhoneApp = useGameStore(s => s.setActivePhoneApp)

  if (!state) return null

  const phase = state.phase
  const messages = state.phoneMessages

  const visibleApps = APP_CONFIG.filter(app => !app.phase2Only || phase === 2)

  return (
    <div className="grid grid-cols-5 gap-3">
      {visibleApps.map(app => {
        const unread = messages.filter(m => m.app === app.key && !m.read).length

        return (
          <button
            key={app.key}
            onClick={() => setActivePhoneApp(app.key)}
            className="flex flex-col items-center gap-1 p-2 hover:bg-[var(--pixel-bg-panel)]"
          >
            <div className="relative text-2xl">
              {app.icon}
              {unread > 0 && (
                <span
                  data-testid="unread-badge"
                  className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center bg-[var(--pixel-red)] text-[10px] text-white"
                >
                  {unread}
                </span>
              )}
            </div>
            <span className="text-[10px] text-[var(--pixel-text-dim)]">{app.label}</span>
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Implement PhoneAppView**

```tsx
// src/components/game/PhoneAppView.tsx
'use client'

import { useGameStore } from '@/store/gameStore'
import type { PhoneApp } from '@/types/game'
import { XiaoxinApp } from '@/components/game/phone/XiaoxinApp'
import { MaimaiApp } from '@/components/game/phone/MaimaiApp'
import { JinritiaotiaoApp } from '@/components/game/phone/JinritiaotiaoApp'
import { ZhifubeiApp } from '@/components/game/phone/ZhifubeiApp'
import { HrzhipinApp } from '@/components/game/phone/HrzhipinApp'
import { GenericMessageApp } from '@/components/game/phone/GenericMessageApp'

const APP_LABELS: Record<PhoneApp, string> = {
  xiaoxin: '小信',
  maimai: '麦麦',
  jinritiaotiao: '今日条条',
  zhifubei: '支付呗',
  hrzhipin: 'BOSS真聘',
  baolema: '饱了吗',
  huajiazhaogang: '花甲找房',
  tiantian: '天天财富',
  dingding: '叮叮',
  huabingtong: '画饼通',
}

function AppContent({ app }: { app: PhoneApp }) {
  switch (app) {
    case 'xiaoxin':
      return <XiaoxinApp />
    case 'maimai':
      return <MaimaiApp />
    case 'jinritiaotiao':
      return <JinritiaotiaoApp />
    case 'zhifubei':
      return <ZhifubeiApp />
    case 'hrzhipin':
      return <HrzhipinApp />
    default:
      return <GenericMessageApp app={app} />
  }
}

export function PhoneAppView() {
  const activeApp = useGameStore(s => s.activePhoneApp)
  const setActivePhoneApp = useGameStore(s => s.setActivePhoneApp)

  if (!activeApp) return null

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b-2 border-[var(--pixel-border)] p-2">
        <button
          onClick={() => setActivePhoneApp(null)}
          className="pixel-btn px-2 py-0.5 text-xs"
        >
          返回
        </button>
        <span className="text-sm">{APP_LABELS[activeApp]}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        <AppContent app={activeApp} />
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Update PhoneTab**

```tsx
// src/components/game/PhoneTab.tsx
'use client'

import { useGameStore } from '@/store/gameStore'
import { PhoneAppGrid } from '@/components/game/PhoneAppGrid'
import { PhoneAppView } from '@/components/game/PhoneAppView'

export function PhoneTab() {
  const activePhoneApp = useGameStore(s => s.activePhoneApp)

  return (
    <div data-testid="phone-tab">
      {activePhoneApp ? <PhoneAppView /> : <PhoneAppGrid />}
    </div>
  )
}
```

Note: Phone app content components (`XiaoxinApp`, etc.) will be implemented in the next task. Create placeholder stubs now:

```tsx
// src/components/game/phone/XiaoxinApp.tsx
'use client'
export function XiaoxinApp() { return <div data-testid="xiaoxin-app" /> }
```

```tsx
// src/components/game/phone/MaimaiApp.tsx
'use client'
export function MaimaiApp() { return <div data-testid="maimai-app" /> }
```

```tsx
// src/components/game/phone/JinritiaotiaoApp.tsx
'use client'
export function JinritiaotiaoApp() { return <div data-testid="jinritiaotiao-app" /> }
```

```tsx
// src/components/game/phone/ZhifubeiApp.tsx
'use client'
export function ZhifubeiApp() { return <div data-testid="zhifubei-app" /> }
```

```tsx
// src/components/game/phone/HrzhipinApp.tsx
'use client'
export function HrzhipinApp() { return <div data-testid="hrzhipin-app" /> }
```

```tsx
// src/components/game/phone/GenericMessageApp.tsx
'use client'
import type { PhoneApp } from '@/types/game'
export function GenericMessageApp({ app }: { app: PhoneApp }) {
  return <div data-testid="generic-message-app" />
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run --project ui tests/components/game/PhoneTab.test.tsx`
Expected: 3 tests PASS

- [ ] **Step 7: Commit**

```bash
git add src/components/game/PhoneTab.tsx src/components/game/PhoneAppGrid.tsx src/components/game/PhoneAppView.tsx src/components/game/phone/ tests/components/game/PhoneTab.test.tsx
git commit -m "feat: add PhoneTab with app grid, unread badges, and app view container"
```

---

### Task 17: Phone App Content Components

**Files:**
- Replace stubs: all files in `src/components/game/phone/`

- [ ] **Step 1: Implement XiaoxinApp (chat bubbles with replyOptions)**

```tsx
// src/components/game/phone/XiaoxinApp.tsx
'use client'

import { useGameStore } from '@/store/gameStore'

export function XiaoxinApp() {
  const state = useGameStore(s => s.state)
  const replyToPhoneMessage = useGameStore(s => s.replyToPhoneMessage)

  if (!state) return null

  const messages = state.phoneMessages
    .filter(m => m.app === 'xiaoxin')
    .sort((a, b) => b.quarter - a.quarter)

  if (messages.length === 0) {
    return <p className="text-xs text-[var(--pixel-text-dim)]">暂无消息</p>
  }

  return (
    <div className="space-y-3">
      {messages.map(msg => (
        <div key={msg.id} className="flex items-start gap-2">
          <span className="pixel-border-light shrink-0 bg-[var(--pixel-bg-panel)] px-1.5 py-0.5 text-[10px] text-[var(--pixel-text-amber)]">
            {msg.sender}
          </span>
          <div className="flex-1">
            <div className="pixel-border-light bg-[var(--pixel-bg-light)] p-2 text-xs">
              {msg.content}
            </div>
            {msg.replyOptions && !msg.selectedReply && (
              <div className="mt-1 flex flex-wrap gap-1">
                {msg.replyOptions.map(opt => (
                  <button
                    key={opt}
                    onClick={() => replyToPhoneMessage(msg.id, opt)}
                    className="pixel-btn px-2 py-0.5 text-[10px]"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
            {msg.selectedReply && (
              <div className="mt-1 text-[10px] text-[var(--pixel-text-bright)]">
                你回复了：{msg.selectedReply}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Implement MaimaiApp (forum style)**

```tsx
// src/components/game/phone/MaimaiApp.tsx
'use client'

import { useGameStore } from '@/store/gameStore'

export function MaimaiApp() {
  const state = useGameStore(s => s.state)

  if (!state) return null

  const messages = state.phoneMessages
    .filter(m => m.app === 'maimai')
    .sort((a, b) => b.quarter - a.quarter)

  if (messages.length === 0) {
    return <p className="text-xs text-[var(--pixel-text-dim)]">暂无爆料</p>
  }

  return (
    <div className="space-y-2">
      {messages.map(msg => (
        <div key={msg.id} className="pixel-border-light bg-[var(--pixel-bg-light)] p-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[var(--pixel-text-dim)]">匿名用户</span>
            <span className="text-[10px] text-[var(--pixel-accent)]">🔥 热帖</span>
          </div>
          <p className="mt-1 text-xs">{msg.content}</p>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Implement JinritiaotiaoApp (news cards)**

```tsx
// src/components/game/phone/JinritiaotiaoApp.tsx
'use client'

import { useGameStore } from '@/store/gameStore'

export function JinritiaotiaoApp() {
  const state = useGameStore(s => s.state)

  if (!state) return null

  const messages = state.phoneMessages
    .filter(m => m.app === 'jinritiaotiao')
    .sort((a, b) => b.quarter - a.quarter)

  if (messages.length === 0) {
    return <p className="text-xs text-[var(--pixel-text-dim)]">暂无新闻</p>
  }

  return (
    <div className="space-y-2">
      {messages.map(msg => (
        <div key={msg.id} className="pixel-border-light bg-[var(--pixel-bg-light)] p-2">
          <h4 className="text-xs text-[var(--pixel-text-bright)]">{msg.sender}</h4>
          <p className="mt-1 text-[10px] text-[var(--pixel-text)]">{msg.content}</p>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Implement ZhifubeiApp (transaction list)**

```tsx
// src/components/game/phone/ZhifubeiApp.tsx
'use client'

import { useGameStore } from '@/store/gameStore'

export function ZhifubeiApp() {
  const state = useGameStore(s => s.state)

  if (!state) return null

  const messages = state.phoneMessages
    .filter(m => m.app === 'zhifubei')
    .sort((a, b) => b.quarter - a.quarter)

  const balance = state.player.money.toLocaleString('zh-CN')

  return (
    <div>
      <div className="mb-3 pixel-border-light bg-[var(--pixel-bg-panel)] p-3 text-center">
        <p className="text-[10px] text-[var(--pixel-text-dim)]">余额</p>
        <p className="text-lg text-[var(--pixel-text-amber)]">¥{balance}</p>
      </div>
      <div className="space-y-1">
        {messages.map(msg => {
          const isIncome = msg.content.includes('+') || msg.content.includes('收入')
          return (
            <div key={msg.id} className="flex items-center justify-between py-1 text-xs">
              <span className="text-[var(--pixel-text-dim)]">{msg.sender}</span>
              <span className={isIncome ? 'text-[var(--pixel-green)]' : 'text-[var(--pixel-red)]'}>
                {msg.content}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Implement HrzhipinApp (job cards)**

```tsx
// src/components/game/phone/HrzhipinApp.tsx
'use client'

import { useGameStore } from '@/store/gameStore'

export function HrzhipinApp() {
  const state = useGameStore(s => s.state)

  if (!state) return null

  const messages = state.phoneMessages
    .filter(m => m.app === 'hrzhipin')
    .sort((a, b) => b.quarter - a.quarter)

  if (messages.length === 0) {
    return <p className="text-xs text-[var(--pixel-text-dim)]">暂无职位</p>
  }

  return (
    <div className="space-y-2">
      {messages.map(msg => (
        <div key={msg.id} className="pixel-border-light bg-[var(--pixel-bg-light)] p-2">
          <h4 className="text-xs text-[var(--pixel-text-bright)]">{msg.sender}</h4>
          <p className="mt-1 text-[10px]">{msg.content}</p>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 6: Implement GenericMessageApp**

```tsx
// src/components/game/phone/GenericMessageApp.tsx
'use client'

import { useGameStore } from '@/store/gameStore'
import type { PhoneApp } from '@/types/game'

interface GenericMessageAppProps {
  app: PhoneApp
}

export function GenericMessageApp({ app }: GenericMessageAppProps) {
  const state = useGameStore(s => s.state)

  if (!state) return null

  const messages = state.phoneMessages
    .filter(m => m.app === app)
    .sort((a, b) => b.quarter - a.quarter)

  if (messages.length === 0) {
    return <p className="text-xs text-[var(--pixel-text-dim)]">暂无消息</p>
  }

  return (
    <div className="space-y-2">
      {messages.map(msg => (
        <div key={msg.id} className="pixel-border-light bg-[var(--pixel-bg-light)] p-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[var(--pixel-text-amber)]">{msg.sender}</span>
            <span className="text-[10px] text-[var(--pixel-text-dim)]">Q{msg.quarter}</span>
          </div>
          <p className="mt-1 text-xs">{msg.content}</p>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add src/components/game/phone/
git commit -m "feat: add phone app content components (XiaoxinApp, MaimaiApp, JinritiaotiaoApp, ZhifubeiApp, HrzhipinApp, GenericMessageApp)"
```

---

## Chunk 4: Action Bar & Save Modal

### Task 18: QuarterlyActions

**Files:**
- Create: `src/components/game/QuarterlyActions.tsx`
- Create: `tests/components/game/QuarterlyActions.test.tsx`

- [ ] **Step 1: Write the test**

```tsx
// tests/components/game/QuarterlyActions.test.tsx
import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuarterlyActions } from '@/components/game/QuarterlyActions'
import type { ActionAllocation } from '@/types/actions'

describe('QuarterlyActions', () => {
  let allocations: ActionAllocation[]
  let onAllocate: ReturnType<typeof vi.fn>
  let onDeallocate: ReturnType<typeof vi.fn>

  beforeEach(() => {
    allocations = []
    onAllocate = vi.fn()
    onDeallocate = vi.fn()
  })

  it('renders Phase 1 action cards', () => {
    render(
      <QuarterlyActions
        phase={1}
        level="L3"
        allocations={allocations}
        staminaUsed={0}
        staminaMax={10}
        npcs={[]}
        onAllocate={onAllocate}
        onDeallocate={onDeallocate}
      />,
    )
    expect(screen.getByText('埋头工作')).toBeDefined()
    expect(screen.getByText('学习充电')).toBeDefined()
    expect(screen.getByText('摸鱼休息')).toBeDefined()
  })

  it('shows resign button only at L6+', () => {
    const { rerender } = render(
      <QuarterlyActions
        phase={1}
        level="L3"
        allocations={allocations}
        staminaUsed={0}
        staminaMax={10}
        npcs={[]}
        onAllocate={onAllocate}
        onDeallocate={onDeallocate}
      />,
    )
    expect(screen.queryByText('辞职创业')).toBeNull()

    rerender(
      <QuarterlyActions
        phase={1}
        level="L6_tech"
        allocations={allocations}
        staminaUsed={0}
        staminaMax={10}
        npcs={[]}
        onAllocate={onAllocate}
        onDeallocate={onDeallocate}
      />,
    )
    expect(screen.getByText('辞职创业')).toBeDefined()
  })

  it('calls onAllocate when card is clicked', async () => {
    const user = userEvent.setup()
    render(
      <QuarterlyActions
        phase={1}
        level="L3"
        allocations={allocations}
        staminaUsed={0}
        staminaMax={10}
        npcs={[]}
        onAllocate={onAllocate}
        onDeallocate={onDeallocate}
      />,
    )

    await user.click(screen.getByText('埋头工作'))
    expect(onAllocate).toHaveBeenCalledWith({ action: 'work_hard' })
  })

  it('disables cards when stamina is full', () => {
    render(
      <QuarterlyActions
        phase={1}
        level="L3"
        allocations={allocations}
        staminaUsed={10}
        staminaMax={10}
        npcs={[]}
        onAllocate={onAllocate}
        onDeallocate={onDeallocate}
      />,
    )
    const btn = screen.getByText('埋头工作').closest('button')
    expect(btn?.disabled).toBe(true)
  })

  it('renders Phase 2 action cards', () => {
    render(
      <QuarterlyActions
        phase={2}
        level="L6_tech"
        allocations={allocations}
        staminaUsed={0}
        staminaMax={10}
        npcs={[]}
        onAllocate={onAllocate}
        onDeallocate={onDeallocate}
      />,
    )
    expect(screen.getByText('打磨产品')).toBeDefined()
    expect(screen.getByText('团队管理')).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project ui tests/components/game/QuarterlyActions.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement QuarterlyActions**

```tsx
// src/components/game/QuarterlyActions.tsx
'use client'

import { useState } from 'react'
import type { ActionAllocation, Phase1Action, Phase2Action } from '@/types/actions'
import { ACTION_STAMINA_COST } from '@/types/actions'
import type { NPC, JobLevel } from '@/types/game'

interface ActionCardConfig {
  action: Phase1Action | Phase2Action
  label: string
  icon: string
}

const PHASE1_ACTIONS: ActionCardConfig[] = [
  { action: 'work_hard', label: '埋头工作', icon: '🔨' },
  { action: 'study', label: '学习充电', icon: '📖' },
  { action: 'socialize', label: '社交应酬', icon: '🍺' },
  { action: 'manage_up', label: '向上管理', icon: '👔' },
  { action: 'slack_off', label: '摸鱼休息', icon: '😴' },
  { action: 'side_hustle', label: '搞副业', icon: '💻' },
  { action: 'job_interview', label: '跳槽面试', icon: '📋' },
]

const PHASE2_ACTIONS: ActionCardConfig[] = [
  { action: 'improve_product', label: '打磨产品', icon: '⚙️' },
  { action: 'recruit', label: '招聘面试', icon: '👤' },
  { action: 'fundraise', label: '融资路演', icon: '💎' },
  { action: 'team_manage', label: '团队管理', icon: '👥' },
  { action: 'biz_develop', label: '商务拓展', icon: '🤝' },
  { action: 'marketing', label: '市场营销', icon: '📣' },
  { action: 'rest', label: '休息调整', icon: '🌿' },
]

const STUDY_TARGETS = [
  { target: 'professional', label: '专业' },
  { target: 'communication', label: '沟通' },
  { target: 'management', label: '管理' },
]

const RESIGN_LEVELS: JobLevel[] = ['L6_tech', 'L6_mgmt', 'L7_tech', 'L7_mgmt', 'L8']

interface QuarterlyActionsProps {
  phase: 1 | 2
  level: JobLevel
  allocations: ActionAllocation[]
  staminaUsed: number
  staminaMax: number
  npcs: NPC[]
  onAllocate: (allocation: ActionAllocation) => void
  onDeallocate: (index: number) => void
}

export function QuarterlyActions({
  phase,
  level,
  allocations,
  staminaUsed,
  staminaMax,
  npcs,
  onAllocate,
  onDeallocate,
}: QuarterlyActionsProps) {
  const [targetPicker, setTargetPicker] = useState<{ action: string; type: 'study' | 'socialize' } | null>(null)

  const actions = phase === 1 ? PHASE1_ACTIONS : PHASE2_ACTIONS
  const canResign = phase === 1 && RESIGN_LEVELS.includes(level)

  const handleClick = (action: string) => {
    if (action === 'study') {
      setTargetPicker({ action, type: 'study' })
      return
    }
    if (action === 'socialize') {
      setTargetPicker({ action, type: 'socialize' })
      return
    }
    onAllocate({ action: action as ActionAllocation['action'] })
  }

  const handleTargetSelect = (target: string) => {
    if (!targetPicker) return
    onAllocate({ action: targetPicker.action as ActionAllocation['action'], target })
    setTargetPicker(null)
  }

  const getCount = (action: string) =>
    allocations.filter(a => a.action === action).length

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-2">
        {actions.map(card => {
          const cost = ACTION_STAMINA_COST[card.action]
          const count = getCount(card.action)
          const disabled = staminaUsed + cost > staminaMax

          return (
            <button
              key={card.action}
              disabled={disabled && count === 0}
              onClick={() => {
                if (count > 0) {
                  const idx = allocations.findLastIndex(a => a.action === card.action)
                  if (idx >= 0) onDeallocate(idx)
                } else {
                  handleClick(card.action)
                }
              }}
              className="pixel-btn relative flex flex-col items-center gap-1 px-3 py-2"
            >
              <span className="text-lg">{card.icon}</span>
              <span className="text-[10px]">{card.label}</span>
              <span className="text-[10px] text-[var(--pixel-text-dim)]">{cost}点</span>
              {count > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center bg-[var(--pixel-text-bright)] text-[10px] text-[var(--pixel-bg)]">
                  ×{count}
                </span>
              )}
            </button>
          )
        })}

        {canResign && (
          <button
            onClick={() => {
              if (confirm('确定辞职创业？此操作不可逆')) {
                onAllocate({ action: 'resign_startup' })
              }
            }}
            className="pixel-btn border-[var(--pixel-red)] px-3 py-2 text-[var(--pixel-red)]"
          >
            <span className="text-lg">🚀</span>
            <span className="block text-[10px]">辞职创业</span>
          </button>
        )}
      </div>

      {/* Target picker overlay */}
      {targetPicker && (
        <div className="absolute bottom-full left-0 mb-2 pixel-border bg-[var(--pixel-bg)] p-3">
          <p className="mb-2 text-xs text-[var(--pixel-text-dim)]">
            {targetPicker.type === 'study' ? '选择学习方向：' : '选择目标：'}
          </p>
          <div className="flex gap-2">
            {targetPicker.type === 'study'
              ? STUDY_TARGETS.map(t => (
                  <button
                    key={t.target}
                    onClick={() => handleTargetSelect(t.target)}
                    className="pixel-btn px-2 py-1 text-xs"
                  >
                    {t.label}
                  </button>
                ))
              : npcs.filter(n => n.isActive).map(npc => (
                  <button
                    key={npc.id}
                    onClick={() => handleTargetSelect(npc.name)}
                    className="pixel-btn px-2 py-1 text-xs"
                  >
                    {npc.name}
                  </button>
                ))
            }
            <button
              onClick={() => setTargetPicker(null)}
              className="pixel-btn px-2 py-1 text-xs text-[var(--pixel-text-dim)]"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project ui tests/components/game/QuarterlyActions.test.tsx`
Expected: 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/game/QuarterlyActions.tsx tests/components/game/QuarterlyActions.test.tsx
git commit -m "feat: add QuarterlyActions with stamina allocation, target picker, and resign button"
```

---

### Task 19: CriticalChoices

**Files:**
- Create: `src/components/game/CriticalChoices.tsx`
- Create: `tests/components/game/CriticalChoices.test.tsx`

- [ ] **Step 1: Write the test**

```tsx
// tests/components/game/CriticalChoices.test.tsx
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CriticalChoices } from '@/components/game/CriticalChoices'
import type { CriticalChoice } from '@/types/actions'

const mockChoices: CriticalChoice[] = [
  {
    choiceId: 'test_a',
    label: '认真听培训',
    staminaCost: 1,
    effects: { statChanges: { professional: 2 } },
    category: '学习',
  },
  {
    choiceId: 'test_b',
    label: '主动请同事吃饭',
    staminaCost: 1,
    effects: { npcFavorChanges: { '张伟': 10 } },
    category: '社交',
  },
  {
    choiceId: 'test_c',
    label: '加班表现积极',
    staminaCost: 2,
    effects: {
      statChanges: { professional: 3 },
      riskEvent: { probability: 0.2, description: '太紧张，出错了' },
    },
    category: '表现',
  },
]

describe('CriticalChoices', () => {
  it('renders all choice cards', () => {
    render(
      <CriticalChoices
        choices={mockChoices}
        staminaRemaining={3}
        staminaPerDay={3}
        currentDay={1}
        maxDays={5}
        onChoose={vi.fn()}
      />,
    )
    expect(screen.getByText('认真听培训')).toBeDefined()
    expect(screen.getByText('主动请同事吃饭')).toBeDefined()
    expect(screen.getByText('加班表现积极')).toBeDefined()
  })

  it('shows risk warning on choices with riskEvent', () => {
    render(
      <CriticalChoices
        choices={mockChoices}
        staminaRemaining={3}
        staminaPerDay={3}
        currentDay={1}
        maxDays={5}
        onChoose={vi.fn()}
      />,
    )
    expect(screen.getByText(/20%/)).toBeDefined()
  })

  it('disables choices that exceed remaining stamina', () => {
    render(
      <CriticalChoices
        choices={mockChoices}
        staminaRemaining={1}
        staminaPerDay={3}
        currentDay={1}
        maxDays={5}
        onChoose={vi.fn()}
      />,
    )
    // test_c costs 2, only 1 remaining
    const card = screen.getByText('加班表现积极').closest('button')
    expect(card?.disabled).toBe(true)
  })

  it('calls onChoose when card is clicked', async () => {
    const user = userEvent.setup()
    const onChoose = vi.fn()
    render(
      <CriticalChoices
        choices={mockChoices}
        staminaRemaining={3}
        staminaPerDay={3}
        currentDay={1}
        maxDays={5}
        onChoose={onChoose}
      />,
    )

    await user.click(screen.getByText('认真听培训'))
    expect(onChoose).toHaveBeenCalledWith(mockChoices[0])
  })

  it('displays day and stamina info', () => {
    render(
      <CriticalChoices
        choices={mockChoices}
        staminaRemaining={3}
        staminaPerDay={3}
        currentDay={2}
        maxDays={5}
        onChoose={vi.fn()}
      />,
    )
    expect(screen.getByText(/第 2 \/ 5 天/)).toBeDefined()
    expect(screen.getByText(/今日体力: 3 \/ 3/)).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project ui tests/components/game/CriticalChoices.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement CriticalChoices**

```tsx
// src/components/game/CriticalChoices.tsx
'use client'

import type { CriticalChoice } from '@/types/actions'

interface CriticalChoicesProps {
  choices: CriticalChoice[]
  staminaRemaining: number
  staminaPerDay: number
  currentDay: number
  maxDays: number
  onChoose: (choice: CriticalChoice) => void
}

function formatEffects(choice: CriticalChoice): string[] {
  const parts: string[] = []
  if (choice.effects.statChanges) {
    const labels: Record<string, string> = {
      health: '健康', professional: '专业', communication: '沟通',
      management: '管理', network: '人脉', mood: '心情',
      money: '金钱', reputation: '声望',
    }
    for (const [key, val] of Object.entries(choice.effects.statChanges)) {
      if (val !== undefined) {
        const label = labels[key] ?? key
        parts.push(`${label}${val > 0 ? '+' : ''}${val}`)
      }
    }
  }
  if (choice.effects.npcFavorChanges) {
    for (const [name, val] of Object.entries(choice.effects.npcFavorChanges)) {
      parts.push(`${name}好感${val > 0 ? '+' : ''}${val}`)
    }
  }
  return parts
}

export function CriticalChoices({
  choices,
  staminaRemaining,
  staminaPerDay,
  currentDay,
  maxDays,
  onChoose,
}: CriticalChoicesProps) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-xs text-[var(--pixel-text-dim)]">
        <span>关键期 第 {currentDay} / {maxDays} 天</span>
        <span>今日体力: {staminaRemaining} / {staminaPerDay}</span>
      </div>
      <div className="flex flex-wrap gap-3">
        {choices.map(choice => {
          const disabled = choice.staminaCost > staminaRemaining
          const effects = formatEffects(choice)
          const hasRisk = !!choice.effects.riskEvent

          return (
            <button
              key={choice.choiceId}
              disabled={disabled}
              onClick={() => onChoose(choice)}
              className="pixel-btn flex w-40 flex-col items-start gap-1 p-3 text-left"
            >
              <div className="flex w-full items-center justify-between">
                <span className="text-[10px] text-[var(--pixel-text-amber)]">
                  {choice.category}
                </span>
                <span className="text-[10px] text-[var(--pixel-text-dim)]">
                  {choice.staminaCost}点
                </span>
              </div>
              <span className="text-xs">{choice.label}</span>
              {effects.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {effects.map((e, i) => (
                    <span key={i} className="text-[10px] text-[var(--pixel-text-bright)]">{e}</span>
                  ))}
                </div>
              )}
              {hasRisk && (
                <span className="text-[10px] text-[var(--pixel-accent)]">
                  ⚠ {Math.round(choice.effects.riskEvent!.probability * 100)}% {choice.effects.riskEvent!.description}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project ui tests/components/game/CriticalChoices.test.tsx`
Expected: 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/game/CriticalChoices.tsx tests/components/game/CriticalChoices.test.tsx
git commit -m "feat: add CriticalChoices with effect preview, risk warnings, and stamina validation"
```

---

### Task 20: ActionBar + SubmitButton

**Files:**
- Replace stub: `src/components/game/ActionBar.tsx`
- Create: `src/components/game/SubmitButton.tsx`

- [ ] **Step 1: Implement SubmitButton**

```tsx
// src/components/game/SubmitButton.tsx
'use client'

import { PixelButton } from '@/components/ui/PixelButton'

interface SubmitButtonProps {
  isLoading: boolean
  isCritical: boolean
  staminaRemaining: number
  staminaMax: number
  onSubmit: () => void
}

export function SubmitButton({
  isLoading,
  isCritical,
  staminaRemaining,
  staminaMax,
  onSubmit,
}: SubmitButtonProps) {
  const handleClick = () => {
    if (!isCritical && staminaRemaining > 0) {
      if (!confirm(`还有 ${staminaRemaining} 点体力未使用，确定结束？`)) {
        return
      }
    }
    onSubmit()
  }

  if (isCritical) return null // Critical mode submits via choice click

  return (
    <PixelButton
      onClick={handleClick}
      disabled={isLoading}
      variant="accent"
    >
      {isLoading ? '处理中...' : '结束本季度 ▶'}
    </PixelButton>
  )
}
```

- [ ] **Step 2: Update ActionBar to orchestrate quarterly/critical modes**

```tsx
// src/components/game/ActionBar.tsx
'use client'

import { useState, useCallback } from 'react'
import { useGameStore } from '@/store/gameStore'
import { QuarterlyActions } from '@/components/game/QuarterlyActions'
import { CriticalChoices } from '@/components/game/CriticalChoices'
import { SubmitButton } from '@/components/game/SubmitButton'
import { PixelProgressBar } from '@/components/ui/PixelProgressBar'
import type { ActionAllocation, CriticalChoice } from '@/types/actions'
import { ACTION_STAMINA_COST } from '@/types/actions'

export function ActionBar() {
  const state = useGameStore(s => s.state)
  const isLoading = useGameStore(s => s.isLoading)
  const submitQuarter = useGameStore(s => s.submitQuarter)
  const submitChoice = useGameStore(s => s.submitChoice)
  const resignStartup = useGameStore(s => s.resignStartup)
  const criticalChoices = useGameStore(s => s.criticalChoices)

  const [allocations, setAllocations] = useState<ActionAllocation[]>([])

  const isCritical = state?.timeMode === 'critical'
  const staminaMax = isCritical ? (state?.criticalPeriod?.staminaPerDay ?? 3) : 10
  const staminaUsed = allocations.reduce(
    (sum, a) => sum + (ACTION_STAMINA_COST[a.action] ?? 0),
    0,
  )
  const staminaRemaining = isCritical
    ? (state?.staminaRemaining ?? 0)
    : staminaMax - staminaUsed

  const handleAllocate = useCallback((alloc: ActionAllocation) => {
    if (alloc.action === 'resign_startup') {
      void resignStartup()
      return
    }
    setAllocations(prev => [...prev, alloc])
  }, [resignStartup])

  const handleDeallocate = useCallback((index: number) => {
    setAllocations(prev => prev.filter((_, i) => i !== index))
  }, [])

  const handleSubmitQuarter = useCallback(() => {
    submitQuarter({ actions: allocations })
    setAllocations([])
  }, [allocations, submitQuarter])

  const handleChoose = useCallback((choice: CriticalChoice) => {
    submitChoice(choice)
  }, [submitChoice])

  if (!state) return null

  return (
    <div data-testid="action-bar" className="border-t-4 border-[var(--pixel-border)] bg-[var(--pixel-bg-light)] p-4">
      <div className="flex items-center gap-4">
        <div className="flex-1">
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
            <QuarterlyActions
              phase={state.phase}
              level={state.job.level}
              allocations={allocations}
              staminaUsed={staminaUsed}
              staminaMax={staminaMax}
              npcs={state.npcs}
              onAllocate={handleAllocate}
              onDeallocate={handleDeallocate}
            />
          )}
        </div>

        <div className="flex shrink-0 flex-col items-center gap-2">
          {!isCritical && (
            <div className="flex items-center gap-2">
              <PixelProgressBar
                value={staminaUsed}
                max={staminaMax}
                label="体力"
                color="var(--pixel-accent)"
              />
              <span className="text-xs text-[var(--pixel-text-dim)]">
                已用 {staminaUsed} / {staminaMax}
              </span>
            </div>
          )}
          <SubmitButton
            isLoading={isLoading}
            isCritical={isCritical}
            staminaRemaining={staminaRemaining}
            staminaMax={staminaMax}
            onSubmit={handleSubmitQuarter}
          />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/game/ActionBar.tsx src/components/game/SubmitButton.tsx
git commit -m "feat: add ActionBar with quarterly/critical mode switching and SubmitButton"
```

---

## Chunk 4: API Contract Closure

### Task 21: Opening Critical Choices + Event-Driven Critical Entry

**Files:**
- Modify: `src/types/events.ts`
- Modify: `src/ai/schemas.ts`
- Modify: `src/app/api/game/new/route.ts`
- Modify: `src/app/api/game/turn/route.ts`
- Modify: `src/ai/orchestration/quarterly.ts`
- Create: `tests/app/api/game/new.test.ts`
- Create: `tests/app/api/game/turn.test.ts`

- [ ] **Step 1: Extend shared contracts before wiring the frontend**

Keep backend validation aligned with the frontend state shape:

- In `src/types/events.ts`, add `criticalType?: CriticalPeriodType` to `GameEvent`
- In `src/ai/schemas.ts`, add `replyOptions?: string[]` and `selectedReply?: string` to `PhoneMessageSchema`
- In `src/ai/schemas.ts`, add `criticalType` to `GameEventSchema`

The frontend will round-trip updated `phoneMessages` through `/api/game/turn`, so schema drift here will cause route validation to fail even if the React code is correct.

- [ ] **Step 2: `/api/game/new` must bootstrap onboarding, not just return raw state**

Update `src/app/api/game/new/route.ts` so it returns:

```ts
{
  success: true,
  state,
  narrative,
  criticalChoices,
}
```

Implementation notes:

- Call `createNewGame()` as before
- Build the opening onboarding payload with the existing AI stack:
  - `runNarrativeAgent(...)` in critical mode
  - `validateChoices(...)` using the player's starting stats and remaining stamina
- Reuse the same `criticalChoices` shape that `/api/game/turn` already returns for normal critical days

- [ ] **Step 3: Quarterly critical events must enter critical mode immediately**

Update `runQuarterlyPipeline()` and the quarterly branch of `/api/game/turn`:

- Find the first event where `triggersCritical === true`
- Require that event to also provide `criticalType`
- Transition the returned state into critical mode with `enterCriticalPeriod(event.criticalType)`
- Reset `staminaRemaining` for the new critical day
- Build opening `criticalChoices` for that critical period before returning the response
- Surface `criticalChoices` in the quarterly JSON response so the store can render them immediately after the popup

This closes the gap between `EventPopup` and `CriticalChoices`: the popup becomes a presentation overlay, not a second backend transition.

- [ ] **Step 4: Add route-level coverage for both bootstrap paths**

Create focused engine-workspace tests for:

- `/api/game/new` returning `narrative` + `criticalChoices`
- `/api/game/turn` quarterly response returning `criticalChoices` when an event triggers a critical period
- `GameEvent.criticalType` being preserved through validation

Run: `npx vitest run --project engine tests/app/api/game/new.test.ts tests/app/api/game/turn.test.ts`
Expected: All targeted route tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/types/events.ts src/ai/schemas.ts src/app/api/game/new/route.ts src/app/api/game/turn/route.ts src/ai/orchestration/quarterly.ts tests/app/api/game/new.test.ts tests/app/api/game/turn.test.ts
git commit -m "feat: bootstrap critical choices from new game and quarterly trigger events"
```

---

### Task 22: Wire EventPopup in GamePage

**Files:**
- Modify: `src/app/game/page.tsx`

- [ ] **Step 1: Revisit GamePage after Task 12 and store wiring are complete**

Update `src/app/game/page.tsx` to render `EventPopup` directly from store state:

```tsx
import { EventPopup } from '@/components/game/EventPopup'

export default function GamePage() {
  const currentEvent = useGameStore(s => s.currentEvent)
  const dismissCurrentEvent = useGameStore(s => s.dismissCurrentEvent)

  // existing code...

  return (
    <div className="flex min-h-screen flex-col bg-[var(--pixel-bg)]">
      {/* existing layout */}

      {currentEvent && (
        <EventPopup
          event={currentEvent}
          onConfirm={dismissCurrentEvent}
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

Important: `onConfirm` only closes the overlay. Do not add a second "enter critical period" fetch here; the API response from Task 21 has already transitioned `state` and populated `criticalChoices`.

- [ ] **Step 2: Verify the popup path manually**

Trigger a mocked quarterly response with a critical event and confirm:

- popup appears exactly once
- dismissing it leaves `state.timeMode === 'critical'`
- `ActionBar` immediately shows the already-returned `criticalChoices`

- [ ] **Step 3: Commit**

```bash
git add src/app/game/page.tsx
git commit -m "feat: wire critical event popup into GamePage"
```

---

### Task 23: Dedicated Resign Route for `resign_startup`

**Files:**
- Create: `src/app/api/game/resign/route.ts`
- Modify: `src/store/gameStore.ts`
- Create: `tests/app/api/game/resign.test.ts`

- [ ] **Step 1: Add `/api/game/resign` instead of overloading `/api/game/turn`**

Implement a dedicated route with this contract:

```ts
POST /api/game/resign
body: { state: GameState }
response: { success, state, narrative, criticalChoices }
```

Route behavior:

- Validate the incoming state
- Reject ineligible levels with `400`
- Call `transitionToPhase2(state)`
- Generate startup-opening narrative + `criticalChoices`
- Run `validateChoices(...)` before returning

- [ ] **Step 2: Keep `ActionBar` and store aligned with the new route**

Task 8 already added `resignStartup()` to the store, and Task 20 now calls it from `ActionBar`. Finish the implementation by making sure the store action posts to `/api/game/resign` and stores:

- `state`
- `narrativeQueue`
- `criticalChoices`
- `currentEvent = null`

- [ ] **Step 3: Add the resign flow tests**

Create `tests/app/api/game/resign.test.ts` with 3 cases:

- eligible level returns `200`
- ineligible level returns `400`
- success payload contains `criticalChoices`

Run:

```bash
npx vitest run --project engine tests/app/api/game/resign.test.ts
npx vitest run --project ui tests/store/gameStore.test.ts
```

Expected: Route test and store test both PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/api/game/resign/route.ts src/store/gameStore.ts tests/app/api/game/resign.test.ts tests/store/gameStore.test.ts
git commit -m "feat: add dedicated resign route for startup transition"
```

---

### Task 24: Feed Phone Replies Into AI Context

**Files:**
- Create: `src/ai/orchestration/phone-context.ts`
- Modify: `src/ai/orchestration/quarterly.ts`
- Modify: `src/ai/orchestration/critical.ts`
- Modify: `src/ai/schemas.ts`
- Create: `tests/ai/orchestration/phone-context.test.ts`

- [ ] **Step 1: Extract recent selected replies into a reusable helper**

Create `buildPhoneReplyContext(messages, limit = 3)`:

```ts
export function buildPhoneReplyContext(
  messages: PhoneMessage[],
  limit: number = 3,
): string | undefined
```

Formatting rules:

- only include messages that have `selectedReply`
- sort newest first
- keep at most the latest 3
- return `undefined` when there is nothing useful to pass

Example output:

```text
最近手机回复：
- 小信 / 王建国: "今晚一起吃饭？" -> 玩家回复: "今晚得加班，下次"
- 叮叮 / 系统通知: "周会改到 9 点" -> 玩家回复: "收到"
```

- [ ] **Step 2: Merge the helper into both AI pipelines**

Quarterly pipeline:

- build `phoneReplyContext` from `settledState.phoneMessages`
- pass it as the existing `playerContext` argument to `runNPCAgent(...)`
- pass the same context to `runNarrativeAgent(...)`

Critical pipeline:

- build `phoneReplyContext` from `storyState.phoneMessages`
- merge it with the existing choice context:

```ts
const playerContext = [
  `玩家选择了：${choice.label}（${choice.category}）`,
  phoneReplyContext,
].filter(Boolean).join('\n')
```

Do not rewrite the agent prompt shape. The existing `playerContext` parameter is enough.

- [ ] **Step 3: Add helper tests**

Create `tests/ai/orchestration/phone-context.test.ts` with 3 cases:

- formats replies correctly
- returns `undefined` for empty input
- respects the max-item limit

Run: `npx vitest run --project engine tests/ai/orchestration/phone-context.test.ts`
Expected: 3 tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/ai/orchestration/phone-context.ts src/ai/orchestration/quarterly.ts src/ai/orchestration/critical.ts src/ai/schemas.ts tests/ai/orchestration/phone-context.test.ts
git commit -m "feat: pass recent phone replies into AI context"
```

---

## Chunk 5: Save & Verification

### Task 25: SaveModal

**Files:**
- Replace stub: `src/components/game/SaveModal.tsx`
- Create: `tests/components/game/SaveModal.test.tsx`

- [ ] **Step 1: Write the test**

```tsx
// tests/components/game/SaveModal.test.tsx
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useGameStore } from '@/store/gameStore'
import { SaveModal } from '@/components/game/SaveModal'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))
import { createNewGame } from '@/engine/state'

// Mock localStorage
const storage: Record<string, string> = {}
vi.stubGlobal('localStorage', {
  getItem: (key: string) => storage[key] ?? null,
  setItem: (key: string, value: string) => { storage[key] = value },
  removeItem: (key: string) => { delete storage[key] },
})

describe('SaveModal', () => {
  beforeEach(() => {
    useGameStore.setState({ state: createNewGame() })
    Object.keys(storage).forEach(k => delete storage[k])
  })

  it('renders 4 save slots', () => {
    render(<SaveModal open={true} onClose={vi.fn()} mode="full" />)
    expect(screen.getByText('自动存档')).toBeDefined()
    expect(screen.getByText('存档1')).toBeDefined()
    expect(screen.getByText('存档2')).toBeDefined()
    expect(screen.getByText('存档3')).toBeDefined()
  })

  it('shows empty state for unused slots', () => {
    render(<SaveModal open={true} onClose={vi.fn()} mode="full" />)
    const empties = screen.getAllByText('空')
    expect(empties.length).toBeGreaterThanOrEqual(3)
  })

  it('does not render when closed', () => {
    const { container } = render(<SaveModal open={false} onClose={vi.fn()} mode="full" />)
    expect(container.innerHTML).toBe('')
  })

  it('load mode hides save and delete buttons', () => {
    render(<SaveModal open={true} onClose={vi.fn()} mode="load" />)
    expect(screen.queryByText('保存')).toBeNull()
  })

  it('save button writes to localStorage', async () => {
    const user = userEvent.setup()
    render(<SaveModal open={true} onClose={vi.fn()} mode="full" />)

    // Find the first save button for slot1
    const saveButtons = screen.getAllByText('保存')
    await user.click(saveButtons[0])

    expect(storage['office_path_save_slot1']).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project ui tests/components/game/SaveModal.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement SaveModal**

```tsx
// src/components/game/SaveModal.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { PixelButton } from '@/components/ui/PixelButton'
import { useGameStore } from '@/store/gameStore'
import { listSaves, deleteSave, type SaveMeta, type SaveSlot, SAVE_SLOTS } from '@/save/storage'

interface SaveModalProps {
  open: boolean
  onClose: () => void
  mode: 'load' | 'full'
}

const SLOT_LABELS: Record<string, string> = {
  auto: '自动存档',
  slot1: '存档1',
  slot2: '存档2',
  slot3: '存档3',
}

export function SaveModal({ open, onClose, mode }: SaveModalProps) {
  const router = useRouter()
  const saveGame = useGameStore(s => s.saveGame)
  const loadGame = useGameStore(s => s.loadGame)
  const state = useGameStore(s => s.state)
  const [saves, setSaves] = useState<SaveMeta[]>([])

  useEffect(() => {
    if (open) {
      setSaves(listSaves())
    }
  }, [open])

  const getSaveMeta = (slot: string) => saves.find(s => s.slot === slot)

  const handleSave = (slot: string) => {
    const existing = getSaveMeta(slot)
    if (existing && !confirm('覆盖已有存档？')) return
    saveGame(slot)
    setSaves(listSaves())
  }

  const handleLoad = (slot: string) => {
    loadGame(slot)
    onClose()
    router.push('/game')
  }

  const handleDelete = (slot: string) => {
    if (!confirm('确定删除此存档？')) return
    deleteSave(slot as SaveSlot)
    setSaves(listSaves())
  }

  return (
    <Modal open={open} onClose={onClose} title="存档管理">
      <div className="space-y-3">
        {SAVE_SLOTS.map(slot => {
          const meta = getSaveMeta(slot)

          return (
            <div
              key={slot}
              className="pixel-border-light flex items-center justify-between bg-[var(--pixel-bg-light)] p-3"
            >
              <div>
                <p className="text-sm">{SLOT_LABELS[slot]}</p>
                {meta ? (
                  <p className="text-[10px] text-[var(--pixel-text-dim)]">
                    Q{meta.quarter} | {meta.level} | {new Date(meta.savedAt).toLocaleString('zh-CN')}
                  </p>
                ) : (
                  <p className="text-[10px] text-[var(--pixel-text-dim)]">空</p>
                )}
              </div>

              <div className="flex gap-2">
                {meta && (
                  <PixelButton onClick={() => handleLoad(slot)}>
                    读取
                  </PixelButton>
                )}
                {mode === 'full' && slot !== 'auto' && (
                  <>
                    <PixelButton onClick={() => handleSave(slot)}>
                      保存
                    </PixelButton>
                    {meta && (
                      <PixelButton
                        variant="danger"
                        onClick={() => handleDelete(slot)}
                      >
                        删除
                      </PixelButton>
                    )}
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </Modal>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project ui tests/components/game/SaveModal.test.tsx`
Expected: 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/game/SaveModal.tsx tests/components/game/SaveModal.test.tsx
git commit -m "feat: add SaveModal with 4-slot save/load/delete and auto-save display"
```

---

### Task 26: Final Integration Verification

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: All engine tests and UI tests PASS across both workspaces

- [ ] **Step 2: Build check**

Run: `npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 3: Commit any final fixes**

If any type errors or missing imports surfaced during build, fix them and commit:

```bash
git add src/ tests/
git commit -m "fix: resolve any remaining type errors from build check"
```
