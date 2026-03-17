'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { SettingsModal } from '@/components/game/SettingsModal'
import { PixelButton } from '@/components/ui/PixelButton'
import { SaveModal } from '@/components/game/SaveModal'
import { useGameStore } from '@/store/gameStore'
import { useSettingsStore } from '@/store/settingsStore'

export default function LandingPage() {
  const router = useRouter()
  const { newGame, isLoading } = useGameStore()
  const [showLoad, setShowLoad] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    useSettingsStore.getState().loadSettings()
  }, [])

  const handleNewGame = async () => {
    await newGame()
    router.push('/game')
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--pixel-bg)]">
      {/* 小屏幕提示 */}
      <div className="block min-[1024px]:hidden p-8 text-center text-[var(--pixel-text-amber)]">
        请使用电脑访问
      </div>

      <div className="hidden min-[1024px]:flex flex-col items-center gap-12">
        {/* 游戏标题 */}
        <div className="text-center">
          <h1 className="pixel-glow text-6xl text-[var(--pixel-text-bright)] mb-4">
            打工之道
          </h1>
          <p className="text-lg text-[var(--pixel-text-dim)]">
            一个 AI 驱动的职场模拟器
          </p>
        </div>

        {/* 菜单按钮 */}
        <div className="flex flex-col gap-4">
          <PixelButton onClick={handleNewGame} disabled={isLoading}>
            {isLoading ? '创建中...' : '新游戏'}
          </PixelButton>
          <PixelButton onClick={() => setShowLoad(true)}>
            读取存档
          </PixelButton>
          <PixelButton onClick={() => setShowSettings(true)}>
            设置
          </PixelButton>
        </div>
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
