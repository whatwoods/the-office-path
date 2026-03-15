'use client'

interface PixelProgressBarProps {
  value: number
  max: number
  label: string
  color?: string
  className?: string
}

export function PixelProgressBar({
  value,
  max,
  label,
  color = 'var(--pixel-green)',
  className = '',
}: PixelProgressBarProps) {
  const segments = 10
  const filled = Math.floor((value / max) * segments)

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="w-12 text-xs text-[var(--pixel-text-dim)]">{label}</span>
      <div className="flex gap-0.5">
        {Array.from({ length: segments }, (_, i) => (
          <div
            key={i}
            data-testid="segment"
            data-filled={i < filled ? 'true' : 'false'}
            className="h-3 w-3"
            style={{
              backgroundColor: i < filled ? color : 'var(--pixel-bg)',
              border: '1px solid var(--pixel-border)',
            }}
          />
        ))}
      </div>
      <span className="w-8 text-right text-xs text-[var(--pixel-text)]">{value}</span>
    </div>
  )
}
