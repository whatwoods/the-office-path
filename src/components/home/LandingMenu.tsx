'use client'

import { PixelButton } from '@/components/ui/PixelButton'

interface LandingMenuProps {
  isLoading: boolean
  onNewGame: () => void
  onLoadGame: () => void
  onSettings: () => void
}

export function LandingMenu({
  isLoading,
  onNewGame,
  onLoadGame,
  onSettings,
}: LandingMenuProps) {
  return (
    <div className="relative z-10 flex min-h-screen items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="pixel-border w-full max-w-[560px] bg-[rgba(15,52,96,0.78)] p-6 backdrop-blur-[2px] sm:p-8">
        <div className="text-center">
          <h1 className="pixel-glow mb-3 max-[374px]:text-3xl text-4xl text-[var(--pixel-text-bright)] sm:text-5xl lg:text-6xl">
            打工之道
          </h1>
          <p className="text-sm leading-6 text-[var(--pixel-text-dim)] sm:text-base">
            一个 AI 驱动的职场模拟器
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3 pb-safe sm:mt-8 sm:gap-4">
          <PixelButton className="w-full" onClick={onNewGame} disabled={isLoading}>
            {isLoading ? '创建中...' : '新游戏'}
          </PixelButton>
          <PixelButton className="w-full" onClick={onLoadGame}>
            读取存档
          </PixelButton>
          <PixelButton className="w-full" onClick={onSettings}>
            设置
          </PixelButton>
        </div>
      </div>
    </div>
  )
}
