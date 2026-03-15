'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { NarrativeSegment } from '@/lib/narrative'

interface NarrativeDisplayProps {
  segments: NarrativeSegment[]
  onComplete: () => void
}

const CHAR_INTERVAL = 40 // ms per character
const SEGMENT_PAUSE = 300 // ms between segments

export function NarrativeDisplay({ segments, onComplete }: NarrativeDisplayProps) {
  const [currentSegmentIdx, setCurrentSegmentIdx] = useState(0)
  const [displayedChars, setDisplayedChars] = useState(0)
  const [skipped, setSkipped] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const currentSegment = segments[currentSegmentIdx]
  const isLastSegment = currentSegmentIdx >= segments.length - 1
  const segmentComplete = currentSegment
    ? displayedChars >= currentSegment.content.length
    : true

  // Typewriter tick
  useEffect(() => {
    if (skipped || !currentSegment || segmentComplete) return

    intervalRef.current = setInterval(() => {
      setDisplayedChars(prev => {
        const next = prev + 1
        if (next >= currentSegment.content.length) {
          if (intervalRef.current) clearInterval(intervalRef.current)
        }
        return next
      })
    }, CHAR_INTERVAL)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [currentSegmentIdx, skipped, currentSegment, segmentComplete])

  // Move to next segment after pause
  useEffect(() => {
    if (!segmentComplete || isLastSegment || skipped) return

    const timer = setTimeout(() => {
      setCurrentSegmentIdx(prev => prev + 1)
      setDisplayedChars(0)
    }, SEGMENT_PAUSE)

    return () => clearTimeout(timer)
  }, [segmentComplete, isLastSegment, skipped])

  // Notify completion
  useEffect(() => {
    if (segments.length > 0 && segmentComplete && isLastSegment) {
      onComplete()
    }
  }, [segmentComplete, isLastSegment, onComplete])

  const handleSkip = useCallback(() => {
    setSkipped(true)
    setCurrentSegmentIdx(segments.length - 1)
    if (segments.length > 0) {
      setDisplayedChars(segments[segments.length - 1].content.length)
    }
  }, [segments])

  if (segments.length === 0) return null

  return (
    <div className="relative">
      <div className="space-y-4">
        {segments.slice(0, currentSegmentIdx + 1).map((seg, i) => {
          const isCurrentSeg = i === currentSegmentIdx
          const text = isCurrentSeg && !skipped
            ? seg.content.slice(0, displayedChars)
            : seg.content

          if (seg.type === 'dialogue') {
            return (
              <div key={i} className="flex items-start gap-3 my-3">
                <span className="pixel-border-light shrink-0 bg-[var(--pixel-bg-panel)] px-2 py-1 text-xs text-[var(--pixel-text-amber)]">
                  {seg.speaker}
                </span>
                <div
                  data-testid="dialogue-content"
                  className="pixel-border-light bg-[var(--pixel-bg-light)] p-3 text-sm"
                >
                  {text}
                </div>
              </div>
            )
          }

          return (
            <p
              key={i}
              data-testid="narrative-text"
              className="text-sm leading-7 text-[var(--pixel-text)]"
            >
              {text}
            </p>
          )
        })}
      </div>

      {!skipped && !segmentComplete && (
        <button
          onClick={handleSkip}
          className="pixel-btn absolute right-0 bottom-0 px-2 py-1 text-xs"
        >
          跳过
        </button>
      )}
    </div>
  )
}
