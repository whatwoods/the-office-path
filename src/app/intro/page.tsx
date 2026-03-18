'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ErrorBanner } from '@/components/game/ErrorBanner'
import { BlackScreenText } from '@/components/intro/BlackScreenText'
import { GraduationNarrative } from '@/components/intro/GraduationNarrative'
import { MajorSelect } from '@/components/intro/MajorSelect'
import { NameInput } from '@/components/intro/NameInput'
import { OfferLetter } from '@/components/intro/OfferLetter'
import { PhoneNotification } from '@/components/intro/PhoneNotification'
import { useGameStore } from '@/store/gameStore'
import type { MajorType } from '@/types/game'

type IntroPhase =
  | 'blackscreen'
  | 'narrative'
  | 'name-input'
  | 'major-select'
  | 'phone-notification'
  | 'offer-letter'

export default function IntroPage() {
  const router = useRouter()
  const newGame = useGameStore((store) => store.newGame)
  const isLoading = useGameStore((store) => store.isLoading)
  const [phase, setPhase] = useState<IntroPhase>('blackscreen')
  const [playerName, setPlayerName] = useState('')
  const [major, setMajor] = useState<MajorType | null>(null)

  const handleAcceptOffer = async () => {
    if (!major) return

    await newGame({
      major,
      playerName: playerName || '新员工',
    })

    if (useGameStore.getState().state) {
      router.push('/game')
    }
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center overflow-y-auto bg-[var(--pixel-bg)] px-4 pb-safe sm:px-6">
      <div className="fixed inset-x-0 top-0 z-[60]">
        <ErrorBanner />
      </div>

      {phase === 'blackscreen' && (
        <BlackScreenText
          text="2026年6月，你终于毕业了。"
          onComplete={() => setPhase('narrative')}
        />
      )}
      {phase === 'narrative' && (
        <GraduationNarrative onComplete={() => setPhase('name-input')} />
      )}
      {phase === 'name-input' && (
        <NameInput
          onSubmit={(name) => {
            setPlayerName(name)
            setPhase('major-select')
          }}
        />
      )}
      {phase === 'major-select' && (
        <MajorSelect
          onSelect={(selected) => {
            setMajor(selected)
            setPhase('phone-notification')
          }}
        />
      )}
      {phase === 'phone-notification' && major && (
        <PhoneNotification
          major={major}
          onComplete={() => setPhase('offer-letter')}
        />
      )}
      {phase === 'offer-letter' && major && (
        <OfferLetter
          playerName={playerName || '新员工'}
          major={major}
          onAccept={handleAcceptOffer}
          isLoading={isLoading}
        />
      )}
    </div>
  )
}
