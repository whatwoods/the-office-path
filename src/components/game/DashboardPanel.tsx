'use client'

import { useGameStore } from '@/store/gameStore'
import { PanelTabs } from '@/components/game/PanelTabs'
import { AttributesTab } from '@/components/game/AttributesTab'
import { RelationshipsTab } from '@/components/game/RelationshipsTab'
import { PhoneTab } from '@/components/game/PhoneTab'

export function DashboardPanel() {
  const activePanel = useGameStore(s => s.activePanel)

  return (
    <div data-testid="dashboard-panel" className="flex h-full flex-col">
      <PanelTabs />
      <div className="flex-1 overflow-y-auto p-3">
        {activePanel === 'attributes' && <AttributesTab />}
        {activePanel === 'relationships' && <RelationshipsTab />}
        {activePanel === 'phone' && <PhoneTab />}
      </div>
    </div>
  )
}
