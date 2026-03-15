'use client'

interface PixelCardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  selected?: boolean
}

export function PixelCard({
  children,
  className = '',
  onClick,
  selected = false,
}: PixelCardProps) {
  return (
    <div
      className={`pixel-border p-3 bg-[var(--pixel-bg-light)] ${
        selected ? 'border-[var(--pixel-text-bright)]' : ''
      } ${onClick ? 'cursor-pointer hover:bg-[var(--pixel-bg-panel)]' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
