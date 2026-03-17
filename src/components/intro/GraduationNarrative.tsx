'use client'

import { useEffect, useEffectEvent, useState } from 'react'

const LINES = [
  '学位证揣进背包，宿舍钥匙交还宿管阿姨。',
  '室友们各奔东西，你拖着行李箱走出校门。',
  '手机里存着三个月前海投简历的记录，大部分石沉大海。',
]

interface GraduationNarrativeProps {
  onComplete: () => void
}

export function GraduationNarrative({ onComplete }: GraduationNarrativeProps) {
  const [visibleLines, setVisibleLines] = useState(0)
  const [fading, setFading] = useState(false)
  const handleComplete = useEffectEvent(onComplete)

  useEffect(() => {
    if (visibleLines >= LINES.length) return
    const timer = setTimeout(() => {
      setVisibleLines((prev) => prev + 1)
    }, 1500)
    return () => clearTimeout(timer)
  }, [visibleLines])

  useEffect(() => {
    if (visibleLines < LINES.length) return
    const timer = setTimeout(() => setFading(true), 2000)
    return () => clearTimeout(timer)
  }, [visibleLines])

  useEffect(() => {
    if (!fading) return
    const timer = setTimeout(() => handleComplete(), 800)
    return () => clearTimeout(timer)
  }, [fading])

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-black px-8"
      style={{
        opacity: fading ? 0 : 1,
        transition: 'opacity 800ms ease-out',
      }}
    >
      {LINES.map((line, index) => (
        <p
          key={line}
          className="text-center text-lg text-[var(--pixel-text)]"
          style={{
            opacity: index < visibleLines ? 1 : 0,
            transform: index < visibleLines ? 'translateY(0)' : 'translateY(12px)',
            transition: 'opacity 800ms ease-out, transform 800ms ease-out',
          }}
        >
          {line}
        </p>
      ))}
    </div>
  )
}
