import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useGameStore } from '@/store/gameStore'
import { AttributesTab } from '@/components/game/AttributesTab'
import { createNewGame } from '@/engine/state'

describe('AttributesTab', () => {
  beforeEach(() => {
    useGameStore.setState({ state: createNewGame(), promotionInfo: null })
  })

  it('renders all 7 attribute bars', () => {
    render(<AttributesTab />)
    expect(screen.getByText('健康')).toBeDefined()
    expect(screen.getByText('专业')).toBeDefined()
    expect(screen.getByText('沟通')).toBeDefined()
    expect(screen.getByText('管理')).toBeDefined()
    expect(screen.getByText('人脉')).toBeDefined()
    expect(screen.getByText('心情')).toBeDefined()
    expect(screen.getByText('声望')).toBeDefined()
  })

  it('renders money as number not progress bar', () => {
    render(<AttributesTab />)
    expect(screen.getByText(/¥5,000/)).toBeDefined()
  })

  it('shows promotion badge when eligible', () => {
    useGameStore.setState({
      promotionInfo: {
        eligible: true,
        nextLevels: ['L2'],
        failReasons: [],
      },
    })
    render(<AttributesTab />)
    expect(screen.getByText('可晋升')).toBeDefined()
    expect(screen.getByText('L2')).toBeDefined()
  })

  it('shows company stats in phase 2', () => {
    const state = createNewGame()
    state.phase = 2
    state.company = {
      stage: 'garage',
      productQuality: 30,
      teamSatisfaction: 60,
      customerCount: 5,
      brandAwareness: 10,
      employeeCount: 2,
      quarterlyRevenue: 50000,
      quarterlyExpenses: 30000,
      cashFlow: 20000,
      valuation: 500000,
      officeType: 'home',
      founderEquity: 100,
      consecutiveNegativeCashFlow: 0,
      consecutiveProfitableQuarters: 0,
      hasSeriesAFunding: false,
      annualGrowthRate: 0,
    }
    useGameStore.setState({ state })
    render(<AttributesTab />)
    expect(screen.getByText(/公司/)).toBeDefined()
    expect(screen.getByText(/车库创业/)).toBeDefined()
  })
})
