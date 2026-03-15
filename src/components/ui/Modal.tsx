'use client'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />
      <div className="pixel-border relative z-10 max-h-[80vh] w-[500px] overflow-y-auto bg-[var(--pixel-bg)] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="pixel-glow text-lg text-[var(--pixel-text-bright)]">{title}</h2>
          <button
            className="pixel-btn px-2 py-1 text-xs"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
