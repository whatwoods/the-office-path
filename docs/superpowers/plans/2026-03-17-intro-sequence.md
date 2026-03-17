# Intro Sequence Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an engaging opening sequence before game start — graduation narrative → name input → major selection → phone notification from BOSS真聘 → offer letter → accept to enter game.

**Architecture:** New `/intro` route with a state-machine page component that steps through 5 beats (blackscreen → narrative → name+major → phone notification → offer letter). Player choices (name, major) are passed to a modified `createNewGame()` which sets company/title/attributes accordingly. Existing UI components (PixelButton, PixelCard) are reused; new intro-specific components handle animations via CSS keyframes in `globals.css` and inline CSS transitions.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Zustand, Vitest

---

## Chunk 1: Types and Game Engine

### Task 1: Add MajorType and playerName to types

**Files:**
- Modify: `src/types/game.ts`

- [ ] **Step 1: Write the failing test**

Create test file that imports MajorType and checks createNewGame accepts major parameter.

```typescript
// tests/engine/intro.test.ts
import { describe, it, expect } from 'vitest'
import { createNewGame } from '@/engine/state'
import type { MajorType } from '@/types/game'

describe('createNewGame with intro params', () => {
  it('accepts tech major and sets 星云科技', () => {
    const state = createNewGame({ major: 'tech', playerName: '小明' })
    expect(state.job.companyName).toBe('星云科技')
    expect(state.playerName).toBe('小明')
    expect(state.player.professional).toBe(20) // 15 + 5
    expect(state.player.communication).toBe(18) // 20 - 2
  })

  it('accepts finance major and sets 鼎信金融', () => {
    const state = createNewGame({ major: 'finance', playerName: '小红' })
    expect(state.job.companyName).toBe('鼎信金融')
    expect(state.playerName).toBe('小红')
    expect(state.player.communication).toBe(25) // 20 + 5
    expect(state.player.professional).toBe(13) // 15 - 2
  })

  it('accepts liberal major and sets 万合集团', () => {
    const state = createNewGame({ major: 'liberal', playerName: '小刚' })
    expect(state.job.companyName).toBe('万合集团')
    expect(state.playerName).toBe('小刚')
    expect(state.player.network).toBe(10) // 5 + 5
    expect(state.player.professional).toBe(13) // 15 - 2
  })

  it('defaults to tech major and 新员工 when no params', () => {
    const state = createNewGame()
    expect(state.job.companyName).toBe('星云科技')
    expect(state.playerName).toBe('新员工')
  })

  it('sets NPC companyName to match selected company', () => {
    const state = createNewGame({ major: 'finance' })
    for (const npc of state.npcs) {
      expect(npc.companyName).toBe('鼎信金融')
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/engine/intro.test.ts`
Expected: FAIL — `MajorType` not exported, `createNewGame` doesn't accept params, `playerName` doesn't exist on GameState.

- [ ] **Step 3: Add MajorType and playerName to types**

In `src/types/game.ts`, add before the `PlayerAttributes` interface:

```typescript
export type MajorType = 'tech' | 'finance' | 'liberal'
```

In the `GameState` interface, add after `version`:

```typescript
  playerName: string
```

- [ ] **Step 4: Commit**

```bash
git add src/types/game.ts
git commit -m "feat(types): add MajorType and playerName to GameState"
```

### Task 2: Update createNewGame to accept intro params

**Files:**
- Modify: `src/engine/state.ts`

- [ ] **Step 5: Add MAJOR_CONFIG and update createNewGame**

Update imports at top of `src/engine/state.ts`:

```typescript
import { INITIAL_ATTRIBUTES, applyStatChanges } from "@/engine/attributes";
import type { GameState, MajorType, NPC, PlayerAttributes } from "@/types/game";
```

Add after imports:

