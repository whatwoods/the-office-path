'use client'

import { PixelButton } from '@/components/ui/PixelButton'
import type { MajorType } from '@/types/game'

const OFFER_CONFIG: Record<MajorType, { company: string; title: string }> = {
  tech: { company: '星云科技', title: '产品运营实习生' },
  finance: { company: '鼎信金融', title: '客户经理助理实习生' },
  liberal: { company: '万合集团', title: '行政管理实习生' },
}

interface OfferLetterProps {
  playerName: string
  major: MajorType
  onAccept: () => void
  isLoading: boolean
}

export function OfferLetter({
  playerName,
  major,
  onAccept,
  isLoading,
}: OfferLetterProps) {
  const config = OFFER_CONFIG[major]

  return (
    <div
      className="pixel-border w-full max-w-lg bg-[var(--pixel-bg-light)] p-4 sm:p-8"
      style={{ animation: 'offer-fade-in 0.6s ease-out' }}
    >
      <h2 className="mb-6 text-center text-xl text-[var(--pixel-text-amber)]">
        ✉ 录 用 通 知 书
      </h2>

      <div className="space-y-4 text-sm text-[var(--pixel-text)]">
        <p>{playerName} 同学：</p>
        <p>恭喜您通过我司面试，现正式向您发出录用邀请。</p>

        <div className="pixel-border-light space-y-2 bg-[var(--pixel-bg-panel)] p-4">
          <p>
            <span className="text-[var(--pixel-text-dim)]">公司：</span>
            <span className="text-[var(--pixel-text-bright)]">{config.company}</span>
          </p>
          <p>
            <span className="text-[var(--pixel-text-dim)]">职位：</span>
            <span className="text-[var(--pixel-text-bright)]">{config.title}</span>
          </p>
          <p>
            <span className="text-[var(--pixel-text-dim)]">月薪：</span>
            <span className="text-[var(--pixel-text-bright)]">3,000 元</span>
          </p>
          <p>
            <span className="text-[var(--pixel-text-dim)]">入职日期：</span>
            <span className="text-[var(--pixel-text-bright)]">2026年7月1日</span>
          </p>
        </div>

        <p>期待你的加入！</p>
        <p className="text-right text-[var(--pixel-text-dim)]">
          —— 人力资源部 王芳
        </p>
      </div>

      <div className="mt-8 text-center">
        <PixelButton variant="accent" onClick={onAccept} disabled={isLoading}>
          {isLoading ? '正在入职...' : '接受 Offer，开启打工之路'}
        </PixelButton>
      </div>
    </div>
  )
}
