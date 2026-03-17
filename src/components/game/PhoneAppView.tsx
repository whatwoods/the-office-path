'use client'

import { useGameStore } from '@/store/gameStore'
import type { PhoneApp } from '@/types/game'
import { XiaoxinApp } from '@/components/game/phone/XiaoxinApp'
import { MaimaiApp } from '@/components/game/phone/MaimaiApp'
import { JinritiaotiaoApp } from '@/components/game/phone/JinritiaotiaoApp'
import { ZhifubeiApp } from '@/components/game/phone/ZhifubeiApp'
import { HrzhipinApp } from '@/components/game/phone/HrzhipinApp'
import { GenericMessageApp } from '@/components/game/phone/GenericMessageApp'

const APP_LABELS: Record<PhoneApp, string> = {
  xiaoxin: '小信',
  maimai: '麦麦',
  jinritiaotiao: '今日条条',
  zhifubei: '支付呗',
  hrzhipin: 'BOSS真聘',
  baolema: '饱了吗',
  huajiazhaogang: '花甲找房',
  tiantian: '天天财富',
  dingding: '叮叮',
  huabingtong: '画饼通',
}

function AppContent({ app }: { app: PhoneApp }) {
  switch (app) {
    case 'xiaoxin':
      return <XiaoxinApp />
    case 'maimai':
      return <MaimaiApp />
    case 'jinritiaotiao':
      return <JinritiaotiaoApp />
    case 'zhifubei':
      return <ZhifubeiApp />
    case 'hrzhipin':
      return <HrzhipinApp />
    default:
      return <GenericMessageApp app={app} />
  }
}

export function PhoneAppView() {
  const activeApp = useGameStore(s => s.activePhoneApp)
  const setActivePhoneApp = useGameStore(s => s.setActivePhoneApp)

  if (!activeApp) return null

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b-2 border-[var(--pixel-border)] p-2">
        <button
          onClick={() => setActivePhoneApp(null)}
          className="pixel-btn px-2 py-0.5 text-xs"
        >
          返回
        </button>
        <span className="text-sm">{APP_LABELS[activeApp]}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        <AppContent app={activeApp} />
      </div>
    </div>
  )
}
