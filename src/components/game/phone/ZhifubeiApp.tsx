'use client'

import { useGameStore } from '@/store/gameStore'

export function ZhifubeiApp() {
  const state = useGameStore(s => s.state)

  if (!state) return null

  const messages = state.phoneMessages
    .filter(m => m.app === 'zhifubei')
    .sort((a, b) => b.quarter - a.quarter)

  const balance = state.player.money.toLocaleString('zh-CN')

  return (
    <div>
      <div className="mb-3 pixel-border-light bg-[var(--pixel-bg-panel)] p-3 text-center">
        <p className="text-[10px] text-[var(--pixel-text-dim)]">余额</p>
        <p className="text-lg text-[var(--pixel-text-amber)]">¥{balance}</p>
      </div>
      <div className="space-y-1">
        {messages.map(msg => {
          const isIncome = msg.content.includes('+') || msg.content.includes('收入')
          return (
            <div key={msg.id} className="flex items-center justify-between py-1 text-xs">
              <span className="text-[var(--pixel-text-dim)]">{msg.sender}</span>
              <span className={isIncome ? 'text-[var(--pixel-green)]' : 'text-[var(--pixel-red)]'}>
                {msg.content}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
