'use client'

import { useEffect, useEffectEvent, useState } from 'react'
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
  const handleComplete = useEffectEvent(() => {
    onComplete()
  })

  const criticalPeriodLabel = criticalPeriod
    ? {
        onboarding: '入职第一周',
        promotion_review: '晋升答辩',
        company_crisis: '公司危机',
        project_sprint: '项目冲刺',
        job_negotiation: '跳槽谈判',
        startup_launch: '创业启动',
        fundraising: '融资谈判',
        ipo_review: '上市审核',
        new_company_onboarding: '新公司入职',
        executive_onboarding: '高管上任',
        board_review: '董事会审查',
        power_struggle: '权力斗争',
        major_decision: '重大决策',
        power_transition: '权力交接',
      }[criticalPeriod.type]
    : null

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      handleComplete()
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
              {criticalPeriodLabel}
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
