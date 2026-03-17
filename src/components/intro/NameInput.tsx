'use client'

import type { KeyboardEvent } from 'react'
import { useState } from 'react'
import { PixelButton } from '@/components/ui/PixelButton'

interface NameInputProps {
  onSubmit: (name: string) => void
}

export function NameInput({ onSubmit }: NameInputProps) {
  const [name, setName] = useState('')

  const handleSubmit = () => {
    onSubmit(name.trim())
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSubmit()
    }
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <p className="text-lg text-[var(--pixel-text)]">你叫什么名字？</p>
      <input
        type="text"
        value={name}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="输入你的名字"
        maxLength={10}
        autoFocus
        className="pixel-border w-64 bg-[var(--pixel-bg-light)] px-4 py-3 text-center text-lg text-[var(--pixel-text-bright)] placeholder:text-[var(--pixel-text-dim)] outline-none"
      />
      <PixelButton onClick={handleSubmit}>
        {name.trim() ? '确认' : '跳过'}
      </PixelButton>
    </div>
  )
}
