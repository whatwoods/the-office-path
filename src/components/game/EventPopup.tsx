'use client'

import type { GameEvent } from '@/types/events'
import { PixelButton } from '@/components/ui/PixelButton'

interface EventPopupProps {
  event: GameEvent
  onConfirm: () => void
}

const SEVERITY_COLORS: Record<string, string> = {
  low: 'text-[var(--pixel-blue)]',
  medium: 'text-[var(--pixel-yellow)]',
  high: 'text-[var(--pixel-accent)]',
  critical: 'text-[var(--pixel-red)]',
}

export function EventPopup({ event, onConfirm }: EventPopupProps) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" />
      <div className="pixel-border relative z-10 w-[420px] bg-[var(--pixel-bg)] p-6 text-center">
        <span className={`text-xs ${SEVERITY_COLORS[event.severity] ?? ''}`}>
          {event.severity === 'low' && '日常'}
          {event.severity === 'medium' && '重要'}
          {event.severity === 'high' && '紧急'}
          {event.severity === 'critical' && '危机'}
        </span>
        <h3 className="pixel-glow mt-2 text-xl text-[var(--pixel-text-bright)]">
          {event.title}
        </h3>
        <p className="mt-3 text-sm text-[var(--pixel-text)]">{event.description}</p>
        {event.triggersCritical && (
          <p className="mt-2 text-xs text-[var(--pixel-accent)]">将进入关键期模式</p>
        )}
        <div className="mt-4">
          <PixelButton onClick={onConfirm}>确认</PixelButton>
        </div>
      </div>
    </div>
  )
}
