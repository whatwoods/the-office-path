'use client'

import { useEffect, useState, useRef } from 'react'
import type { CriticalPeriod } from '@/types/game'

interface QuarterTransitionProps {
  quarter: number
  criticalPeriod: CriticalPeriod | null
  onComplete: () => void
}

export function QuarterTransition({
  quarter,
  criticalPeriod,
  onComplete,
}: QuarterTransitionProps) {
  const [visible, setVisible] = useState(true)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      onCompleteRef.current()
    }, 1500)
    return () => clearTimeout(timer)
  }, [])

  if (!visible) return null

  return (
    <div className="quarter-transition fixed inset-0 z-40 flex items-center justify-center bg-[var(--pixel-bg)]">
      <div className="text-center">
        {criticalPeriod ? (
          <>
            <p className="mb-2 text-lg text-[var(--pixel-accent)]">关键期</p>
            <h2 className="pixel-glow text-4xl text-[var(--pixel-text-bright)]">
              {criticalPeriod.type === 'onboarding' && '入职第一周'}
              {criticalPeriod.type === 'promotion_review' && '晋升答辩'}
              {criticalPeriod.type === 'company_crisis' && '公司危机'}
              {criticalPeriod.type === 'project_sprint' && '项目冲刺'}
              {criticalPeriod.type === 'job_negotiation' && '跳槽谈判'}
              {criticalPeriod.type === 'startup_launch' && '创业启动'}
              {criticalPeriod.type === 'fundraising' && '融资谈判'}
              {criticalPeriod.type === 'ipo_review' && '上市审核'}
            </h2>
            <p className="mt-2 text-[var(--pixel-text-dim)]">
              第 {criticalPeriod.currentDay} 天 / 共 {criticalPeriod.maxDays} 天
            </p>
          </>
        ) : (
          <h2 className="pixel-glow text-4xl text-[var(--pixel-text-bright)]">
            第 {quarter} 季度
          </h2>
        )}
      </div>
    </div>
  )
}
