'use client'

import { useState } from 'react'
import { PixelButton } from '@/components/ui/PixelButton'
import { PixelCard } from '@/components/ui/PixelCard'
import type { MajorType } from '@/types/game'

interface MajorOption {
  key: MajorType
  icon: string
  label: string
  description: string
}

const MAJOR_OPTIONS: MajorOption[] = [
  {
    key: 'tech',
    icon: '💻',
    label: '计算机 / 互联网',
    description: '代码写了四年，至少 Bug 不会跟你谈薪资。',
  },
  {
    key: 'finance',
    icon: '📊',
    label: '金融 / 商科',
    description: 'Excel 用得比筷子还熟，PPT 是你的第二语言。',
  },
  {
    key: 'liberal',
    icon: '📚',
    label: '文科 / 综合',
    description: '读了很多书，交了很多朋友，简历上写“沟通能力强”。',
  },
]

interface MajorSelectProps {
  onSelect: (major: MajorType) => void
}

export function MajorSelect({ onSelect }: MajorSelectProps) {
  const [selected, setSelected] = useState<MajorType | null>(null)

  return (
    <div className="flex w-full max-w-lg flex-col items-center gap-6 px-4 sm:gap-8">
      <p className="text-center text-lg text-[var(--pixel-text)]">
        四年的大学生活，你学的是……
      </p>
      <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
        {MAJOR_OPTIONS.map((option) => (
          <PixelCard
            key={option.key}
            selected={selected === option.key}
            onClick={() => setSelected(option.key)}
            className="w-full max-w-56 cursor-pointer p-6 text-center transition-transform hover:-translate-y-1 sm:w-56"
          >
            <div className="mb-3 text-4xl">{option.icon}</div>
            <h3 className="mb-2 text-sm text-[var(--pixel-text-bright)]">
              {option.label}
            </h3>
            <p className="text-xs text-[var(--pixel-text-dim)]">
              {option.description}
            </p>
          </PixelCard>
        ))}
      </div>
      {selected && (
        <PixelButton onClick={() => onSelect(selected)}>确认选择</PixelButton>
      )}
    </div>
  )
}
