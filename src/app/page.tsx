'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { SettingsModal } from '@/components/game/SettingsModal'
import { SaveModal } from '@/components/game/SaveModal'
import { ErrorBanner } from '@/components/game/ErrorBanner'
import { LandingBackground } from '@/components/home/LandingBackground'
import { LandingMenu } from '@/components/home/LandingMenu'
import { useSettingsStore } from '@/store/settingsStore'

export default function LandingPage() {
  const router = useRouter()
  const [showLoad, setShowLoad] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    useSettingsStore.getState().loadSettings()
  }, [])

  const handleNewGame = () => {
    router.push('/intro')
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--pixel-bg)]">
      <LandingBackground />

      <div className="relative z-20 w-full">
        <ErrorBanner />
        <LandingMenu
          isLoading={false}
          onNewGame={handleNewGame}
          onLoadGame={() => setShowLoad(true)}
          onSettings={() => setShowSettings(true)}
        />
      </div>

      {showLoad && (
        <SaveModal
          open={showLoad}
          onClose={() => setShowLoad(false)}
          mode="load"
        />
      )}
      {showSettings && (
        <SettingsModal
          open={showSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}
