'use client'

import type { JobOffer } from '@/types/job-offer'

interface JobOfferCardProps {
  offer: JobOffer
  onAccept: (offerId: string) => void
  onNegotiate?: (offerId: string) => void
  onIgnore: (offerId: string) => void
}

const STATUS_LABELS = {
  expanding: '扩张期',
  stable: '稳定期',
  shrinking: '收缩期',
} as const

export function JobOfferCard({
  offer,
  onAccept,
  onNegotiate,
  onIgnore,
}: JobOfferCardProps) {
  return (
    <article className="pixel-border-light bg-[var(--pixel-bg-light)] p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm text-[var(--pixel-text-bright)]">{offer.companyName}</h4>
          <p className="mt-1 text-[10px] text-[var(--pixel-text-dim)]">
            {offer.companyProfile}
          </p>
        </div>
        <span className="pixel-border px-2 py-1 text-[10px]">
          {STATUS_LABELS[offer.companyStatus]}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="pixel-border bg-[var(--pixel-bg-panel)] p-2">
          <div className="text-[10px] text-[var(--pixel-text-dim)]">职级</div>
          <div className="mt-1">{offer.offeredLevel}</div>
        </div>
        <div className="pixel-border bg-[var(--pixel-bg-panel)] p-2">
          <div className="text-[10px] text-[var(--pixel-text-dim)]">月薪</div>
          <div className="mt-1 text-[var(--pixel-gold)]">
            ¥{offer.offeredSalary.toLocaleString('zh-CN')}
          </div>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <button onClick={() => onAccept(offer.id)} className="pixel-btn flex-1 px-2 py-1 text-xs">
          接受
        </button>
        <button
          onClick={() => onNegotiate?.(offer.id)}
          className="pixel-btn flex-1 px-2 py-1 text-xs"
        >
          谈判
        </button>
        <button
          onClick={() => onIgnore(offer.id)}
          className="pixel-btn flex-1 px-2 py-1 text-xs text-[var(--pixel-text-dim)]"
        >
          忽略
        </button>
      </div>
    </article>
  )
}
