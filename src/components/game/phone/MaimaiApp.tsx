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
