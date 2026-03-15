'use client'

import { PixelButton } from '@/components/ui/PixelButton'

interface SubmitButtonProps {
  isLoading: boolean
  isCritical: boolean
  staminaRemaining: number
  staminaMax: number
  onSubmit: () => void
}

export function SubmitButton({
  isLoading,
  isCritical,
  staminaRemaining,
  staminaMax,
  onSubmit,
}: SubmitButtonProps) {
  const handleClick = () => {
    if (!isCritical && staminaRemaining > 0) {
      if (!confirm(`还有 ${staminaRemaining} 点体力未使用，确定结束？`)) {
        return
      }
    }
    onSubmit()
  }

  if (isCritical) return null // Critical mode submits via choice click

  return (
    <PixelButton
      onClick={handleClick}
      disabled={isLoading}
      variant="accent"
    >
      {isLoading ? '处理中...' : '结束本季度 ▶'}
    </PixelButton>
  )
}
