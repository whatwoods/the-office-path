# Mobile UI Adaptation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adapt all pages of The Office Path for mobile devices with bottom tab navigation on the game page.

**Architecture:** Replace the existing stacked mobile layout on `/game` with a bottom tab bar (Story/Attributes/Relationships/Phone). ActionBar lives inside the Story tab and scrolls with content. Landing and intro pages get minor responsive touch-ups. Single breakpoint at 1024px; desktop layout unchanged.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, Zustand 5

**Spec:** `docs/superpowers/specs/2026-03-17-mobile-ui-adaptation-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/components/game/MobileTabBar.tsx` | Create | Bottom tab navigation bar, mobile only |
| `src/app/game/page.tsx` | Modify | Add mobile tab state, conditional rendering per tab |
| `src/components/game/TopStatusBar.tsx` | Modify | Compact single-row on mobile |
| `src/components/game/QuarterlyActions.tsx` | Modify | Horizontal scroll for action cards on mobile |
| `src/components/game/DashboardPanel.tsx` | No change | Hidden on mobile via GamePage conditional rendering |
| `src/components/game/PhoneAppView.tsx` | Modify | Back button styling for mobile |
| `src/components/home/LandingMenu.tsx` | Modify | Narrow-screen title size, safe area |
| `src/components/intro/NameInput.tsx` | Modify | Max-width constraint |
| `src/components/intro/MajorSelect.tsx` | Modify | Responsive card layout |
| `src/components/intro/OfferLetter.tsx` | Modify | Responsive padding for narrow screens |
| `src/app/layout.tsx` | Modify | Add viewport export |
| `src/app/globals.css` | Modify | Safe area utility, scroll behavior |
| `src/__tests__/components/game/MobileTabBar.test.tsx` | Create | Tab bar unit tests |
| `src/__tests__/components/game/GamePage.mobile.test.tsx` | Create | Mobile layout integration tests |

---

## Chunk 1: Foundation — Viewport, Global CSS, MobileTabBar

### Task 1: Viewport Meta and Global CSS

**Files:**
- Modify: `src/app/layout.tsx:12-15`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add viewport export to layout.tsx**

In `src/app/layout.tsx`, add the viewport export after the existing metadata export:

```ts
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}
```

- [ ] **Step 2: Add safe area and scroll utilities to globals.css**

Append to `src/app/globals.css`:

```css
/* Safe area padding for notched devices */
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
```

- [ ] **Step 3: Verify dev server starts without errors**

Run: `npm run dev`
Expected: No build errors, landing page renders normally.

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css
git commit -m "feat: add viewport-fit cover and safe area CSS utilities"
```

---

### Task 2: Create MobileTabBar Component

**Files:**
- Create: `src/components/game/MobileTabBar.tsx`
- Create: `src/__tests__/components/game/MobileTabBar.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/components/game/MobileTabBar.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MobileTabBar } from '@/components/game/MobileTabBar'

