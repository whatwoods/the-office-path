'use client'

import { useGameStore } from '@/store/gameStore'
import { PhoneAppGrid } from '@/components/game/PhoneAppGrid'
import { PhoneAppView } from '@/components/game/PhoneAppView'

export function PhoneTab() {
  const activePhoneApp = useGameStore(s => s.activePhoneApp)

  return (
    <div data-testid="phone-tab">
      {activePhoneApp ? <PhoneAppView /> : <PhoneAppGrid />}
    </div>
  )
}