```typescript
export interface IntroParams {
  major?: MajorType
  playerName?: string
}

const MAJOR_CONFIG: Record<MajorType, {
  company: string
  title: string
  attrBonus: Partial<PlayerAttributes>
}> = {
  tech: {
    company: '星云科技',
    title: '产品运营实习生',
    attrBonus: { professional: 5, communication: -2 },
  },
  finance: {
    company: '鼎信金融',
    title: '客户经理助理实习生',
    attrBonus: { communication: 5, professional: -2 },
  },
  liberal: {
    company: '万合集团',
    title: '行政管理实习生',
    attrBonus: { network: 5, professional: -2 },
  },
}
```

Update `createInitialNPCs` to accept a company name parameter. Keep all 5 NPCs exactly as they are now, but replace every hardcoded `companyName: "星辰互联"` with the `companyName` parameter:

```typescript
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
```

Update `createNewGame` to accept optional params:

```typescript
export function createNewGame(params?: IntroParams): GameState {
  const major = params?.major ?? "tech";
  const playerName = params?.playerName ?? "新员工";
  const config = MAJOR_CONFIG[major];
  const player = applyStatChanges({ ...INITIAL_ATTRIBUTES }, config.attrBonus);

  return {
    version: "1.1",
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
```

**Note:** The default company changes from `"星辰互联"` to `"星云科技"` (the tech major default). This is intentional — `"星辰互联"` was a placeholder. Existing tests that reference `"星辰互联"` will need updating to `"星云科技"`.

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run tests/engine/intro.test.ts`
Expected: PASS — all 5 tests green.

- [ ] **Step 7: Run all existing tests and fix breakage**

Run: `npx vitest run`

Expected breakage: Tests that construct `GameState` objects or call `createNewGame()` may fail because:
1. `playerName` is now required on `GameState` — add `playerName: '新员工'` to any test fixtures that build `GameState` objects manually.
2. `job.companyName` changed from `"星辰互联"` to `"星云科技"` — update assertions accordingly.
3. NPC `companyName` also changed — update NPC-related assertions.

Search for affected test files: `grep -r "星辰互联" tests/` and `grep -r "GameState" tests/` to find all locations that need updating.

- [ ] **Step 8: Commit**

```bash
git add src/engine/state.ts tests/engine/intro.test.ts src/types/game.ts
git commit -m "feat(engine): createNewGame accepts major/playerName, sets company and attributes"
```

### Task 3: Update new game API route to accept intro params

**Files:**
- Modify: `src/app/api/game/new/route.ts`

- [ ] **Step 9: Update API route to pass intro params**

Add the import for `MajorType` and `IntroParams`:

```typescript
import type { MajorType } from "@/types/game";
```

Update the body type and `createNewGame` call:

```typescript
const body = (await request.json()) as {
  aiConfig?: AIConfig
  major?: MajorType
  playerName?: string
}
const state = createNewGame({
  major: body.major,
  playerName: body.playerName,
})
```

Update the narrative prompt to include the actual company name (line 28):

```typescript
`玩家入职了${state.job.companyName}。`,
```

- [ ] **Step 10: Commit**

```bash
git add src/app/api/game/new/route.ts
git commit -m "feat(api): pass major and playerName through new game API"
```

### Task 4: Update gameStore.newGame to accept intro params

**Files:**
- Modify: `src/store/gameStore.ts`

- [ ] **Step 11: Update newGame in store**

Add the import:

```typescript
import type { MajorType } from "@/types/game";
```

Change the `newGame` type in the `GameStore` interface:

```typescript
newGame: (params?: { major?: MajorType; playerName?: string }) => Promise<void>;
```

Update the implementation — only the signature and `body` change, rest stays the same:

```typescript
newGame: async (params) => {
  if (get().isLoading) return;
  set({ isLoading: true, error: null });
  try {
    const res = await fetch("/api/game/new", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...buildAIConfig(),
        major: params?.major,
        playerName: params?.playerName,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      set({ error: data.error ?? "创建游戏失败", isLoading: false });
      return;
    }
    set({
      state: data.state,
      isLoading: false,
      narrativeQueue: data.narrative ? [data.narrative] : [],
      criticalChoices: data.criticalChoices ?? [],
      promotionInfo: buildPromotionInfo(data.state),
      currentEvent: null,
      showQuarterTransition: true,
      lastPerformance: null,
    });
  } catch {
    set({ error: "网络错误", isLoading: false });
  }
},
```

- [ ] **Step 12: Commit**

```bash
git add src/store/gameStore.ts
git commit -m "feat(store): newGame accepts major and playerName params"
```

## Chunk 2: Intro Page and Components

### Task 5: Add intro animations to globals.css

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 13: Add all intro-specific keyframes to globals.css**

Append to end of `src/app/globals.css`:

```css
/* 开场序列动画 */
@keyframes phone-vibrate {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-3px) rotate(-1deg); }
  75% { transform: translateX(3px) rotate(1deg); }
}

