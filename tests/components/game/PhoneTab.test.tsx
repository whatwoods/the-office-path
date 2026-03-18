import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useGameStore } from '@/store/gameStore'
import { PhoneTab } from '@/components/game/PhoneTab'
import { createNewGame } from '@/engine/state'

describe('PhoneTab', () => {
  beforeEach(() => {
    const state = createNewGame()
    state.phoneMessages = [
      { id: '1', app: 'xiaoxin', sender: '张伟', content: '下班去吃饭？', read: false, quarter: 1 },
      { id: '2', app: 'maimai', sender: '匿名', content: '听说要裁员', read: false, quarter: 1 },
      { id: '3', app: 'xiaoxin', sender: '李雪', content: '代码review了', read: true, quarter: 1 },
    ]
    useGameStore.setState({ state, activePhoneApp: null })
  })

  it('renders app grid with unread counts', () => {
    render(<PhoneTab />)
    expect(screen.getByText('小信')).toBeDefined()
    expect(screen.getByText('麦麦')).toBeDefined()
    // 小信 has 1 unread, 麦麦 has 1 unread
    const badges = screen.getAllByTestId('unread-badge')
    expect(badges.length).toBeGreaterThanOrEqual(2)
  })

  it('opens app view on click', async () => {
    const user = userEvent.setup()
    render(<PhoneTab />)

    await user.click(screen.getByText('小信'))

    expect(useGameStore.getState().activePhoneApp).toBe('xiaoxin')
  })

  it('marks messages as read when opening an app', async () => {
    const user = userEvent.setup()
    render(<PhoneTab />)

    await user.click(screen.getByText('小信'))

    const xiaoxinMessages = useGameStore
      .getState()
      .state!.phoneMessages.filter(message => message.app === 'xiaoxin')

    expect(xiaoxinMessages.every(message => message.read)).toBe(true)
    expect(
      useGameStore
        .getState()
        .state!.phoneMessages.find(message => message.id === '2')?.read,
    ).toBe(false)
  })

  it('shows back button in app view', async () => {
    useGameStore.setState({ activePhoneApp: 'xiaoxin' })
    render(<PhoneTab />)

    expect(screen.getByRole('button', { name: '← 返回' })).toBeDefined()
  })
})
