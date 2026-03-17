# Homepage Background And Mobile Landing Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a pixel-art homepage background, make the landing page usable on mobile, and remove the current mobile hard-stop so phone users can enter the game with a minimal responsive shell.

**Architecture:** Keep the work focused on the homepage and the smallest necessary part of the `/game` route. Introduce one decorative landing background component and one reusable landing menu component, make the shared modal shell responsive, then switch the game page from a desktop-only gate to a stacked mobile-first layout that still reuses existing panels. The background image remains a single primary asset, with stronger overlays and safer cropping on small screens.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS v4 utilities, Vitest + Testing Library, OpenAI Image API via `@imagegen` bundled CLI

---

## File Structure

- Create: `public/images/landing/office-night-hero.png` — final homepage pixel-art background asset
- Create: `src/components/home/LandingBackground.tsx` — decorative full-bleed image layer plus dark overlays
- Create: `src/components/home/LandingMenu.tsx` — shared landing title, subtitle, and CTA panel for desktop/mobile
- Modify: `src/app/page.tsx` — remove desktop-only gate and compose the new background + landing menu
- Modify: `src/components/ui/Modal.tsx` — responsive modal width/height/padding so settings and save dialogs work on phones
- Modify: `src/app/game/page.tsx` — remove the current mobile hard-stop and switch to a stacked responsive shell
- Modify: `src/components/game/TopStatusBar.tsx` — make the status bar wrap cleanly on small screens
- Modify: `src/components/game/ActionBar.tsx` — stack the planning area and submit controls on small screens
- Test: `tests/app/page.test.tsx` — landing page behavior and mobile-ready regression coverage
- Test: `tests/components/ui/Modal.test.tsx` — modal responsive shell coverage
- Test: `tests/components/game/GamePage.test.tsx` — `/game` no longer hard-blocks phones and still renders the main shell

## Chunk 1: Asset And Shared Responsive Shell

### Task 1: Generate And Install The Homepage Background

**Files:**
- Create: `public/images/landing/office-night-hero.png`

- [ ] **Step 1: Confirm image generation prerequisites**

Run:

```powershell
if (-not $env:OPENAI_API_KEY) { throw 'OPENAI_API_KEY is required for homepage background generation.' }
```

Expected: no error when the key is configured in the local shell.

- [ ] **Step 2: Generate the first background candidate with `@imagegen`**

Run:

```powershell
$env:CODEX_HOME = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { "$HOME\.codex" }
$IMAGE_GEN = Join-Path $env:CODEX_HOME "skills\imagegen\scripts\image_gen.py"
New-Item -ItemType Directory -Force output\imagegen | Out-Null
uv run --with openai --with pillow python $IMAGE_GEN generate `
  --prompt "Use case: ui-mockup. Asset type: game landing page background. Primary request: a retro pixel-art late-night office scene for a Chinese workplace life simulator. Scene/background: deep-night open office, glass windows, distant city lights, subtle neon accents, rows of desks fading into darkness. Subject: one office worker seen from behind sitting at a desk in front of a glowing monitor. Style/medium: polished retro pixel illustration, premium 16-bit atmosphere, not chibi, not cartoon slapstick. Composition/framing: wide horizontal composition, central safe zone kept relatively clean for title and buttons, details concentrated on the left/right edges and lower third. Lighting/mood: monitor glow, dim office spill light, restrained urban night mood, pressure but not horror. Color palette: deep blue, gray-violet, cold monitor white, small warm highlights from desk objects. Materials/textures: office desk, keyboard, mug, sticky notes, glass reflections, distant tower lights. Constraints: no text, no logo, no watermark, no extra characters, no cyberpunk overload, no exaggerated neon flooding, preserve a clean center for UI overlays. Avoid: poster typography, glossy anime finish, photorealism, jump-scare mood, oversaturated magenta." `
  --size 1536x1024 `
  --quality high `
  --out output\imagegen\office-night-hero.png
```

Expected: the command writes `output\imagegen\office-night-hero.png`.

- [ ] **Step 3: Inspect and choose the image**

Open `output\imagegen\office-night-hero.png` and verify all of the following before promoting it:

- the worker is visible from behind
- the scene reads clearly as a deep-night office
- the middle of the frame is calm enough for title/buttons
- the image feels pixel-art, not semi-realistic anime or cyberpunk poster art

If the composition fails one of those checks, re-run Step 2 with a single targeted prompt tweak instead of rewriting the entire prompt.

- [ ] **Step 4: Promote the approved asset into `public/`**

Run:

