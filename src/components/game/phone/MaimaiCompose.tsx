'use client'

import { useState } from 'react'

interface MaimaiComposeProps {
  onSubmit: (content: string) => void
  canPost: boolean
  postsRemaining: number
}

export function MaimaiCompose({
  onSubmit,
  canPost,
  postsRemaining,
}: MaimaiComposeProps) {
  const [content, setContent] = useState('')

  const handleSubmit = () => {
    const trimmed = content.trim()
    if (!trimmed || !canPost) return
    onSubmit(trimmed)
    setContent('')
  }

  return (
    <div className="pixel-border-light bg-[var(--pixel-bg-light)] p-3">
      <div className="mb-2 flex items-center justify-between text-[10px] text-[var(--pixel-text-dim)]">
        <span>匿名发帖</span>
        <span>本季度剩余 {Math.max(0, postsRemaining)} 帖</span>
      </div>
      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        rows={4}
        disabled={!canPost}
        placeholder={canPost ? '写点职场真心话，麦麦都懂。' : '当前阶段暂时不能发帖'}
        className="w-full resize-none pixel-border bg-[var(--pixel-bg-panel)] p-2 text-xs outline-none disabled:opacity-60"
      />
      <div className="mt-2 flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={!canPost || content.trim().length === 0}
          className="pixel-btn px-3 py-1 text-xs"
        >
          发布匿名帖
        </button>
      </div>
    </div>
  )
}
