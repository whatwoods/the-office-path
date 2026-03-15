'use client'

import { useGameStore } from '@/store/gameStore'

export function XiaoxinApp() {
  const state = useGameStore(s => s.state)
  const replyToPhoneMessage = useGameStore(s => s.replyToPhoneMessage)

  if (!state) return null

  const messages = state.phoneMessages
    .filter(m => m.app === 'xiaoxin')
    .sort((a, b) => b.quarter - a.quarter)

  if (messages.length === 0) {
    return <p className="text-xs text-[var(--pixel-text-dim)]">暂无消息</p>
  }

  return (
    <div className="space-y-3">
      {messages.map(msg => (
        <div key={msg.id} className="flex items-start gap-2">
          <span className="pixel-border-light shrink-0 bg-[var(--pixel-bg-panel)] px-1.5 py-0.5 text-[10px] text-[var(--pixel-text-amber)]">
            {msg.sender}
          </span>
          <div className="flex-1">
            <div className="pixel-border-light bg-[var(--pixel-bg-light)] p-2 text-xs">
              {msg.content}
            </div>
            {msg.replyOptions && !msg.selectedReply && (
              <div className="mt-1 flex flex-wrap gap-1">
                {msg.replyOptions.map(opt => (
                  <button
                    key={opt}
                    onClick={() => replyToPhoneMessage(msg.id, opt)}
                    className="pixel-btn px-2 py-0.5 text-[10px]"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
            {msg.selectedReply && (
              <div className="mt-1 text-[10px] text-[var(--pixel-text-bright)]">
                你回复了：{msg.selectedReply}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