```powershell
New-Item -ItemType Directory -Force public\images\landing | Out-Null
Copy-Item output\imagegen\office-night-hero.png public\images\landing\office-night-hero.png -Force
```

Expected: `public\images\landing\office-night-hero.png` exists.

- [ ] **Step 5: Verify the promoted file exists**

Run:

```powershell
Get-Item public\images\landing\office-night-hero.png | Select-Object FullName,Length
```

Expected: one file row is printed with a non-zero `Length`.

- [ ] **Step 6: Commit**

```bash
git add public/images/landing/office-night-hero.png
git commit -m "feat: add homepage pixel-art background asset"
```

### Task 2: Make The Shared Modal Shell Mobile-Friendly

**Files:**
- Modify: `src/components/ui/Modal.tsx`
- Create: `tests/components/ui/Modal.test.tsx`

- [ ] **Step 1: Write the failing modal shell tests**

```tsx
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { Modal } from '@/components/ui/Modal'

describe('Modal', () => {
  it('does not render when closed', () => {
    const { container } = render(
      <Modal open={false} onClose={vi.fn()} title="测试">
        内容
      </Modal>,
    )

    expect(container.innerHTML).toBe('')
  })

  it('renders an overlay and content when open', () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="测试">
        内容
      </Modal>,
    )

    expect(screen.getByText('测试')).toBeDefined()
    expect(screen.getByText('内容')).toBeDefined()
  })

  it('calls onClose when the backdrop is clicked', () => {
    const onClose = vi.fn()
    render(
      <Modal open={true} onClose={onClose} title="测试">
        内容
      </Modal>,
    )

    fireEvent.click(screen.getByTestId('modal-backdrop'))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('uses mobile-safe sizing classes on the dialog panel', () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="测试">
        内容
      </Modal>,
    )

    const panel = screen.getByTestId('modal-panel')
    expect(panel.className).toContain('w-[calc(100vw-1.5rem)]')
    expect(panel.className).toContain('max-h-[calc(100dvh-1.5rem)]')
  })
})
```

- [ ] **Step 2: Run the modal tests to verify they fail**

Run:

```bash
npx vitest run tests/components/ui/Modal.test.tsx
```

Expected: FAIL because the current modal has no `data-testid`s and no mobile-safe sizing classes.

- [ ] **Step 3: Implement the responsive modal shell**

Update `src/components/ui/Modal.tsx` so the backdrop and panel are directly testable and the panel scales down on phones instead of staying fixed at `500px`.

```tsx
export function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div
        data-testid="modal-backdrop"
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />
      <div
        data-testid="modal-panel"
        className="pixel-border relative z-10 w-[calc(100vw-1.5rem)] max-w-[500px] max-h-[calc(100dvh-1.5rem)] overflow-y-auto bg-[var(--pixel-bg)] p-4 sm:max-h-[80vh] sm:p-6"
      >
        ...
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run the modal tests to verify they pass**

Run:

```bash
npx vitest run tests/components/ui/Modal.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/Modal.tsx tests/components/ui/Modal.test.tsx
git commit -m "feat: make shared modal shell responsive"
```

## Chunk 2: Responsive Landing Page

### Task 3: Build The Landing Background And Menu Components

**Files:**
- Create: `src/components/home/LandingBackground.tsx`
- Create: `src/components/home/LandingMenu.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Write the failing landing page tests**

Extend `tests/app/page.test.tsx` with the new expectations:

```tsx
it('does not show the desktop-only mobile warning anymore', () => {
  render(<LandingPage />)

  expect(screen.queryByText('请使用电脑访问')).toBeNull()
})

it('renders the landing background layer', () => {
  render(<LandingPage />)

  expect(screen.getByTestId('landing-background')).toBeDefined()
})

it('opens the load modal when clicking the load button', async () => {
  const user = userEvent.setup()
  render(<LandingPage />)

  await user.click(screen.getByText('读取存档'))

  expect(screen.getByText('存档管理')).toBeDefined()
})
```

- [ ] **Step 2: Run the landing page tests to verify they fail**

Run:

```bash
npx vitest run tests/app/page.test.tsx
```

Expected: FAIL because the current page still renders the mobile warning and has no background test target.

- [ ] **Step 3: Create `LandingBackground`**

Add a decorative component in `src/components/home/LandingBackground.tsx`.

```tsx
export function LandingBackground() {
  return (
    <div
      aria-hidden="true"
      data-testid="landing-background"
      className="absolute inset-0 overflow-hidden"
    >
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/landing/office-night-hero.png')" }}
      />
      <div className="absolute inset-0 bg-black/60 sm:bg-black/45" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(15,52,96,0.14),rgba(0,0,0,0.62))]" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[var(--pixel-bg)] to-transparent" />
    </div>
  )
}
```

