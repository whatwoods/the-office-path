'use client'

import type { CriticalChoice } from '@/types/actions'

interface CriticalChoicesProps {
  choices: CriticalChoice[]
  staminaRemaining: number
  staminaPerDay: number
  currentDay: number
  maxDays: number
  onChoose: (choice: CriticalChoice) => void
}

function formatEffects(choice: CriticalChoice): string[] {
  const parts: string[] = []
  if (choice.effects.statChanges) {
    const labels: Record<string, string> = {
      health: '健康', professional: '专业', communication: '沟通',
      management: '管理', network: '人脉', mood: '心情',
      money: '金钱', reputation: '声望',
    }
    for (const [key, val] of Object.entries(choice.effects.statChanges)) {
      if (val !== undefined) {
        const label = labels[key] ?? key
        parts.push(`${label}${val > 0 ? '+' : ''}${val}`)
      }
    }
  }
  if (choice.effects.npcFavorChanges) {
    for (const [name, val] of Object.entries(choice.effects.npcFavorChanges)) {
      parts.push(`${name}好感${val > 0 ? '+' : ''}${val}`)
    }
  }
  return parts
}

export function CriticalChoices({
  choices,
  staminaRemaining,
  staminaPerDay,
  currentDay,
  maxDays,
  onChoose,
}: CriticalChoicesProps) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-xs text-[var(--pixel-text-dim)]">
        <span>关键期 第 {currentDay} / {maxDays} 天</span>
        <span>今日体力: {staminaRemaining} / {staminaPerDay}</span>
      </div>
      <div className="flex flex-wrap gap-3">
        {choices.map(choice => {
          const disabled = choice.staminaCost > staminaRemaining
          const effects = formatEffects(choice)
          const hasRisk = !!choice.effects.riskEvent

          return (
            <button
              key={choice.choiceId}
              disabled={disabled}
              onClick={() => onChoose(choice)}
              className="pixel-btn flex w-40 flex-col items-start gap-1 p-3 text-left"
            >
              <div className="flex w-full items-center justify-between">
                <span className="text-[10px] text-[var(--pixel-text-amber)]">
                  {choice.category}
                </span>
                <span className="text-[10px] text-[var(--pixel-text-dim)]">
                  {choice.staminaCost}点
                </span>
              </div>
              <span className="text-xs">{choice.label}</span>
              {effects.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {effects.map((e, i) => (
                    <span key={i} className="text-[10px] text-[var(--pixel-text-bright)]">{e}</span>
                  ))}
                </div>
              )}
              {hasRisk && (
                <span className="text-[10px] text-[var(--pixel-accent)]">
                  ⚠ {Math.round(choice.effects.riskEvent!.probability * 100)}% {choice.effects.riskEvent!.description}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
