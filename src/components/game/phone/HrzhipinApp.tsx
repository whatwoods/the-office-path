'use client'

import { useGameStore } from '@/store/gameStore'
import { JobOfferCard } from '@/components/game/JobOfferCard'

export function HrzhipinApp() {
  const state = useGameStore(s => s.state)
  const acceptOffer = useGameStore(s => s.acceptOffer)
  const ignoreOffer = useGameStore(s => s.ignoreOffer)

  if (!state) return null

  const messages = state.phoneMessages
    .filter(m => m.app === 'hrzhipin')
    .sort((a, b) => b.quarter - a.quarter)

  return (
    <div className="space-y-2">
      {state.jobOffers.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] text-[var(--pixel-text-dim)]">待处理 Offer</div>
          {state.jobOffers.map(offer => (
            <JobOfferCard
              key={offer.id}
              offer={offer}
              onAccept={(offerId) => void acceptOffer(offerId)}
              onIgnore={ignoreOffer}
            />
          ))}
        </div>
      )}

      {messages.map(msg => (
        <div key={msg.id} className="pixel-border-light bg-[var(--pixel-bg-light)] p-2">
          <h4 className="text-xs text-[var(--pixel-text-bright)]">{msg.sender}</h4>
          <p className="mt-1 text-[10px]">{msg.content}</p>
        </div>
      ))}

      {state.jobOffers.length === 0 && messages.length === 0 && (
        <p className="text-xs text-[var(--pixel-text-dim)]">暂无职位</p>
      )}
    </div>
  )
}
