import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SettingsModal } from '@/components/game/SettingsModal'
import { useSettingsStore } from '@/store/settingsStore'
import { DEFAULT_SETTINGS } from '@/types/settings'

const storage: Record<string, string> = {}
vi.stubGlobal('localStorage', {
  getItem: (key: string) => storage[key] ?? null,
  setItem: (key: string, value: string) => {
    storage[key] = value
  },
  removeItem: (key: string) => {
    delete storage[key]
  },
})

describe('SettingsModal', () => {
  beforeEach(() => {
    Object.keys(storage).forEach(key => delete storage[key])
    useSettingsStore.setState({ settings: structuredClone(DEFAULT_SETTINGS) })
  })

  it('does not render when closed', () => {
    const { container } = render(<SettingsModal open={false} onClose={vi.fn()} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders three tabs', () => {
    render(<SettingsModal open={true} onClose={vi.fn()} />)
    expect(screen.getByText('AI 模型')).toBeDefined()
    expect(screen.getByText('显示')).toBeDefined()
    expect(screen.getByText('游戏')).toBeDefined()
  })

  it('AI tab shows provider select and API key input', () => {
    render(<SettingsModal open={true} onClose={vi.fn()} />)
    expect(screen.getByLabelText('AI 服务商')).toBeDefined()
    expect(screen.getByLabelText('API Key')).toBeDefined()
  })

  it('changing provider updates settings', async () => {
    const user = userEvent.setup()
    render(<SettingsModal open={true} onClose={vi.fn()} />)

    await user.selectOptions(screen.getByLabelText('AI 服务商'), 'anthropic')

    expect(useSettingsStore.getState().settings.ai.provider).toBe('anthropic')
  })

  it('display tab shows narrative speed slider and font size', async () => {
    const user = userEvent.setup()
    render(<SettingsModal open={true} onClose={vi.fn()} />)

    await user.click(screen.getByText('显示'))

    expect(screen.getByLabelText('叙事速度')).toBeDefined()
    expect(screen.getByLabelText('字体大小')).toBeDefined()
  })

  it('gameplay tab shows auto-save toggle', async () => {
    const user = userEvent.setup()
    render(<SettingsModal open={true} onClose={vi.fn()} />)

    await user.click(screen.getByText('游戏'))

    expect(screen.getByLabelText('自动存档')).toBeDefined()
  })

  it('toggling auto-save updates settings', async () => {
    const user = userEvent.setup()
    render(<SettingsModal open={true} onClose={vi.fn()} />)

    await user.click(screen.getByText('游戏'))
    await user.click(screen.getByLabelText('自动存档'))

    expect(useSettingsStore.getState().settings.gameplay.autoSave).toBe(false)
  })
})
