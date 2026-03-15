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
          <h4 className="text-xs text-[var(--pixel-text-bright)]">{msg.sender}</h4>
          <p className="mt-1 text-[10px] text-[var(--pixel-text)]">{msg.content}</p>
        </div>
      ))}
    </div>
  )
}
