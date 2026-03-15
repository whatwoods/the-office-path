'use client'

import { Modal } from '@/components/ui/Modal'
import { PixelButton } from '@/components/ui/PixelButton'

interface PerformancePopupProps {
  rating: string
  salaryChange: number
  onClose: () => void
}

const RATING_COLORS: Record<string, string> = {
  S: 'text-[var(--pixel-accent)]',
  A: 'text-[var(--pixel-text-bright)]',
  'B+': 'text-[var(--pixel-blue)]',
  B: 'text-[var(--pixel-text)]',
  C: 'text-[var(--pixel-red)]',
}

export function PerformancePopup({
  rating,
  salaryChange,
  onClose,
}: PerformancePopupProps) {
  const salaryLabel =
    salaryChange === 0
      ? '0'
      : `${salaryChange > 0 ? '+' : ''}${salaryChange.toLocaleString('zh-CN')}`

  return (
    <Modal open={true} onClose={onClose} title="季度绩效">
      <div className="space-y-4 text-center">
        <div>
          <p className="text-xs text-[var(--pixel-text-dim)]">本季度评级</p>
          <p className={`mt-2 text-4xl ${RATING_COLORS[rating] ?? ''}`}>{rating}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--pixel-text-dim)]">薪资变化</p>
          <p
            className={`mt-2 text-2xl ${
              salaryChange >= 0
                ? 'text-[var(--pixel-accent)]'
                : 'text-[var(--pixel-red)]'
            }`}
          >
            {salaryLabel}
          </p>
        </div>
        <div className="pt-2">
          <PixelButton onClick={onClose} variant="accent">
            继续
          </PixelButton>
        </div>
      </div>
    </Modal>
  )
}