Use a CSS background rather than `next/image` here so the component behaves like a true full-bleed backdrop with no extra image mocking requirements in tests.

- [ ] **Step 4: Create `LandingMenu`**

Add `src/components/home/LandingMenu.tsx` as a reusable foreground shell that works on both desktop and mobile.

```tsx
interface LandingMenuProps {
  isLoading: boolean
  onNewGame: () => void
  onLoadGame: () => void
  onSettings: () => void
}

export function LandingMenu(props: LandingMenuProps) {
  return (
    <div className="relative z-10 flex min-h-screen items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="pixel-border w-full max-w-[560px] bg-[rgba(15,52,96,0.78)] p-6 backdrop-blur-[2px] sm:p-8">
        <div className="text-center">
          <h1 className="pixel-glow mb-3 text-4xl text-[var(--pixel-text-bright)] sm:text-5xl lg:text-6xl">
            打工之道
          </h1>
          <p className="text-sm leading-6 text-[var(--pixel-text-dim)] sm:text-base">
            一个 AI 驱动的职场模拟器
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:gap-4">
          <PixelButton className="w-full" ... />
          <PixelButton className="w-full" ... />
          <PixelButton className="w-full" ... />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Recompose `src/app/page.tsx` around the new components**

Keep the existing behavior for `loadSettings()`, `newGame()`, `SaveModal`, and `SettingsModal`, but replace the desktop-only gated markup with:

```tsx
return (
  <div className="relative min-h-screen overflow-hidden bg-[var(--pixel-bg)]">
    <LandingBackground />
    <div className="relative z-20">
      <ErrorBanner />
      <LandingMenu
        isLoading={isLoading}
        onNewGame={() => void handleNewGame()}
        onLoadGame={() => setShowLoad(true)}
        onSettings={() => setShowSettings(true)}
      />
    </div>
    ...
  </div>
)
```

Important:

- delete the `请使用电脑访问` block entirely
- do not fork desktop and mobile into two separate JSX trees
- keep button labels unchanged so current tests and copy stay aligned

- [ ] **Step 6: Run the landing page tests to verify they pass**

Run:

```bash
npx vitest run tests/app/page.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app/page.tsx src/components/home/LandingBackground.tsx src/components/home/LandingMenu.tsx tests/app/page.test.tsx
git commit -m "feat: redesign landing page for mobile with hero background"
```

## Chunk 3: Minimal Mobile Game Entry Path

### Task 4: Remove The Mobile Block From `/game` And Add A Stacked Shell

**Files:**
- Modify: `src/app/game/page.tsx`
- Modify: `tests/components/game/GamePage.test.tsx`

- [ ] **Step 1: Extend the `/game` tests with the mobile-entry regression**

Add this test to `tests/components/game/GamePage.test.tsx`:

```tsx
it('does not show the desktop-only warning anymore', () => {
  render(<GamePage />)

  expect(screen.queryByText('请使用电脑访问')).toBeNull()
  expect(screen.getByTestId('top-status-bar')).toBeDefined()
  expect(screen.getByTestId('story-panel')).toBeDefined()
  expect(screen.getByTestId('dashboard-panel')).toBeDefined()
  expect(screen.getByTestId('action-bar')).toBeDefined()
})
```

- [ ] **Step 2: Run the `/game` tests to verify they fail**

Run:

```bash
npx vitest run tests/components/game/GamePage.test.tsx
```

Expected: FAIL because the current page still renders the warning and hides the main shell on small screens.

- [ ] **Step 3: Replace the desktop-only gate in `src/app/game/page.tsx`**

Restructure the main layout so the route always renders, then use responsive classes instead of conditional desktop/mobile DOM trees.

```tsx
return (
  <div className="flex min-h-screen flex-col bg-[var(--pixel-bg)]">
    <TopStatusBar />
    <ErrorBanner />

    <div className="flex flex-1 flex-col overflow-hidden min-[1024px]:flex-row">
      <div className="min-h-[38vh] flex-1 overflow-y-auto p-3 min-[1024px]:w-[70%] min-[1024px]:p-4">
        <StoryPanel />
      </div>
      <div className="border-t-4 border-[var(--pixel-border)] min-[1024px]:w-[30%] min-[1024px]:border-t-0 min-[1024px]:border-l-4">
        <DashboardPanel />
      </div>
    </div>

    <ActionBar />
    ...
  </div>
)
```

Do not add a second “mobile-only game page” component. The goal is one responsive shell, not parallel route UIs.

- [ ] **Step 4: Run the `/game` tests to verify they pass**

Run:

```bash
npx vitest run tests/components/game/GamePage.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/game/page.tsx tests/components/game/GamePage.test.tsx
git commit -m "feat: allow mobile users to enter the game page"
```

### Task 5: Make The Status Bar And Action Bar Fit Small Screens

**Files:**
- Modify: `src/components/game/TopStatusBar.tsx`
- Modify: `src/components/game/ActionBar.tsx`

- [ ] **Step 1: Add the failing status/action bar tests**

Update existing tests or add focused assertions so the components expose a stable test target and preserve their controls after the responsive refactor.

For `tests/components/game/TopStatusBar.test.tsx`, add a test that still finds:

```tsx
expect(screen.getByText('打工之道')).toBeDefined()
expect(screen.getByText('存档')).toBeDefined()
expect(screen.getByText('⚙')).toBeDefined()
```

For `tests/components/game/GamePage.test.tsx`, keep relying on `data-testid="action-bar"` so the action region stays mounted after the layout change.

- [ ] **Step 2: Run the targeted tests to verify the new assertions fail if needed**

Run:

```bash
npx vitest run tests/components/game/TopStatusBar.test.tsx tests/components/game/GamePage.test.tsx
```

Expected: FAIL if the new assertions depend on responsive markup that is not yet implemented.

- [ ] **Step 3: Refactor `TopStatusBar` for mobile wrapping**

Change the root layout from a fixed-height desktop row to a flexible wrapper.

```tsx
<div
  data-testid="top-status-bar"
  className="pixel-border-light bg-[var(--pixel-bg-panel)] px-3 py-2 sm:px-4"
