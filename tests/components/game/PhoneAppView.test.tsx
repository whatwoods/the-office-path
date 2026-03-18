import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createNewGame } from '@/engine/state'
import { useGameStore } from '@/store/gameStore'
import { PhoneAppView } from '@/components/game/PhoneAppView'

vi.mock('@/components/game/phone/XiaoxinApp', () => ({
  XiaoxinApp: () => <div>小信内容</div>,
}))

vi.mock('@/components/game/phone/MaimaiApp', () => ({
  MaimaiApp: () => <div>麦麦内容</div>,
}))

vi.mock('@/components/game/phone/JinritiaotiaoApp', () => ({
  JinritiaotiaoApp: () => <div>今日条条内容</div>,
}))

vi.mock('@/components/game/phone/ZhifubeiApp', () => ({
  ZhifubeiApp: () => <div>支付呗内容</div>,
}))

vi.mock('@/components/game/phone/HrzhipinApp', () => ({
  HrzhipinApp: () => <div>BOSS真聘内容</div>,
}))

vi.mock('@/components/game/phone/GenericMessageApp', () => ({
  GenericMessageApp: () => <div>通用消息内容</div>,
}))

describe('PhoneAppView', () => {
  beforeEach(() => {
    useGameStore.setState({
      state: createNewGame(),
      activePhoneApp: 'xiaoxin',
    })
  })

  it('uses a touch-friendly back button and centered title', () => {
    render(<PhoneAppView />)

    const backButton = screen.getByRole('button', { name: '← 返回' })
    const title = screen.getByText('小信')

    expect(backButton.className).toContain('py-1')
    expect(backButton.className).toContain('sm:text-sm')
    expect(title.className).toContain('flex-1')
    expect(title.className).toContain('text-center')
  })

  it('returns to the app grid when pressing back', async () => {
    const user = userEvent.setup()

    render(<PhoneAppView />)

    await user.click(screen.getByRole('button', { name: '← 返回' }))

    expect(useGameStore.getState().activePhoneApp).toBeNull()
  })
})
