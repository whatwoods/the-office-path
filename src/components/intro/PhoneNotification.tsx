'use client'

import { useEffect, useState } from 'react'
import type { MajorType } from '@/types/game'

const COMPANY_MAP: Record<MajorType, string> = {
  tech: '星云科技',
  finance: '鼎信金融',
  liberal: '万合集团',
}

interface PhoneNotificationProps {
  major: MajorType
  onComplete: () => void
}

export function PhoneNotification({
  major,
  onComplete,
}: PhoneNotificationProps) {
  const [showNotification, setShowNotification] = useState(false)
  const company = COMPANY_MAP[major]

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowNotification(true)
    }, 1200)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-black">
      <div
        className="text-6xl"
        style={{
          animation: showNotification
            ? 'none'
            : 'phone-vibrate 0.15s ease-in-out infinite',
        }}
      >
        📱
      </div>

      {showNotification && (
        <div
          className="pixel-border max-w-md cursor-pointer bg-[var(--pixel-bg-light)] p-6"
          style={{ animation: 'slide-down 0.4s ease-out' }}
          onClick={onComplete}
        >
          <div className="mb-2 flex items-center gap-2">
            <span className="text-sm text-[var(--pixel-text-amber)]">
              📧 BOSS真聘
            </span>
          </div>
          <p className="text-sm text-[var(--pixel-text)]">
            恭喜！您已通过【{company}】的终面，offer 已发送至您的邮箱。
          </p>
          <p className="mt-3 text-center text-xs text-[var(--pixel-text-dim)]">
            点击查看
          </p>
        </div>
      )}
    </div>
  )
}
