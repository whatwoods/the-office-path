'use client'

import { useState } from 'react'

interface MaimaiCommentInputProps {
  onSubmit: (content: string) => void
  disabled?: boolean
}

export function MaimaiCommentInput({
  onSubmit,
  disabled = false,
}: MaimaiCommentInputProps) {
  const [content, setContent] = useState('')

  const handleSubmit = () => {
    const trimmed = content.trim()
    if (!trimmed || disabled) return
    onSubmit(trimmed)
    setContent('')
  }

  return (
    <div className="mt-2 space-y-2">
      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        disabled={disabled}
        rows={2}
        placeholder={disabled ? '本帖已评论' : '补一句匿名评论...'}
        className="w-full resize-none pixel-border-light bg-[var(--pixel-bg-panel)] p-2 text-xs outline-none disabled:opacity-60"
      />
      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={disabled || content.trim().length === 0}
          className="pixel-btn px-2 py-1 text-[10px]"
        >
          评论
        </button>
      </div>
    </div>
  )
}