>
  <div className="flex flex-col gap-2 min-[1024px]:h-12 min-[1024px]:flex-row min-[1024px]:items-center min-[1024px]:justify-between">
    <span className="pixel-glow text-[var(--pixel-text-bright)]">打工之道</span>
    <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm min-[1024px]:gap-6">
      ...
    </div>
  </div>
</div>
```

- [ ] **Step 4: Refactor `ActionBar` for stacked mobile controls**

Keep all existing action logic, but switch the shell from a single row to a column on small screens.

```tsx
<div data-testid="action-bar" className="border-t-4 border-[var(--pixel-border)] bg-[var(--pixel-bg-light)] p-3 sm:p-4">
  ...
  <div className="flex flex-col gap-4 min-[1024px]:flex-row min-[1024px]:items-center">
    <div className="min-w-0 flex-1">
      ...
    </div>

    <div className="flex w-full shrink-0 flex-col items-stretch gap-2 min-[1024px]:w-auto min-[1024px]:items-center">
      ...
    </div>
  </div>
</div>
```

Avoid changing allocation logic, store interactions, or phase-2 behavior in this task. This is a layout-only refactor.

- [ ] **Step 5: Run the targeted tests to verify they pass**

Run:

```bash
npx vitest run tests/components/game/TopStatusBar.test.tsx tests/components/game/GamePage.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/game/TopStatusBar.tsx src/components/game/ActionBar.tsx tests/components/game/TopStatusBar.test.tsx tests/components/game/GamePage.test.tsx
git commit -m "feat: make core game chrome usable on mobile"
```

## Chunk 4: Final Verification

### Task 6: Run Focused And Full Verification

**Files:**
- No new files

- [ ] **Step 1: Run the focused UI test suite**

Run:

```bash
npx vitest run tests/components/ui/Modal.test.tsx tests/app/page.test.tsx tests/components/game/GamePage.test.tsx tests/components/game/TopStatusBar.test.tsx tests/components/game/SaveModal.test.tsx tests/components/game/SettingsModal.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run the full unit test suite**

Run:

```bash
npm run test
```

Expected: PASS with no failing Vitest suites.

- [ ] **Step 3: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS with no ESLint errors.

- [ ] **Step 4: Run production build**

Run:

```bash
npm run build
```

Expected: PASS and Next.js finishes the production build successfully.

- [ ] **Step 5: Manually verify desktop and mobile layouts**

Run:

```bash
npm run dev
```

Then check all of the following in a browser:

- desktop homepage shows the new background and centered landing menu
- mobile homepage shows the darker overlay, stacked CTA panel, and both modals remain usable
- mobile can start a new game and reach `/game`
- `/game` renders as a vertical stacked shell on small screens without the old warning copy
- desktop `/game` still preserves the two-column layout

- [ ] **Step 6: Commit**

```bash
git status --short
```

Expected: only intended implementation files remain modified. Commit the final verification-related touchups if any are needed.
