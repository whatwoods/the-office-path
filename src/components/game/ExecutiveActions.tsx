'use client'

import { EXECUTIVE_ACTION_STAMINA_COST } from '@/types/executive'

type ExecutivePlannedAction = {
  action: string
}

interface ExecutiveActionsProps {
  allocations: ExecutivePlannedAction[]
  staminaUsed: number
  staminaMax: number
  onAllocate: (allocation: ExecutivePlannedAction) => void
  onDeallocate: (index: number) => void
}

const EXECUTIVE_ACTIONS = [
  { action: 'push_business', label: '推进业务', icon: '📈' },
  { action: 'manage_board', label: '经营董事会', icon: '🏛️' },
  { action: 'build_team', label: '打造团队', icon: '🧩' },
  { action: 'political_maneuvering', label: '政治博弈', icon: '♟️' },
  { action: 'strategic_planning', label: '战略谋划', icon: '🗺️' },
  { action: 'industry_networking', label: '行业走动', icon: '🥂' },
  { action: 'rest', label: '休整复盘', icon: '🌿' },
] as const

export function ExecutiveActions({
  allocations,
  staminaUsed,
  staminaMax,
  onAllocate,
  onDeallocate,
}: ExecutiveActionsProps) {
  const getCount = (action: string) =>
    allocations.filter((allocation) => allocation.action === action).length

  return (
    <div className="flex flex-wrap items-center gap-2">
      {EXECUTIVE_ACTIONS.map((card) => {
        const cost =
          EXECUTIVE_ACTION_STAMINA_COST[
            card.action as keyof typeof EXECUTIVE_ACTION_STAMINA_COST
          ]
        const count = getCount(card.action)
        const disabled = staminaUsed + cost > staminaMax

        return (
          <button
            key={card.action}
            disabled={disabled && count === 0}
            onClick={() => {
              if (count > 0) {
                const index = allocations.findLastIndex(
                  (allocation) => allocation.action === card.action,
                )
                if (index >= 0) onDeallocate(index)
                return
              }

              onAllocate({ action: card.action })
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
    </div>
  )
}
