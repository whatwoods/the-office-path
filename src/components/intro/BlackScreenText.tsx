'use client'

import { useEffect, useEffectEvent, useState } from 'react'

interface BlackScreenTextProps {
  text: string
  onComplete: () => void
  charDelay?: number
  holdDelay?: number
  fadeDuration?: number
}

export function BlackScreenText({
  text,
  onComplete,
  charDelay = 120,
  holdDelay = 1500,
  fadeDuration = 800,
}: BlackScreenTextProps) {
  const [displayedChars, setDisplayedChars] = useState(0)
  const [fading, setFading] = useState(false)
  const handleComplete = useEffectEvent(onComplete)

  useEffect(() => {
    if (displayedChars >= text.length) return

    const timer = setTimeout(() => {
      setDisplayedChars((prev) => Math.min(prev + 1, text.length))
    }, charDelay)

    return () => clearTimeout(timer)
  }, [displayedChars, text.length, charDelay])

  useEffect(() => {
    if (displayedChars < text.length) return
    const timer = setTimeout(() => setFading(true), holdDelay)
    return () => clearTimeout(timer)
  }, [displayedChars, text.length, holdDelay])

  useEffect(() => {
    if (!fading) return
    const timer = setTimeout(() => handleComplete(), fadeDuration)
    return () => clearTimeout(timer)
  }, [fading, fadeDuration])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black"
      style={{
        opacity: fading ? 0 : 1,
        transition: `opacity ${fadeDuration}ms ease-out`,
      }}
    >
      <p className="pixel-glow text-2xl text-[var(--pixel-text-bright)]">
        {text.slice(0, displayedChars)}
        {displayedChars < text.length && <span className="animate-pulse">_</span>}
      </p>
    </div>
  )
}
