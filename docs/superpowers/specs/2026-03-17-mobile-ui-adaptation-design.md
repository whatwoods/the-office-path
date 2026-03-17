# Mobile UI Adaptation Design

Date: 2026-03-17

## Overview

Adapt all pages of The Office Path (打工之道) for mobile devices. The project is currently desktop-first with a 1024px breakpoint. This spec adds a proper mobile experience below 1024px while keeping the desktop layout unchanged.

## Scope

All three routes:
- `/` — Landing page (minor touch-ups)
- `/intro` — Intro sequence (minor touch-ups)
- `/game` — Game page (major rework for mobile layout)

## Breakpoint Strategy

Single breakpoint at `1024px` (existing `min-[1024px]:`):
- **Mobile** (`<1024px`): Bottom tab navigation, single-column layout
- **Desktop** (`>=1024px`): Existing dual-column layout, unchanged

No tablet-specific breakpoint. Devices between 640-1024px get the mobile layout.

## Game Page (`/game`) — Mobile Layout

### Current State

The game page already has a responsive stacked layout on mobile (`flex-col` switching to `flex-row` at `min-[1024px]:`). On mobile, StoryPanel renders above DashboardPanel in a vertical scroll. This works but is not ideal — users must scroll past the full story to reach attributes/relationships/phone, and there's no clear navigation between sections. This spec replaces that stacked layout with a tabbed navigation.

### Layout Structure

```
┌─────────────────────────┐
│  TopStatusBar (compact)  │  single row: quarter + money + icon buttons
├─────────────────────────┤
│                         │
│   Content Area          │  switches based on active tab:
│   (flex-1, scrollable)  │  Story / Attributes / Relationships / Phone
│                         │
├─────────────────────────┤
│  ActionBar              │  only visible on Story tab, above tab bar
├─────────────────────────┤
│ 📖 Story│📊 Attr│👥 Rel│📱 Phone│  fixed bottom tab bar
└─────────────────────────┘
```

### Bottom Tab Bar

- Fixed at bottom, height ~56px
- Four tabs: 故事 (Story), 属性 (Attributes), 关系 (Relationships), 手机 (Phone)
- Active tab indicated by accent color on icon/label
- Hidden on desktop (`>=1024px`)

### State Management

Add `activeMobileTab` as local state in `GamePage` (not in Zustand store):
- Type: `'story' | 'attributes' | 'relationships' | 'phone'`
- Default: `'story'`
- Only used when viewport `<1024px`
- Independent from the existing `activePanel` state in DashboardPanel (which controls the desktop sub-tab switcher). On mobile, `activeMobileTab` replaces `activePanel` — the desktop PanelTabs are hidden and the bottom tab bar drives navigation instead.

### TopStatusBar (Mobile)

Current behavior: stacks into two rows on mobile via `flex-col`.

New mobile behavior: single row `flex-row`:
- Left: quarter indicator (e.g., "Q1·2024")
- Center: money display (e.g., "💰 ¥8,000")
- Right: settings + save icon buttons
- Game title "打工之道" hidden on mobile
- Job level / company name hidden on mobile (visible in Attributes tab instead)

### ActionBar (Mobile)

- Renders inside the Story tab content area, **scrolls with story content** (not position-fixed). It sits at the bottom of the story scroll area, below the narrative text.
- Action choice buttons: full-width, vertical stack (existing behavior)
- Seasonal planning cards: horizontally scrollable single row (`overflow-x: auto; flex-wrap: nowrap`) instead of the current `flex-wrap` layout
- Hidden when user switches to other tabs
- Story content area has sufficient bottom padding (`pb-[56px]`) to ensure ActionBar content is not obscured by the tab bar

### DashboardPanel Decomposition

Current: `DashboardPanel` wraps `PanelTabs` + three sub-tabs (AttributesTab, RelationshipsTab, PhoneTab).

Mobile: Bottom tab bar directly controls which sub-tab content is rendered. The DashboardPanel shell and PanelTabs component are not rendered on mobile.

Desktop: No change. DashboardPanel continues to wrap all three sub-tabs with PanelTabs.

### Phone App (PhoneTab) — Mobile

- App grid: keep 5-column layout (works on mobile; at 320px width each icon is ~50px, acceptable)
- On app open: PhoneAppView replaces the entire content area (not a modal overlay)
- Top navigation bar: `← AppName` back button to return to grid
- App content fills available height between TopStatusBar and bottom tab bar
- Bottom tab bar **remains visible** when an app is open. Tapping another tab closes the open app and switches to that tab.

## Landing Page (`/`) — Minor Touch-ups

Current state is already responsive. Adjustments:

- **Title sizing**: Add `max-[374px]:text-3xl` for very narrow screens (currently `text-4xl sm:text-5xl lg:text-6xl`)
- **Button spacing**: Tighten gap from `gap-3` on smallest screens
- **Safe area**: Ensure content respects `safe-area-inset-bottom` for notched devices

No layout changes needed.

## Intro Page (`/intro`) — Minor Touch-ups

Current state is mobile-first centered layout. Adjustments:

- **Max-width constraint**: Ensure NameInput, MajorSelect, OfferLetter respect screen width with `max-w-[calc(100vw-3rem)]` or similar
- **MajorSelect cards**: Stack single-column on narrow screens if currently multi-column
- **Keyboard handling**: OfferLetter and NameInput must remain scrollable when soft keyboard opens
- **Safe area**: Bottom padding for notched devices

## Global Adaptations

### Viewport Meta

Add viewport export to `layout.tsx` using Next.js convention:
```ts
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}
```

### Safe Area Insets

Apply `env(safe-area-inset-bottom)` padding to:
- Bottom tab bar in game page
- Landing page button container
- Any fixed-bottom elements

### Scroll Behavior

- Game page outer container: `overflow: hidden` (prevents iOS Safari bounce)
- Content area within each tab: `overflow-y: auto` for internal scrolling
- Story panel: smooth scrolling maintained

### Modals

SaveModal and SettingsModal already have responsive sizing (`w-[calc(100vw-1.5rem)] max-w-[500px]`). Verify they display correctly on small screens — no structural changes expected.

## Components Changed

| Component | Change Type | Description |
|-----------|------------|-------------|
| `GamePage` (`app/game/page.tsx`) | Major | Add mobile tab navigation, conditional rendering |
| `TopStatusBar` | Moderate | Compact single-row mobile layout |
| `ActionBar` | Moderate | Render inside story tab on mobile |
| `DashboardPanel` | Moderate | Skip shell on mobile, render sub-tabs directly |
| `PhoneAppView` | Moderate | Full-content-area mode on mobile with back nav |
| `LandingMenu` | Minor | Title size, spacing, safe area |
| `LandingBackground` | None | Already responsive |
| `NameInput` | Minor | Max-width constraint, keyboard scroll handling |
| `MajorSelect` | Minor | Single-column card stack on narrow screens |
| `OfferLetter` | Minor | Max-width constraint, scroll when keyboard open |
| `BlackScreenText`, `GraduationNarrative`, `PhoneNotification` | None | Already simple centered text, no changes needed |
| `layout.tsx` | Minor | Viewport meta update |

## New Components

| Component | Purpose |
|-----------|---------|
| `MobileTabBar` | Bottom tab navigation bar, renders only on mobile |

## Out of Scope

- Tablet-specific layout (640-1024px gets mobile layout)
- Landscape orientation optimization
- PWA / native app wrapper
- Touch gestures (swipe between tabs)
