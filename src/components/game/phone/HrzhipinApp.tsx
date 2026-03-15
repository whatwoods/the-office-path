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
