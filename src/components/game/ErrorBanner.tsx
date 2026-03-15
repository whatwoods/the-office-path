'use client'

import { useEffect } from 'react'
import { useGameStore } from '@/store/gameStore'

export function ErrorBanner() {
  const error = useGameStore(s => s.error)
  const clearError = useGameStore(s => s.clearError)

  useEffect(() => {
    if (!error) return
    const timer = setTimeout(clearError, 3000)
    return () => clearTimeout(timer)
  }, [error, clearError])

  if (!error) return null

  return (
    <div className="flex items-center justify-between bg-[var(--pixel-red)] px-4 py-2 text-sm text-white">
      <span>{error}</span>
      <button onClick={clearError} className="text-white hover:underline">
        ✕
      </button>
    </div>
  )
}
