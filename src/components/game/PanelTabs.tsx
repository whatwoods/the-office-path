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
