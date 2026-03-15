'use client'

import { useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import { PixelProgressBar } from '@/components/ui/PixelProgressBar'
import type { NPC } from '@/types/game'

function getFavorColor(favor: number): string {
  if (favor <= 20) return 'var(--favor-low)'
  if (favor <= 50) return 'var(--favor-mid)'
  if (favor <= 80) return 'var(--favor-high)'
  return 'var(--favor-max)'
}

function NPCRow({ npc }: { npc: NPC }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="pixel-border-light mb-2 bg-[var(--pixel-bg-light)] p-2">
      <div
        className="flex cursor-pointer items-center justify-between"
        onClick={() => setExpanded(!expanded)}
      >
        <div>
          <span className="text-sm">{npc.name}</span>
          <span className="ml-2 text-xs text-[var(--pixel-text-dim)]">{npc.role}</span>
        </div>
        <span className="text-xs text-[var(--pixel-text-dim)]">{npc.currentStatus}</span>
      </div>

      <PixelProgressBar
        value={npc.favor}
        max={100}
        label="好感"
        color={getFavorColor(npc.favor)}
        className="mt-1"
      />

      {expanded && (
        <div className="mt-2 border-t border-[var(--pixel-border)] pt-2 text-xs">
          <p className="text-[var(--pixel-text-dim)]">{npc.personality}</p>
          {npc.favor >= 60 && (
            <p className="mt-1 text-[var(--pixel-text-amber)]">
              内心想法：{npc.hiddenGoal}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export function RelationshipsTab() {
  const state = useGameStore(s => s.state)
  const [showInactive, setShowInactive] = useState(false)

  if (!state) return null

  const activeNpcs = state.npcs.filter(n => n.isActive)
  const inactiveNpcs = state.npcs.filter(n => !n.isActive)

  return (
    <div data-testid="relationships-tab">
      {activeNpcs.map(npc => (
        <NPCRow key={npc.id} npc={npc} />
      ))}

      {inactiveNpcs.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowInactive(!showInactive)}
            className="text-xs text-[var(--pixel-text-dim)]"
          >
            历史人物 {showInactive ? '▼' : '▶'} ({inactiveNpcs.length})
          </button>
          {showInactive && (
            <div className="mt-2 opacity-60">
              {inactiveNpcs.map(npc => (
                <NPCRow key={npc.id} npc={npc} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
