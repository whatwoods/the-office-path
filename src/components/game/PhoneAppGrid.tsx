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
