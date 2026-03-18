import { describe, expect, it, beforeEach, vi, type Mock } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuarterlyActions } from '@/components/game/QuarterlyActions'

type PlannerAllocation = {
  action: string
  target?: string
}

describe('QuarterlyActions', () => {
  let allocations: PlannerAllocation[]
  let onAllocate: Mock<(allocation: PlannerAllocation) => void>
  let onDeallocate: Mock<(index: number) => void>

  beforeEach(() => {
    allocations = []
    onAllocate = vi.fn<(allocation: PlannerAllocation) => void>()
    onDeallocate = vi.fn<(index: number) => void>()
  })

  it('renders Phase 1 action cards', () => {
    render(
      <QuarterlyActions
        phase={1}
        phase2Path={null}
        level="L3"
        allocations={allocations}
        staminaUsed={0}
        staminaMax={10}
        npcs={[]}
        onAllocate={onAllocate}
        onDeallocate={onDeallocate}
      />,
    )
    expect(screen.getByText('埋头工作')).toBeDefined()
    expect(screen.getByText('学习充电')).toBeDefined()
    expect(screen.getByText('摸鱼休息')).toBeDefined()
  })

  it('uses a horizontally scrollable action strip on mobile', () => {
    render(
      <QuarterlyActions
        phase={1}
        phase2Path={null}
        level="L6_tech"
        allocations={allocations}
        staminaUsed={0}
        staminaMax={10}
        npcs={[]}
        onAllocate={onAllocate}
        onDeallocate={onDeallocate}
      />,
    )

    const actionStrip = screen.getByText('埋头工作').closest('button')?.parentElement
    const workCard = screen.getByText('埋头工作').closest('button')
    const resignCard = screen.getByText('辞职创业').closest('button')

    expect(actionStrip?.className).toContain('overflow-x-auto')
    expect(actionStrip?.className).toContain('min-[1024px]:flex-wrap')
    expect(workCard?.className).toContain('shrink-0')
    expect(resignCard?.className).toContain('shrink-0')
  })

  it('shows resign button only at L6+', () => {
    const { rerender } = render(
      <QuarterlyActions
        phase={1}
        phase2Path={null}
        level="L3"
        allocations={allocations}
        staminaUsed={0}
        staminaMax={10}
        npcs={[]}
        onAllocate={onAllocate}
        onDeallocate={onDeallocate}
      />,
    )
    expect(screen.queryByText('辞职创业')).toBeNull()

    rerender(
      <QuarterlyActions
        phase={1}
        phase2Path={null}
        level="L6_tech"
        allocations={allocations}
        staminaUsed={0}
        staminaMax={10}
        npcs={[]}
        onAllocate={onAllocate}
        onDeallocate={onDeallocate}
      />,
    )
    expect(screen.getByText('辞职创业')).toBeDefined()
  })

  it('calls onAllocate when card is clicked', async () => {
    const user = userEvent.setup()
    render(
      <QuarterlyActions
        phase={1}
        phase2Path={null}
        level="L3"
        allocations={allocations}
        staminaUsed={0}
        staminaMax={10}
        npcs={[]}
        onAllocate={onAllocate}
        onDeallocate={onDeallocate}
      />,
    )

    await user.click(screen.getByText('埋头工作'))
    expect(onAllocate).toHaveBeenCalledWith({ action: 'work_hard' })
  })

  it('uses NPC id when selecting a socialize target', async () => {
    const user = userEvent.setup()
    render(
      <QuarterlyActions
        phase={1}
        phase2Path={null}
        level="L3"
        allocations={allocations}
        staminaUsed={0}
        staminaMax={10}
        npcs={[
          {
            id: 'zhang_wei',
            name: '张伟',
            role: '同组同事',
            personality: '热心但爱八卦',
            hiddenGoal: '想晋升',
            favor: 50,
            isActive: true,
            currentStatus: '在岗',
            companyName: '星辰互联',
          },
        ]}
        onAllocate={onAllocate}
        onDeallocate={onDeallocate}
      />,
    )

    await user.click(screen.getByText('社交应酬'))
    await user.click(screen.getByText('张伟'))

    expect(onAllocate).toHaveBeenCalledWith({
      action: 'socialize',
      target: 'zhang_wei',
    })
  })

  it('disables cards when stamina is full', () => {
    render(
      <QuarterlyActions
        phase={1}
        phase2Path={null}
        level="L3"
        allocations={allocations}
        staminaUsed={10}
        staminaMax={10}
        npcs={[]}
        onAllocate={onAllocate}
        onDeallocate={onDeallocate}
      />,
    )
    const btn = screen.getByText('埋头工作').closest('button')
    expect(btn?.disabled).toBe(true)
  })

  it('renders Phase 2 action cards', () => {
    render(
      <QuarterlyActions
        phase={2}
        phase2Path="startup"
        level="L6_tech"
        allocations={allocations}
        staminaUsed={0}
        staminaMax={10}
        npcs={[]}
        onAllocate={onAllocate}
        onDeallocate={onDeallocate}
      />,
    )
    expect(screen.getByText('打磨产品')).toBeDefined()
    expect(screen.getByText('团队管理')).toBeDefined()
  })

  it('renders executive action cards for the executive path', () => {
    render(
      <QuarterlyActions
        phase={2}
        phase2Path="executive"
        level="L8"
        allocations={allocations}
        staminaUsed={0}
        staminaMax={10}
        npcs={[]}
        onAllocate={onAllocate}
        onDeallocate={onDeallocate}
      />,
    )
    expect(screen.getByText('推进业务')).toBeDefined()
    expect(screen.getByText('经营董事会')).toBeDefined()
    expect(screen.queryByText('打磨产品')).toBeNull()
  })
})