@keyframes slide-down {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes offer-fade-in {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
```

- [ ] **Step 14: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(css): add intro sequence animation keyframes"
```

### Task 6: Create BlackScreenText component

**Files:**
- Create: `src/components/intro/BlackScreenText.tsx`

- [ ] **Step 15: Write the BlackScreenText component**

This component shows text character-by-character on a black screen, then fades out. Uses two separate effects for hold and fade to ensure proper cleanup.

```typescript
'use client'

import { useState, useEffect, useRef } from 'react'

interface BlackScreenTextProps {
  text: string
  onComplete: () => void
  charDelay?: number
  holdDelay?: number
  fadeDuration?: number
}

export function BlackScreenText({
  text,
  onComplete,
  charDelay = 120,
  holdDelay = 1500,
  fadeDuration = 800,
}: BlackScreenTextProps) {
  const [displayedChars, setDisplayedChars] = useState(0)
  const [fading, setFading] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  // Typewriter effect
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setDisplayedChars((prev) => {
        const next = prev + 1
        if (next >= text.length) {
          if (intervalRef.current) clearInterval(intervalRef.current)
        }
        return next
      })
    }, charDelay)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [text, charDelay])

  // Hold after typing complete, then start fade
  useEffect(() => {
    if (displayedChars < text.length) return
    const timer = setTimeout(() => setFading(true), holdDelay)
    return () => clearTimeout(timer)
  }, [displayedChars, text.length, holdDelay])

  // Fire onComplete after fade finishes
  useEffect(() => {
    if (!fading) return
    const timer = setTimeout(() => onCompleteRef.current(), fadeDuration)
    return () => clearTimeout(timer)
  }, [fading, fadeDuration])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black"
      style={{
        opacity: fading ? 0 : 1,
        transition: `opacity ${fadeDuration}ms ease-out`,
      }}
    >
      <p className="pixel-glow text-2xl text-[var(--pixel-text-bright)]">
        {text.slice(0, displayedChars)}
        {displayedChars < text.length && (
          <span className="animate-pulse">_</span>
        )}
      </p>
    </div>
  )
}
```

- [ ] **Step 16: Commit**

```bash
git add src/components/intro/BlackScreenText.tsx
git commit -m "feat(intro): add BlackScreenText component with typewriter effect"
```

### Task 7: Create GraduationNarrative component

**Files:**
- Create: `src/components/intro/GraduationNarrative.tsx`

- [ ] **Step 17: Write the GraduationNarrative component**

Shows 3 lines of narrative text fading in one by one, then fades out. Uses ref for onComplete to avoid effect re-fires.

```typescript
'use client'

import { useState, useEffect, useRef } from 'react'

const LINES = [
  '学位证揣进背包，宿舍钥匙交还宿管阿姨。',
  '室友们各奔东西，你拖着行李箱走出校门。',
  '手机里存着三个月前海投简历的记录，大部分石沉大海。',
]

interface GraduationNarrativeProps {
  onComplete: () => void
}

export function GraduationNarrative({ onComplete }: GraduationNarrativeProps) {
  const [visibleLines, setVisibleLines] = useState(0)
  const [fading, setFading] = useState(false)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  // Show lines one by one
  useEffect(() => {
    if (visibleLines >= LINES.length) return
    const timer = setTimeout(() => {
      setVisibleLines((prev) => prev + 1)
    }, 1500)
    return () => clearTimeout(timer)
  }, [visibleLines])

  // Hold after all lines shown, then start fade
  useEffect(() => {
    if (visibleLines < LINES.length) return
    const timer = setTimeout(() => setFading(true), 2000)
    return () => clearTimeout(timer)
  }, [visibleLines])

  // Fire onComplete after fade finishes
  useEffect(() => {
    if (!fading) return
    const timer = setTimeout(() => onCompleteRef.current(), 800)
    return () => clearTimeout(timer)
  }, [fading])

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-black px-8"
      style={{
        opacity: fading ? 0 : 1,
        transition: 'opacity 800ms ease-out',
      }}
    >
      {LINES.map((line, i) => (
        <p
          key={i}
          className="text-lg text-[var(--pixel-text)]"
          style={{
            opacity: i < visibleLines ? 1 : 0,
            transform: i < visibleLines ? 'translateY(0)' : 'translateY(12px)',
            transition: 'opacity 800ms ease-out, transform 800ms ease-out',
          }}
        >
          {line}
        </p>
      ))}
    </div>
  )
}
```

- [ ] **Step 18: Commit**

```bash
git add src/components/intro/GraduationNarrative.tsx
git commit -m "feat(intro): add GraduationNarrative component with fade-in lines"
```

### Task 8: Create NameInput component

**Files:**
- Create: `src/components/intro/NameInput.tsx`

- [ ] **Step 19: Write the NameInput component**

Simple text input with pixel styling for entering player name.

```typescript
'use client'

import { useState } from 'react'
import { PixelButton } from '@/components/ui/PixelButton'

interface NameInputProps {
  onSubmit: (name: string) => void
}

export function NameInput({ onSubmit }: NameInputProps) {
  const [name, setName] = useState('')

  const handleSubmit = () => {
    onSubmit(name.trim())
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit()
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <p className="text-lg text-[var(--pixel-text)]">你叫什么名字？</p>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="输入你的名字"
        maxLength={10}
        autoFocus
        className="pixel-border bg-[var(--pixel-bg-light)] px-4 py-3 text-center text-lg text-[var(--pixel-text-bright)] placeholder:text-[var(--pixel-text-dim)] outline-none w-64"
      />
      <PixelButton onClick={handleSubmit}>
        {name.trim() ? '确认' : '跳过'}
      </PixelButton>
    </div>
  )
}
```

- [ ] **Step 20: Commit**

```bash
git add src/components/intro/NameInput.tsx
git commit -m "feat(intro): add NameInput component"
```

### Task 9: Create MajorSelect component

**Files:**
- Create: `src/components/intro/MajorSelect.tsx`

- [ ] **Step 21: Write the MajorSelect component**

Shows 3 PixelCards for major selection with descriptions. Uses `flex-wrap` for responsive layout.

```typescript
'use client'

import { useState } from 'react'
import { PixelCard } from '@/components/ui/PixelCard'
import { PixelButton } from '@/components/ui/PixelButton'
import type { MajorType } from '@/types/game'

interface MajorOption {
  key: MajorType
  icon: string
  label: string
  description: string
}

const MAJOR_OPTIONS: MajorOption[] = [
  {
    key: 'tech',
    icon: '💻',
    label: '计算机 / 互联网',
    description: '代码写了四年，至少 Bug 不会跟你谈薪资。',
  },
  {
    key: 'finance',
    icon: '📊',
    label: '金融 / 商科',
    description: 'Excel 用得比筷子还熟，PPT 是你的第二语言。',
  },
  {
    key: 'liberal',
    icon: '📚',
    label: '文科 / 综合',
    description: '读了很多书，交了很多朋友，简历上写"沟通能力强"。',
  },
]

interface MajorSelectProps {
  onSelect: (major: MajorType) => void
}

export function MajorSelect({ onSelect }: MajorSelectProps) {
  const [selected, setSelected] = useState<MajorType | null>(null)

  return (
    <div className="flex flex-col items-center gap-8">
      <p className="text-lg text-[var(--pixel-text)]">
        四年的大学生活，你学的是……
      </p>
      <div className="flex flex-wrap justify-center gap-6">
        {MAJOR_OPTIONS.map((opt) => (
          <PixelCard
            key={opt.key}
            selected={selected === opt.key}
            onClick={() => setSelected(opt.key)}
            className="w-56 cursor-pointer p-6 text-center transition-transform hover:-translate-y-1"
          >
            <div className="mb-3 text-4xl">{opt.icon}</div>
            <h3 className="mb-2 text-sm text-[var(--pixel-text-bright)]">
              {opt.label}
            </h3>
            <p className="text-xs text-[var(--pixel-text-dim)]">
              {opt.description}
            </p>
          </PixelCard>
        ))}
      </div>
      {selected && (
        <PixelButton onClick={() => onSelect(selected)}>确认选择</PixelButton>
      )}
    </div>
  )
}
```

- [ ] **Step 22: Commit**

```bash
git add src/components/intro/MajorSelect.tsx
git commit -m "feat(intro): add MajorSelect component with 3 major options"
```

### Task 10: Create PhoneNotification component

**Files:**
- Create: `src/components/intro/PhoneNotification.tsx`

- [ ] **Step 23: Write the PhoneNotification component**

Shows a phone vibration animation then a notification popup from BOSS真聘. Uses keyframes from `globals.css` (no `<style jsx>`).

```typescript
'use client'

import { useState, useEffect } from 'react'
import type { MajorType } from '@/types/game'

const COMPANY_MAP: Record<MajorType, string> = {
  tech: '星云科技',
  finance: '鼎信金融',
  liberal: '万合集团',
}

interface PhoneNotificationProps {
  major: MajorType
  onComplete: () => void
}

export function PhoneNotification({ major, onComplete }: PhoneNotificationProps) {
  const [showNotification, setShowNotification] = useState(false)
  const company = COMPANY_MAP[major]

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowNotification(true)
    }, 1200)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-black">
      {/* Phone vibration icon */}
      <div
        className="text-6xl"
        style={{
          animation: showNotification ? 'none' : 'phone-vibrate 0.15s ease-in-out infinite',
        }}
      >
        📱
      </div>

      {/* Notification popup */}
      {showNotification && (
        <div
          className="pixel-border cursor-pointer bg-[var(--pixel-bg-light)] p-6 max-w-md"
          style={{
            animation: 'slide-down 0.4s ease-out',
          }}
          onClick={onComplete}
        >
          <div className="mb-2 flex items-center gap-2">
            <span className="text-sm text-[var(--pixel-text-amber)]">📧 BOSS真聘</span>
          </div>
          <p className="text-sm text-[var(--pixel-text)]">
            恭喜！您已通过【{company}】的终面，offer 已发送至您的邮箱。
          </p>
          <p className="mt-3 text-center text-xs text-[var(--pixel-text-dim)]">
            点击查看
          </p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 24: Commit**

```bash
git add src/components/intro/PhoneNotification.tsx
git commit -m "feat(intro): add PhoneNotification with vibrate and BOSS真聘 popup"
```

### Task 11: Create OfferLetter component

**Files:**
- Create: `src/components/intro/OfferLetter.tsx`

- [ ] **Step 25: Write the OfferLetter component**

Pixel-styled offer letter with company/position based on major selection. Uses `offer-fade-in` keyframe from `globals.css`.

```typescript
'use client'

import { PixelButton } from '@/components/ui/PixelButton'
import type { MajorType } from '@/types/game'

const OFFER_CONFIG: Record<MajorType, { company: string; title: string }> = {
  tech: { company: '星云科技', title: '产品运营实习生' },
  finance: { company: '鼎信金融', title: '客户经理助理实习生' },
  liberal: { company: '万合集团', title: '行政管理实习生' },
}

interface OfferLetterProps {
  playerName: string
  major: MajorType
  onAccept: () => void
  isLoading: boolean
}

export function OfferLetter({ playerName, major, onAccept, isLoading }: OfferLetterProps) {
  const config = OFFER_CONFIG[major]

  return (
    <div
      className="pixel-border bg-[var(--pixel-bg-light)] p-8 max-w-lg w-full"
      style={{ animation: 'offer-fade-in 0.6s ease-out' }}
    >
      <h2 className="mb-6 text-center text-xl text-[var(--pixel-text-amber)]">
        ✉ 录 用 通 知 书
      </h2>

      <div className="space-y-4 text-sm text-[var(--pixel-text)]">
        <p>{playerName} 同学：</p>
        <p>恭喜您通过我司面试，现正式向您发出录用邀请。</p>

        <div className="pixel-border-light bg-[var(--pixel-bg-panel)] p-4 space-y-2">
          <p>
            <span className="text-[var(--pixel-text-dim)]">公司：</span>
            <span className="text-[var(--pixel-text-bright)]">{config.company}</span>
          </p>
          <p>
            <span className="text-[var(--pixel-text-dim)]">职位：</span>
            <span className="text-[var(--pixel-text-bright)]">{config.title}</span>
          </p>
          <p>
            <span className="text-[var(--pixel-text-dim)]">月薪：</span>
            <span className="text-[var(--pixel-text-bright)]">3,000 元</span>
          </p>
          <p>
            <span className="text-[var(--pixel-text-dim)]">入职日期：</span>
            <span className="text-[var(--pixel-text-bright)]">2026年7月1日</span>
          </p>
        </div>

        <p>期待你的加入！</p>
        <p className="text-right text-[var(--pixel-text-dim)]">
          —— 人力资源部 王芳
        </p>
      </div>

      <div className="mt-8 text-center">
        <PixelButton
          variant="accent"
          onClick={onAccept}
          disabled={isLoading}
        >
          {isLoading ? '正在入职...' : '接受 Offer，开启打工之路'}
        </PixelButton>
      </div>
    </div>
  )
}
```

- [ ] **Step 26: Commit**

```bash
git add src/components/intro/OfferLetter.tsx
git commit -m "feat(intro): add OfferLetter component with dynamic company/title"
```

### Task 12: Create intro page state machine

**Files:**
- Create: `src/app/intro/page.tsx`

- [ ] **Step 27: Create the intro page with state machine**

The intro page manages phase transitions and collects player choices. Error state from the store is displayed if game creation fails.

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useGameStore } from '@/store/gameStore'
import { ErrorBanner } from '@/components/game/ErrorBanner'
import type { MajorType } from '@/types/game'
import { BlackScreenText } from '@/components/intro/BlackScreenText'
import { GraduationNarrative } from '@/components/intro/GraduationNarrative'
import { NameInput } from '@/components/intro/NameInput'
import { MajorSelect } from '@/components/intro/MajorSelect'
import { PhoneNotification } from '@/components/intro/PhoneNotification'
import { OfferLetter } from '@/components/intro/OfferLetter'

type IntroPhase =
  | 'blackscreen'
  | 'narrative'
  | 'name-input'
  | 'major-select'
  | 'phone-notification'
  | 'offer-letter'

export default function IntroPage() {
  const router = useRouter()
  const { newGame, isLoading } = useGameStore()
  const [phase, setPhase] = useState<IntroPhase>('blackscreen')
  const [playerName, setPlayerName] = useState('')
  const [major, setMajor] = useState<MajorType | null>(null)

  const handleAcceptOffer = async () => {
    if (!major) return
    await newGame({ major, playerName: playerName || '新员工' })
    if (useGameStore.getState().state) {
      router.push('/game')
    }
    // If newGame failed, store.error is set and ErrorBanner will display it
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--pixel-bg)]">
      <div className="fixed top-0 left-0 right-0 z-[60]">
        <ErrorBanner />
      </div>

      {phase === 'blackscreen' && (
        <BlackScreenText
          text="2026年6月，你终于毕业了。"
          onComplete={() => setPhase('narrative')}
        />
      )}
      {phase === 'narrative' && (
        <GraduationNarrative
          onComplete={() => setPhase('name-input')}
        />
      )}
      {phase === 'name-input' && (
        <NameInput
          onSubmit={(name) => {
            setPlayerName(name)
            setPhase('major-select')
          }}
        />
      )}
      {phase === 'major-select' && (
        <MajorSelect
          onSelect={(selected) => {
            setMajor(selected)
            setPhase('phone-notification')
          }}
        />
      )}
      {phase === 'phone-notification' && major && (
        <PhoneNotification
          major={major}
          onComplete={() => setPhase('offer-letter')}
        />
      )}
      {phase === 'offer-letter' && major && (
        <OfferLetter
          playerName={playerName || '新员工'}
          major={major}
          onAccept={handleAcceptOffer}
          isLoading={isLoading}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 28: Commit**

```bash
git add src/app/intro/page.tsx
git commit -m "feat(intro): add intro page with phase state machine"
```

## Chunk 3: Wiring and Integration

### Task 13: Update landing page to route to /intro

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 29: Change "新游戏" to route to /intro**

In `src/app/page.tsx`:

1. Remove the `useGameStore` import entirely — it is no longer used on this page (ErrorBanner has its own internal store access).

2. Remove the line: `const { newGame, isLoading } = useGameStore()`

3. Replace `handleNewGame`:

```typescript
const handleNewGame = () => {
  router.push('/intro')
}
```

4. Update the button — remove `disabled={isLoading}` and loading text:

```typescript
<PixelButton onClick={handleNewGame}>
  新游戏
</PixelButton>
```

The "读取存档" and "设置" buttons remain unchanged.

- [ ] **Step 30: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(landing): route '新游戏' to /intro instead of directly creating game"
```

### Task 14: Add /game page guard for direct navigation

**Files:**
- Modify: `src/app/game/page.tsx`

- [ ] **Step 31: Add redirect guard if no game state exists**

At the top of the game page component, check if game state exists. If not, redirect to landing page. Check whether this guard already exists; if it does, skip this step.

If it does not exist, add near the top of the component:

```typescript
const router = useRouter()
const state = useGameStore((s) => s.state)

useEffect(() => {
  if (!state) {
    router.replace('/')
  }
}, [state, router])

if (!state) return null
```

This prevents broken state when a user navigates directly to `/game` without going through `/intro` or loading a save.

- [ ] **Step 32: Commit**

```bash
git add src/app/game/page.tsx
git commit -m "fix(game): redirect to landing if no game state on direct /game access"
```

### Task 15: Verify full flow end-to-end

- [ ] **Step 33: Run all tests**

Run: `npx vitest run`
Expected: All tests pass, including the new intro.test.ts.

- [ ] **Step 34: Run dev server and manually test the flow**

Run: `npm run dev`

Manual test checklist:
1. Landing page loads → click "新游戏" → navigates to `/intro`
2. "读取存档" button still opens save modal and works correctly
3. "设置" button still opens settings modal and works correctly
4. Black screen with typewriter "2026年6月，你终于毕业了。" → fades out
5. Graduation narrative: 3 lines fade in one by one → fades out
6. Name input appears → type name → click "确认"
7. Name input → click "跳过" (empty name) → defaults to "新员工"
8. Major selection: 3 cards → click one → click "确认选择"
9. Phone vibrates → BOSS真聘 notification appears with correct company → click
10. Offer letter shows with correct name/company/title/salary/date → click "接受 Offer"
11. Loading state → redirects to `/game` with correct game state
12. Game starts with correct company name and adjusted attributes
13. Navigate directly to `/game` without game state → redirects to `/`
14. Navigate directly to `/intro` → works fine (stateless page)
15. Press browser back button during intro → returns to landing page gracefully

- [ ] **Step 35: Final commit if any adjustments needed**

```bash
git add -A
git commit -m "feat(intro): complete intro sequence integration"
```
