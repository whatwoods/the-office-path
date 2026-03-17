'use client'

import { PixelProgressBar } from '@/components/ui/PixelProgressBar'
import type { ExecutiveState } from '@/types/executive'

interface ExecutiveStatsProps {
  executive: ExecutiveState
}

export function ExecutiveStats({ executive }: ExecutiveStatsProps) {
  return (
    <div className="mt-4 border-t-2 border-[var(--pixel-border)] pt-3">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-sm text-[var(--pixel-text-bright)]">高管面板 · {executive.stage}</div>
          <div className="text-[10px] text-[var(--pixel-text-dim)]">
            股价 ¥{executive.stockPrice.toLocaleString('zh-CN')} · 管辖 {executive.departmentCount} 个部门
          </div>
        </div>
        <div className="text-right text-[10px] text-[var(--pixel-text-dim)]">
          <div>已归属期权</div>
          <div className="mt-1 text-xs text-[var(--pixel-gold)]">
            {(executive.vestedShares * 100).toFixed(2)}%
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <PixelProgressBar
          value={executive.departmentPerformance}
          max={100}
          label="部门业绩"
          color="var(--bar-professional)"
        />
        <PixelProgressBar
          value={executive.boardSupport}
          max={100}
          label="董事会支持"
          color="var(--bar-reputation)"
        />
        <PixelProgressBar
          value={executive.teamLoyalty}
          max={100}
          label="团队忠诚"
          color="var(--bar-mood)"
        />
        <PixelProgressBar
          value={executive.politicalCapital}
          max={100}
          label="政治资本"
          color="var(--bar-communication)"
        />
      </div>
    </div>
  )
}
