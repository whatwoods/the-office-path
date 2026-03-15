'use client'

import { useGameStore } from '@/store/gameStore'
import { PixelProgressBar } from '@/components/ui/PixelProgressBar'
import { CompanyStats } from '@/components/game/CompanyStats'
import { useRef, useEffect, useState } from 'react'
import type { PlayerAttributes } from '@/types/game'

const ATTRIBUTE_CONFIG = [
  { key: 'health' as const, label: '健康', color: 'var(--bar-health)' },
  { key: 'professional' as const, label: '专业', color: 'var(--bar-professional)' },
  { key: 'communication' as const, label: '沟通', color: 'var(--bar-communication)' },
  { key: 'management' as const, label: '管理', color: 'var(--bar-management)' },
  { key: 'network' as const, label: '人脉', color: 'var(--bar-network)' },
  { key: 'mood' as const, label: '心情', color: 'var(--bar-mood)' },
  { key: 'reputation' as const, label: '声望', color: 'var(--bar-reputation)' },
] as const

type AttrKey = typeof ATTRIBUTE_CONFIG[number]['key']

export function AttributesTab() {
  const state = useGameStore(s => s.state)
  const promotionInfo = useGameStore(s => s.promotionInfo)
  const prevAttrs = useRef<PlayerAttributes | null>(null)
  const [flashMap, setFlashMap] = useState<Record<string, 'increase' | 'decrease'>>({})

  // Detect attribute changes and trigger flash
  useEffect(() => {
    if (!state || !prevAttrs.current) {
      if (state) prevAttrs.current = { ...state.player }
      return
    }
    const flashes: Record<string, 'increase' | 'decrease'> = {}
    for (const attr of ATTRIBUTE_CONFIG) {
      const prev = prevAttrs.current[attr.key]
      const curr = state.player[attr.key]
      if (curr > prev) flashes[attr.key] = 'increase'
      else if (curr < prev) flashes[attr.key] = 'decrease'
    }
    prevAttrs.current = { ...state.player }
    if (Object.keys(flashes).length > 0) {
      setFlashMap(flashes)
      const timer = setTimeout(() => setFlashMap({}), 1000)
      return () => clearTimeout(timer)
    }
  }, [state?.player])

  if (!state) return null

  const money = state.player.money.toLocaleString('zh-CN')

  return (
    <div data-testid="attributes-tab" className="space-y-2">
      {/* 晋升提示 */}
      {promotionInfo?.eligible && (
        <div className="pixel-border-light mb-3 bg-[var(--pixel-bg-panel)] p-2 text-center">
          <span className="text-xs text-[var(--pixel-gold)]">可晋升</span>
          <div className="mt-1 flex justify-center gap-2">
            {promotionInfo.nextLevels.map(level => (
              <span key={level} className="text-sm text-[var(--pixel-text-bright)]">{level}</span>
            ))}
          </div>
        </div>
      )}

      {/* 7 项属性进度条 */}
      {ATTRIBUTE_CONFIG.map(attr => (
        <div
          key={attr.key}
          className={flashMap[attr.key] === 'increase' ? 'flash-increase' : flashMap[attr.key] === 'decrease' ? 'flash-decrease' : ''}
        >
          <PixelProgressBar
            value={state.player[attr.key]}
            max={100}
            label={attr.label}
            color={attr.color}
          />
        </div>
      ))}

      {/* 金钱 */}
      <div className="flex items-center gap-2 pt-1">
        <span className="w-12 text-xs text-[var(--pixel-text-dim)]">金钱</span>
        <span className="text-sm text-[var(--pixel-text-amber)]">¥{money}</span>
      </div>

      {/* Phase 2 公司属性 */}
      {state.phase === 2 && state.company && (
        <CompanyStats company={state.company} />
      )}
    </div>
  )
}
