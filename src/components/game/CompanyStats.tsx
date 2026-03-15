'use client'

import { useState } from 'react'
import type { CompanyState, CompanyStage } from '@/types/company'
import { PixelProgressBar } from '@/components/ui/PixelProgressBar'

const STAGE_LABELS: Record<CompanyStage, string> = {
  garage: '车库创业',
  small_team: '小型团队',
  series_a: 'A轮公司',
  growth: '成长期',
  pre_ipo: '上市冲刺',
  public: '上市公司',
}

interface CompanyStatsProps {
  company: CompanyState
}

export function CompanyStats({ company }: CompanyStatsProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="mt-4 border-t-2 border-[var(--pixel-border)] pt-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left text-sm text-[var(--pixel-text-amber)]"
      >
        公司 {expanded ? '▼' : '▶'} {STAGE_LABELS[company.stage] ?? company.stage}
      </button>

      {expanded && (
        <div className="mt-2 space-y-1">
          <PixelProgressBar
            value={company.productQuality}
            max={100}
            label="产品"
            color="var(--bar-professional)"
          />
          <PixelProgressBar
            value={company.teamSatisfaction}
            max={100}
            label="团队"
            color="var(--bar-mood)"
          />
          <PixelProgressBar
            value={company.brandAwareness}
            max={100}
            label="品牌"
            color="var(--bar-reputation)"
          />
          <div className="mt-2 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-[var(--pixel-text-dim)]">客户</span>
              <span>{company.customerCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--pixel-text-dim)]">员工</span>
              <span>{company.employeeCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--pixel-text-dim)]">季度营收</span>
              <span className="text-[var(--pixel-green)]">
                ¥{company.quarterlyRevenue.toLocaleString('zh-CN')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--pixel-text-dim)]">季度支出</span>
              <span className="text-[var(--pixel-red)]">
                ¥{company.quarterlyExpenses.toLocaleString('zh-CN')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--pixel-text-dim)]">现金流</span>
              <span className={company.cashFlow >= 0 ? 'text-[var(--pixel-green)]' : 'text-[var(--pixel-red)]'}>
                ¥{company.cashFlow.toLocaleString('zh-CN')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--pixel-text-dim)]">估值</span>
              <span>¥{company.valuation.toLocaleString('zh-CN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--pixel-text-dim)]">股权</span>
              <span>{company.founderEquity}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
