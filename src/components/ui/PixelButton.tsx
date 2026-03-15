'use client'

interface PixelButtonProps {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: 'default' | 'danger' | 'accent'
  className?: string
}

export function PixelButton({
  children,
  onClick,
  disabled = false,
  variant = 'default',
  className = '',
}: PixelButtonProps) {
  const variantStyles = {
    default: '',
    danger: 'border-[var(--pixel-red)] text-[var(--pixel-red)]',
    accent: 'border-[var(--pixel-accent)] text-[var(--pixel-accent)]',
  }

  return (
    <button
      className={`pixel-btn ${variantStyles[variant]} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}
