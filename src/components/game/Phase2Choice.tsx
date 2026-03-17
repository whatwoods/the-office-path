'use client'

import type { Phase2Path } from '@/types/executive'

interface Phase2ChoiceProps {
  onChoose: (path: Phase2Path) => void
  onClose: () => void
}

const OPTIONS: Array<{
  path: Phase2Path
  title: string
  description: string
}> = [
  {
    path: 'startup',
    title: '创业',
    description: '带着资源和野心离场，自己做老板，赌产品、团队和现金流。',
  },
  {
    path: 'executive',
    title: '留任高管',
    description: '继续留在牌桌中央，经营部门、董事会和公司权力结构。',
  },
]

export function Phase2Choice({ onChoose, onClose }: Phase2ChoiceProps) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-2xl pixel-border bg-[var(--pixel-bg)] p-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base text-[var(--pixel-text-bright)]">选择第二阶段路径</h3>
            <p className="mt-1 text-xs text-[var(--pixel-text-dim)]">
              你已经有资格离开中层赛道，接下来决定是另起炉灶，还是留在权力中心。
            </p>
          </div>
          <button onClick={onClose} className="pixel-btn px-2 py-1 text-[10px]">
            关闭
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {OPTIONS.map((option) => (
            <div key={option.path} className="pixel-border-light bg-[var(--pixel-bg-light)] p-4">
              <div className="text-sm text-[var(--pixel-text-bright)]">{option.title}</div>
              <p className="mt-2 text-xs leading-5 text-[var(--pixel-text-dim)]">
                {option.description}
              </p>
              <button
                onClick={() => onChoose(option.path)}
                className="pixel-btn mt-4 w-full px-3 py-2 text-xs"
              >
                选择{option.title}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
