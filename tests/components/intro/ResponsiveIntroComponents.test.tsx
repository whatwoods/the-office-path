import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MajorSelect } from '@/components/intro/MajorSelect'
import { NameInput } from '@/components/intro/NameInput'
import { OfferLetter } from '@/components/intro/OfferLetter'

describe('responsive intro components', () => {
  it('keeps the name input within a narrow-screen container', () => {
    render(<NameInput onSubmit={vi.fn()} />)

    const container = screen.getByText('你叫什么名字？').parentElement
    const input = screen.getByPlaceholderText('输入你的名字')

    expect(container?.className).toContain('w-full')
    expect(container?.className).toContain('max-w-sm')
    expect(input.className).toContain('w-full')
    expect(input.className).toContain('max-w-64')
  })

  it('uses responsive width constraints for the major selection cards', () => {
    render(<MajorSelect onSelect={vi.fn()} />)

    const container = screen.getByText('四年的大学生活，你学的是……').parentElement
    const cardsWrapper = container?.children.item(1) as HTMLElement
    const firstCard = screen.getByText('计算机 / 互联网').closest('div')

    expect(container?.className).toContain('w-full')
    expect(container?.className).toContain('max-w-lg')
    expect(container?.className).toContain('px-4')
    expect(cardsWrapper.className).toContain('gap-4')
    expect(cardsWrapper.className).toContain('sm:gap-6')
    expect(firstCard?.className).toContain('w-full')
    expect(firstCard?.className).toContain('max-w-56')
    expect(firstCard?.className).toContain('sm:w-56')
  })

  it('reduces offer letter padding on narrow screens', () => {
    render(
      <OfferLetter
        playerName="小明"
        major="tech"
        onAccept={vi.fn()}
        isLoading={false}
      />,
    )

    const title = screen.getByText('✉ 录 用 通 知 书')
    const letter = title.parentElement

    expect(letter?.className).toContain('p-4')
    expect(letter?.className).toContain('sm:p-8')
  })
})
