'use client'

import { useState } from 'react'
import type { ActionAllocation, Phase1Action, Phase2Action } from '@/types/actions'
import { ACTION_STAMINA_COST } from '@/types/actions'
import type { NPC, JobLevel } from '@/types/game'
import type { Phase2Path } from '@/types/executive'
import { ExecutiveActions } from '@/components/game/ExecutiveActions'

interface ActionCardConfig {
  action: Phase1Action | Phase2Action
  label: string
  icon: string
}

const PHASE1_ACTIONS: ActionCardConfig[] = [
  { action: 'work_hard', label: '埋头工作', icon: '🔨' },
  { action: 'study', label: '学习充电', icon: '📖' },
  { action: 'socialize', label: '社交应酬', icon: '🍺' },
  { action: 'manage_up', label: '向上管理', icon: '👔' },
  { action: 'slack_off', label: '摸鱼休息', icon: '😴' },
  { action: 'side_hustle', label: '搞副业', icon: '💻' },
  { action: 'job_interview', label: '跳槽面试', icon: '📋' },
]

const PHASE2_ACTIONS: ActionCardConfig[] = [
  { action: 'improve_product', label: '打磨产品', icon: '⚙️' },
  { action: 'recruit', label: '招聘面试', icon: '👤' },
  { action: 'fundraise', label: '融资路演', icon: '💎' },
  { action: 'team_manage', label: '团队管理', icon: '👥' },
  { action: 'biz_develop', label: '商务拓展', icon: '🤝' },
  { action: 'marketing', label: '市场营销', icon: '📣' },
  { action: 'rest', label: '休息调整', icon: '🌿' },
]

const STUDY_TARGETS = [
  { target: 'professional', label: '专业' },
  { target: 'communication', label: '沟通' },
  { target: 'management', label: '管理' },
]

const RESIGN_LEVELS: JobLevel[] = ['L6_tech', 'L6_mgmt', 'L7_tech', 'L7_mgmt', 'L8']

interface QuarterlyActionsProps {
  phase: 1 | 2
  phase2Path: Phase2Path | null
  level: JobLevel
  allocations: Array<{ action: string; target?: string }>
  staminaUsed: number
  staminaMax: number
  npcs: NPC[]
  onAllocate: {
    bivarianceHack: (allocation: { action: string; target?: string }) => void
  }['bivarianceHack']
  onDeallocate: (index: number) => void
}

export function QuarterlyActions({
  phase,
  phase2Path,
  level,
  allocations,
  staminaUsed,
  staminaMax,
  npcs,
  onAllocate,
  onDeallocate,
}: QuarterlyActionsProps) {
  const [targetPicker, setTargetPicker] = useState<{ action: string; type: 'study' | 'socialize' } | null>(null)

  if (phase === 2 && phase2Path === 'executive') {
    return (
      <ExecutiveActions
        allocations={allocations}
        staminaUsed={staminaUsed}
        staminaMax={staminaMax}
        onAllocate={onAllocate}
        onDeallocate={onDeallocate}
      />
    )
  }

  const actions = phase === 1 ? PHASE1_ACTIONS : PHASE2_ACTIONS
  const canResign = phase === 1 && RESIGN_LEVELS.includes(level)

  const handleClick = (action: string) => {
    if (action === 'study') {
      setTargetPicker({ action, type: 'study' })
      return
    }
    if (action === 'socialize') {
      setTargetPicker({ action, type: 'socialize' })
      return
    }
    onAllocate({ action: action as ActionAllocation['action'] })
  }

  const handleTargetSelect = (target: string) => {
    if (!targetPicker) return
    onAllocate({ action: targetPicker.action as ActionAllocation['action'], target })
    setTargetPicker(null)
  }

  const getCount = (action: string) =>
    allocations.filter(a => a.action === action).length

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-2">
        {actions.map(card => {
          const cost = ACTION_STAMINA_COST[card.action]
          const count = getCount(card.action)
          const disabled = staminaUsed + cost > staminaMax

          return (
            <button
              key={card.action}
              disabled={disabled && count === 0}
              onClick={() => {
                if (count > 0) {
                  const idx = allocations.findLastIndex(a => a.action === card.action)
                  if (idx >= 0) onDeallocate(idx)
                } else {
                  handleClick(card.action)
                }
              }}
              className="pixel-btn relative flex flex-col items-center gap-1 px-3 py-2"
            >
              <span className="text-lg">{card.icon}</span>
              <span className="text-[10px]">{card.label}</span>
              <span className="text-[10px] text-[var(--pixel-text-dim)]">{cost}点</span>
              {count > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center bg-[var(--pixel-text-bright)] text-[10px] text-[var(--pixel-bg)]">
                  ×{count}
                </span>
              )}
            </button>
          )
        })}

        {canResign && (
          <button
            onClick={() => {
              if (confirm('确定辞职创业？此操作不可逆')) {
                onAllocate({ action: 'resign_startup' })
              }
            }}
            className="pixel-btn border-[var(--pixel-red)] px-3 py-2 text-[var(--pixel-red)]"
          >
            <span className="text-lg">🚀</span>
            <span className="block text-[10px]">辞职创业</span>
          </button>
        )}
      </div>

      {/* Target picker overlay */}
      {targetPicker && (
        <div className="absolute bottom-full left-0 mb-2 pixel-border bg-[var(--pixel-bg)] p-3">
          <p className="mb-2 text-xs text-[var(--pixel-text-dim)]">
            {targetPicker.type === 'study' ? '选择学习方向：' : '选择目标：'}
          </p>
          <div className="flex gap-2">
            {targetPicker.type === 'study'
              ? STUDY_TARGETS.map(t => (
                  <button
                    key={t.target}
                    onClick={() => handleTargetSelect(t.target)}
                    className="pixel-btn px-2 py-1 text-xs"
                  >
                    {t.label}
                  </button>
                ))
              : npcs.filter(n => n.isActive).map(npc => (
                  <button
                    key={npc.id}
                    onClick={() => handleTargetSelect(npc.name)}
                    className="pixel-btn px-2 py-1 text-xs"
                  >
                    {npc.name}
                  </button>
                ))
            }
            <button
              onClick={() => setTargetPicker(null)}
              className="pixel-btn px-2 py-1 text-xs text-[var(--pixel-text-dim)]"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
