import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useGameStore } from '@/store/gameStore'
import { RelationshipsTab } from '@/components/game/RelationshipsTab'
import { createNewGame } from '@/engine/state'

describe('RelationshipsTab', () => {
  beforeEach(() => {
    useGameStore.setState({ state: createNewGame() })
  })

  it('renders active NPCs', () => {
    render(<RelationshipsTab />)
    expect(screen.getByText('王建国')).toBeDefined()
    expect(screen.getByText('张伟')).toBeDefined()
    expect(screen.getByText('李雪')).toBeDefined()
  })

  it('shows NPC role and favor', () => {
    render(<RelationshipsTab />)
    expect(screen.getByText('直属领导')).toBeDefined()
  })

  it('expands NPC detail on click and hides hiddenGoal when favor < 60', async () => {
    const user = userEvent.setup()
    render(<RelationshipsTab />)

    // 王建国 has favor 50 → hiddenGoal should be hidden
    await user.click(screen.getByText('王建国'))
    expect(screen.getByText(/表面和善/)).toBeDefined()
    expect(screen.queryByText(/升总监/)).toBeNull()
  })

  it('shows hiddenGoal when favor >= 60', async () => {
    const state = createNewGame()
    // 小美 has favor 55, bump to 60
    const xiaomei = state.npcs.find(n => n.name === '小美')!
    xiaomei.favor = 65
    useGameStore.setState({ state })

    const user = userEvent.setup()
    render(<RelationshipsTab />)
    await user.click(screen.getByText('小美'))
    expect(screen.getByText(/八卦情报站/)).toBeDefined()
  })
})
