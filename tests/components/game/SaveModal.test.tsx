import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useGameStore } from '@/store/gameStore'
import { SaveModal } from '@/components/game/SaveModal'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))
import { createNewGame } from '@/engine/state'

// Mock localStorage
const storage: Record<string, string> = {}
vi.stubGlobal('localStorage', {
  getItem: (key: string) => storage[key] ?? null,
  setItem: (key: string, value: string) => { storage[key] = value },
  removeItem: (key: string) => { delete storage[key] },
})

describe('SaveModal', () => {
  beforeEach(() => {
    useGameStore.setState({ state: createNewGame() })
    Object.keys(storage).forEach(k => delete storage[k])
  })

  it('renders 4 save slots', () => {
    render(<SaveModal open={true} onClose={vi.fn()} mode="full" />)
    expect(screen.getByText('自动存档')).toBeDefined()
    expect(screen.getByText('存档1')).toBeDefined()
    expect(screen.getByText('存档2')).toBeDefined()
    expect(screen.getByText('存档3')).toBeDefined()
  })

  it('shows empty state for unused slots', () => {
    render(<SaveModal open={true} onClose={vi.fn()} mode="full" />)
    const empties = screen.getAllByText('空')
    expect(empties.length).toBeGreaterThanOrEqual(3)
  })

  it('does not render when closed', () => {
    const { container } = render(<SaveModal open={false} onClose={vi.fn()} mode="full" />)
    expect(container.innerHTML).toBe('')
  })

  it('load mode hides save and delete buttons', () => {
    render(<SaveModal open={true} onClose={vi.fn()} mode="load" />)
    expect(screen.queryByText('保存')).toBeNull()
  })

  it('save button writes to localStorage', async () => {
    const user = userEvent.setup()
    render(<SaveModal open={true} onClose={vi.fn()} mode="full" />)

    // Find the first save button for slot1
    const saveButtons = screen.getAllByText('保存')
    await user.click(saveButtons[0])

    expect(storage['office_path_save_slot1']).toBeDefined()
  })
})
