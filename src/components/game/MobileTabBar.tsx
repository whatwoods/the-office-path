'use client'

export type MobileTab = 'story' | 'attributes' | 'relationships' | 'phone'

interface MobileTabBarProps {
  activeTab: MobileTab
  onTabChange: (tab: MobileTab) => void
}

const TABS: Array<{ key: MobileTab; icon: string; label: string }> = [
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
