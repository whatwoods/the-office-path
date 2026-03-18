import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LandingMenu } from '@/components/home/LandingMenu'

describe('LandingMenu', () => {
  it('uses the narrow-screen title sizing and safe-area button padding', () => {
    render(
      <LandingMenu
        isLoading={false}
        onNewGame={vi.fn()}
        onLoadGame={vi.fn()}
        onSettings={vi.fn()}
      />,
    )

    const title = screen.getByRole('heading', { name: '打工之道' })
    const actions = screen.getByText('新游戏').parentElement

    expect(title.className).toContain('max-[374px]:text-3xl')
    expect(actions?.className).toContain('pb-safe')
  })
})