describe('MobileTabBar', () => {
  const defaultProps = {
    activeTab: 'story' as const,
    onTabChange: vi.fn(),
  }

  it('renders four tab buttons', () => {
    render(<MobileTabBar {...defaultProps} />)
    expect(screen.getByText('故事')).toBeDefined()
    expect(screen.getByText('属性')).toBeDefined()
    expect(screen.getByText('关系')).toBeDefined()
    expect(screen.getByText('手机')).toBeDefined()
  })

  it('highlights active tab with accent color', () => {
    render(<MobileTabBar {...defaultProps} activeTab="attributes" />)
    const btn = screen.getByText('属性').closest('button')!
    expect(btn.className).toContain('text-[var(--pixel-text-bright)]')
  })

  it('calls onTabChange when a tab is tapped', () => {
    const onTabChange = vi.fn()
    render(<MobileTabBar {...defaultProps} onTabChange={onTabChange} />)
    fireEvent.click(screen.getByText('关系'))
    expect(onTabChange).toHaveBeenCalledWith('relationships')
  })

  it('is hidden on desktop via min-[1024px]:hidden', () => {
    const { container } = render(<MobileTabBar {...defaultProps} />)
    const nav = container.firstElementChild!
    expect(nav.className).toContain('min-[1024px]:hidden')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/components/game/MobileTabBar.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement MobileTabBar**

Create `src/components/game/MobileTabBar.tsx`:

```tsx
'use client'

export type MobileTab = 'story' | 'attributes' | 'relationships' | 'phone'

interface MobileTabBarProps {
  activeTab: MobileTab
  onTabChange: (tab: MobileTab) => void
}

const TABS: { key: MobileTab; icon: string; label: string }[] = [
  { key: 'story', icon: '📖', label: '故事' },
  { key: 'attributes', icon: '📊', label: '属性' },
  { key: 'relationships', icon: '👥', label: '关系' },
  { key: 'phone', icon: '📱', label: '手机' },
]

export function MobileTabBar({ activeTab, onTabChange }: MobileTabBarProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t-4 border-[var(--pixel-border)] bg-[var(--pixel-bg-panel)] pb-safe min-[1024px]:hidden">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onTabChange(tab.key)}
          className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${
            activeTab === tab.key
              ? 'text-[var(--pixel-text-bright)]'
              : 'text-[var(--pixel-text-dim)]'
          }`}
        >
          <span className="text-base">{tab.icon}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/components/game/MobileTabBar.test.tsx`
Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/game/MobileTabBar.tsx src/__tests__/components/game/MobileTabBar.test.tsx
git commit -m "feat: add MobileTabBar component with tests"
```

---

## Chunk 2: Game Page — Mobile Tab Navigation

### Task 3: Refactor GamePage for Mobile Tabs

**Files:**
- Modify: `src/app/game/page.tsx`

- [ ] **Step 1: Write integration test for mobile layout**

Create `src/__tests__/components/game/GamePage.mobile.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

// Mock game store with a valid state
const mockState = {
  currentQuarter: { year: 2024, quarter: 1 },
  money: 8000,
  job: { level: '实习生', companyName: '某科技' },
  phase: 1,
  attributes: { health: 50, professional: 50, communication: 50, management: 50, network: 50, mood: 50, reputation: 50 },
  npcs: [],
  phoneMessages: {},
  criticalPeriod: null,
}

vi.mock('@/store/gameStore', () => ({
  useGameStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      state: mockState,
      showSaveModal: false,
      setShowSaveModal: vi.fn(),
      currentEvent: null,
      dismissCurrentEvent: vi.fn(),
      showQuarterTransition: false,
      dismissQuarterTransition: vi.fn(),
      lastPerformance: null,
      dismissPerformance: vi.fn(),
      isLoading: false,
      activePanel: 'attributes',
      activePhoneApp: null,
      criticalChoices: [],
      submitQuarter: vi.fn(),
      submitChoice: vi.fn(),
      resignStartup: vi.fn(),
      setActivePanel: vi.fn(),
      setActivePhoneApp: vi.fn(),
      promotionInfo: null,
      narrativeQueue: [],
    }),
}))

// Minimal component mocks
vi.mock('@/components/game/StoryPanel', () => ({
  StoryPanel: () => <div data-testid="story-panel">Story</div>,
}))
vi.mock('@/components/game/ActionBar', () => ({
  ActionBar: () => <div data-testid="action-bar">ActionBar</div>,
}))
vi.mock('@/components/game/DashboardPanel', () => ({
  DashboardPanel: () => <div data-testid="dashboard-panel">Dashboard</div>,
}))
vi.mock('@/components/game/AttributesTab', () => ({
  AttributesTab: () => <div data-testid="attributes-tab">Attributes</div>,
}))
vi.mock('@/components/game/RelationshipsTab', () => ({
  RelationshipsTab: () => <div data-testid="relationships-tab">Relationships</div>,
}))
vi.mock('@/components/game/PhoneTab', () => ({
  PhoneTab: () => <div data-testid="phone-tab">Phone</div>,
}))

import GamePage from '@/app/game/page'

describe('GamePage mobile layout', () => {
  it('renders MobileTabBar', () => {
    render(<GamePage />)
    expect(screen.getByText('故事')).toBeDefined()
    expect(screen.getByText('属性')).toBeDefined()
  })

  it('shows story panel and action bar by default', () => {
    render(<GamePage />)
    expect(screen.getByTestId('story-panel')).toBeDefined()
    expect(screen.getByTestId('action-bar')).toBeDefined()
  })

  it('switches to attributes tab when clicked', () => {
    render(<GamePage />)
    fireEvent.click(screen.getByText('属性'))
    expect(screen.getByTestId('attributes-tab')).toBeDefined()
  })

  it('hides action bar on non-story tabs', () => {
    render(<GamePage />)
    fireEvent.click(screen.getByText('关系'))
    expect(screen.queryByTestId('action-bar')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/components/game/GamePage.mobile.test.tsx`
Expected: FAIL — MobileTabBar not found in output / tab switching not implemented.

- [ ] **Step 3: Refactor GamePage**

Replace `src/app/game/page.tsx` with:

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import { TopStatusBar } from '@/components/game/TopStatusBar'
import { ErrorBanner } from '@/components/game/ErrorBanner'
import { StoryPanel } from '@/components/game/StoryPanel'
import { DashboardPanel } from '@/components/game/DashboardPanel'
import { ActionBar } from '@/components/game/ActionBar'
import { AttributesTab } from '@/components/game/AttributesTab'
import { RelationshipsTab } from '@/components/game/RelationshipsTab'
import { PhoneTab } from '@/components/game/PhoneTab'
import { SaveModal } from '@/components/game/SaveModal'
import { EventPopup } from '@/components/game/EventPopup'
import { QuarterTransition } from '@/components/game/QuarterTransition'
import { PerformancePopup } from '@/components/game/PerformancePopup'
import { MobileTabBar, type MobileTab } from '@/components/game/MobileTabBar'

export default function GamePage() {
  const router = useRouter()
  const state = useGameStore(s => s.state)
  const showSaveModal = useGameStore(s => s.showSaveModal)
  const setShowSaveModal = useGameStore(s => s.setShowSaveModal)
  const currentEvent = useGameStore(s => s.currentEvent)
  const dismissCurrentEvent = useGameStore(s => s.dismissCurrentEvent)
  const showQuarterTransition = useGameStore(s => s.showQuarterTransition)
  const dismissQuarterTransition = useGameStore(s => s.dismissQuarterTransition)
  const lastPerformance = useGameStore(s => s.lastPerformance)
  const dismissPerformance = useGameStore(s => s.dismissPerformance)

  const [activeMobileTab, setActiveMobileTab] = useState<MobileTab>('story')

  useEffect(() => {
    if (!state) {
      router.push('/')
    }
  }, [state, router])

  if (!state) return null

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[var(--pixel-bg)]">
      <TopStatusBar />
      <ErrorBanner />

      {/* Desktop layout: side-by-side */}
      <div className="hidden flex-1 overflow-hidden min-[1024px]:flex min-[1024px]:flex-row">
        <div className="w-[70%] overflow-y-auto p-4">
          <StoryPanel />
        </div>
        <div className="w-[30%] overflow-y-auto border-l-4 border-[var(--pixel-border)]">
          <DashboardPanel />
        </div>
      </div>
      <div className="hidden min-[1024px]:block">
        <ActionBar />
      </div>

      {/* Mobile layout: tab-based */}
      <div className="flex flex-1 flex-col overflow-hidden min-[1024px]:hidden">
        {activeMobileTab === 'story' && (
          <div className="flex flex-1 flex-col overflow-y-auto pb-[calc(56px+env(safe-area-inset-bottom,0px))]">
            <div className="flex-1 p-3">
              <StoryPanel />
            </div>
            <ActionBar />
          </div>
        )}
        {activeMobileTab === 'attributes' && (
          <div className="flex-1 overflow-y-auto p-3 pb-[56px]">
            <AttributesTab />
          </div>
        )}
        {activeMobileTab === 'relationships' && (
          <div className="flex-1 overflow-y-auto p-3 pb-[56px]">
            <RelationshipsTab />
          </div>
        )}
        {activeMobileTab === 'phone' && (
          <div className="flex-1 overflow-y-auto p-3 pb-[56px]">
            <PhoneTab />
          </div>
        )}
      </div>

      <MobileTabBar activeTab={activeMobileTab} onTabChange={setActiveMobileTab} />

      {currentEvent && (
        <EventPopup
          event={currentEvent}
          onConfirm={dismissCurrentEvent}
        />
      )}

      {showQuarterTransition && (
        <QuarterTransition
          quarter={state.currentQuarter}
          criticalPeriod={state.criticalPeriod}
          onComplete={dismissQuarterTransition}
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

Key changes from current:
- `min-h-screen` → `h-[100dvh]` with `overflow-hidden` to prevent iOS bounce
- Desktop layout wrapped in `hidden min-[1024px]:flex`
- Mobile layout wrapped in `min-[1024px]:hidden` with tab-based content switching
- ActionBar moved inside Story tab on mobile
- Mobile content areas have bottom padding to clear the tab bar (tab bar itself has `pb-safe` for notched devices)
- `activeMobileTab` local state drives mobile content switching

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/components/game/GamePage.mobile.test.tsx`
Expected: 4 tests PASS.

- [ ] **Step 5: Run full test suite**

Run: `npx vitest run`
Expected: All existing tests still pass.

- [ ] **Step 6: Commit**

```bash
git add src/app/game/page.tsx src/__tests__/components/game/GamePage.mobile.test.tsx
git commit -m "feat: add mobile tab navigation to game page"
```

---

## Chunk 3: Component Adaptations — TopStatusBar, PhoneAppView

### Task 4: TopStatusBar Compact Mobile Layout

**Files:**
- Modify: `src/components/game/TopStatusBar.tsx`

- [ ] **Step 1: Update TopStatusBar for single-row mobile layout**

Replace the main content div (currently `flex flex-col gap-2 min-[1024px]:...`) in `src/components/game/TopStatusBar.tsx`:

Current structure (lines 22-45): wraps to two rows on mobile.

New structure: always `flex-row` on mobile, hide title and job info below 1024px.

```tsx
{/* Outer container */}
<div className="pixel-border-light bg-[var(--pixel-bg-panel)] px-3 py-2 sm:px-4">
  <div className="flex h-10 flex-row items-center justify-between min-[1024px]:h-12">
    {/* Left: title (desktop only) + quarter */}
    <div className="flex items-center gap-2 text-xs sm:text-sm min-[1024px]:gap-6">
      <span className="hidden text-base pixel-glow text-[var(--pixel-text-bright)] min-[1024px]:inline">
        打工之道
      </span>
      <span>Q{state.currentQuarter}</span>
      {/* Job info: desktop only */}
      <span className="hidden min-[1024px]:inline">
        {state.job.level} {state.job.companyName}
      </span>
    </div>

    {/* Right: money + critical period (desktop) + buttons */}
    <div className="flex items-center gap-2 text-xs sm:text-sm min-[1024px]:gap-4">
      {state.criticalPeriod && (
        <span className="hidden text-[var(--pixel-accent)] min-[1024px]:inline">
          关键期 {state.criticalPeriod.currentDay}/{state.criticalPeriod.maxDays}
        </span>
      )}
      <span className="text-[var(--pixel-text-amber)]">¥{money}</span>
      <button onClick={() => setShowSaveModal(true)} className="pixel-btn px-2 py-0.5 text-xs">存档</button>
      <button onClick={() => setShowSettings(true)} className="pixel-btn px-2 py-0.5 text-xs">⚙</button>
    </div>
  </div>
</div>
```

Note: `money` is derived from `state.player.money.toLocaleString('zh-CN')` (existing line 14). The `state.currentQuarter` is a simple value (not an object), matching the existing `Q{state.currentQuarter}` pattern.

- [ ] **Step 2: Verify layout in browser (desktop unchanged, mobile single row)**

Run: `npm run dev`
Check desktop (>=1024px): title visible, job info visible, two-area layout.
Check mobile (<1024px): single row, no title, no job info, quarter + money + icons.

- [ ] **Step 3: Run existing tests**

Run: `npx vitest run`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/game/TopStatusBar.tsx
git commit -m "feat: compact TopStatusBar layout for mobile"
```

---

### Task 5: PhoneAppView Back Navigation

**Files:**
- Modify: `src/components/game/PhoneAppView.tsx`

- [ ] **Step 1: Update PhoneAppView header for mobile**

The current header (line 50-57 of PhoneAppView.tsx) has a back button. Ensure it's touch-friendly on mobile. Update the header section:

```tsx
<div className="flex items-center gap-2 border-b-2 border-[var(--pixel-border)] p-2 sm:p-3">
  <button
    onClick={() => setActivePhoneApp(null)}
    className="pixel-btn px-2 py-1 text-xs sm:text-sm"
  >
    ← 返回
  </button>
  <span className="flex-1 text-center text-sm">
    {APP_LABELS[activePhoneApp] ?? activePhoneApp}
  </span>
</div>
```

Changes: Added `sm:p-3` and `sm:text-sm` for responsive sizing.

- [ ] **Step 2: Verify in browser**

Open phone tab on mobile, click an app. Verify:
- Back button is easily tappable (minimum 44px touch target)
- App name is centered
- Content fills available space

- [ ] **Step 3: Commit**

```bash
git add src/components/game/PhoneAppView.tsx
git commit -m "feat: improve PhoneAppView header for mobile touch targets"
```

---

## Chunk 4: Landing Page and Intro Page Touch-ups

### Task 6: Landing Page Responsive Refinements

**Files:**
- Modify: `src/components/home/LandingMenu.tsx`

- [ ] **Step 1: Add narrow-screen title size and safe area**

Update `src/components/home/LandingMenu.tsx`:

Change the title `h1` class from:
```
pixel-glow mb-3 text-4xl text-[var(--pixel-text-bright)] sm:text-5xl lg:text-6xl
```
To:
```
pixel-glow mb-3 max-[374px]:text-3xl text-4xl text-[var(--pixel-text-bright)] sm:text-5xl lg:text-6xl
```

This only reduces to `text-3xl` on screens narrower than 375px (e.g., iPhone SE). All other breakpoints unchanged.

Change the button container from:
```
mt-6 flex flex-col gap-3 sm:mt-8 sm:gap-4
```
To:
```
mt-6 flex flex-col gap-3 pb-safe sm:mt-8 sm:gap-4
```

- [ ] **Step 2: Verify in browser at various widths**

Check 320px, 375px, 768px, 1024px+ widths.
Expected: Title scales smoothly, buttons have safe area padding.

- [ ] **Step 3: Commit**

```bash
git add src/components/home/LandingMenu.tsx
git commit -m "feat: refine landing page for narrow screens and safe areas"
```

---

### Task 7: Intro Page Component Touch-ups

**Files:**
- Modify: `src/components/intro/NameInput.tsx`
- Modify: `src/components/intro/MajorSelect.tsx`
- Modify: `src/components/intro/OfferLetter.tsx`
- Modify: `src/app/intro/page.tsx`

- [ ] **Step 1: Fix NameInput max-width**

In `src/components/intro/NameInput.tsx`, change the input field class from `w-64` to `w-full max-w-64`:

```tsx
<input
  // ... existing props
  className="w-full max-w-64 pixel-border bg-[var(--pixel-bg-light)] px-3 py-2 text-center text-[var(--pixel-text)] outline-none"
/>
```

Also add `w-full max-w-sm` to the outer container to prevent content from touching edges:

```tsx
<div className="flex w-full max-w-sm flex-col items-center gap-8">
```

- [ ] **Step 2: Fix MajorSelect card layout for narrow screens**

In `src/components/intro/MajorSelect.tsx`, change the cards wrapper class from:
```
flex flex-wrap justify-center gap-6
```
To:
```
flex flex-wrap justify-center gap-4 sm:gap-6
```

Change each card's width from `w-56` to `w-full max-w-56 sm:w-56`:

```tsx
<PixelCard
  className={`w-full max-w-56 cursor-pointer ... sm:w-56`}
>
```

Also add `w-full max-w-lg px-4` to the outer container:

```tsx
<div className="flex w-full max-w-lg flex-col items-center gap-6 px-4 sm:gap-8">
```

- [ ] **Step 3: Fix OfferLetter responsive padding**

In `src/components/intro/OfferLetter.tsx`, change the main container class (line 29) from:
```
pixel-border w-full max-w-lg bg-[var(--pixel-bg-light)] p-8
```
To:
```
pixel-border w-full max-w-lg bg-[var(--pixel-bg-light)] p-4 sm:p-8
```

This reduces padding on narrow screens to prevent the letter from overflowing.

- [ ] **Step 4: Add safe area and scroll support to intro page**

In `src/app/intro/page.tsx`, change the outer container class (line 45) from:
```
flex min-h-screen items-center justify-center bg-[var(--pixel-bg)] px-6
```
To:
```
flex min-h-[100dvh] items-center justify-center overflow-y-auto bg-[var(--pixel-bg)] px-4 pb-safe sm:px-6
```

Changes: `min-h-screen` → `min-h-[100dvh]` for mobile viewport, `overflow-y-auto` for soft keyboard scroll, `pb-safe` for notched devices, reduced mobile padding.

- [ ] **Step 5: Verify in browser**

Navigate to `/intro`, check at 320px and 375px widths:
- NameInput: input doesn't overflow screen
- MajorSelect: cards stack single-column on narrow screens, two-up on wider
- OfferLetter: content fits within screen, padding comfortable
- Open soft keyboard (DevTools > More tools > Sensors): content remains scrollable

- [ ] **Step 6: Commit**

```bash
git add src/components/intro/NameInput.tsx src/components/intro/MajorSelect.tsx src/components/intro/OfferLetter.tsx src/app/intro/page.tsx
git commit -m "feat: responsive intro components for narrow screens"
```

---

## Chunk 5: Final Polish and Verification

### Task 8: QuarterlyActions Mobile Horizontal Scroll

**Files:**
- Modify: `src/components/game/QuarterlyActions.tsx`

- [ ] **Step 1: Make action card buttons horizontally scrollable on mobile**

In `src/components/game/QuarterlyActions.tsx`, find the action cards container at line 109:

Change from:
```
flex flex-wrap items-center gap-2
```
To:
```
flex items-center gap-2 overflow-x-auto min-[1024px]:flex-wrap min-[1024px]:overflow-x-visible
```

Then add `shrink-0` to each action card button at line 127:

Change from:
```
pixel-btn relative flex flex-col items-center gap-1 px-3 py-2
```
To:
```
pixel-btn relative flex shrink-0 flex-col items-center gap-1 px-3 py-2
```

Also add `shrink-0` to the resign button at line 148:
```
pixel-btn shrink-0 border-[var(--pixel-red)] px-3 py-2 text-[var(--pixel-red)]
```

- [ ] **Step 2: Verify in browser**

On mobile, during seasonal planning phase:
- Action cards scroll horizontally in a single row
- No cards are squished or truncated
- Target picker overlay (study/socialize) still positions correctly
On desktop: cards wrap normally (no change).

- [ ] **Step 3: Commit**

```bash
git add src/components/game/QuarterlyActions.tsx
git commit -m "feat: horizontal scroll for action cards on mobile"
```

---

### Task 9: Full Verification Pass

- [ ] **Step 1: Run complete test suite**

Run: `npx vitest run`
Expected: All tests pass (existing + new).

- [ ] **Step 2: Manual mobile testing**

Open dev tools, set to 375x812 (iPhone SE/13 mini):
1. `/` — Landing loads, title readable, buttons accessible, safe area at bottom
2. `/intro` — All 6 phases display within screen, name input fits, major cards stack
3. `/game` — Tab bar visible at bottom, Story tab shows story + action bar, switching tabs works
4. `/game` Attributes tab — Progress bars render, no overflow
5. `/game` Relationships tab — NPC list scrolls within tab
6. `/game` Phone tab — 5-column grid visible, clicking app opens full-screen view with back button
7. All modals (save, settings) — Display correctly on small screen

- [ ] **Step 3: Desktop regression check**

Open at 1280px+:
1. `/game` — Side-by-side layout unchanged, no tab bar visible
2. TopStatusBar shows full info (title, job, quarter, money)
3. DashboardPanel has PanelTabs as before

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address issues found during mobile verification"
```

(Skip if no fixes needed.)
