import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useAITelemetryStore } from '@/store/aiTelemetryStore'
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
    useAITelemetryStore.getState().reset()
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

  it('changing provider clears provider-specific model settings', async () => {
    const user = userEvent.setup()
    useSettingsStore.getState().updateAI({
      provider: 'custom',
      apiKey: 'custom-key',
      baseUrl: 'https://example.com/v1',
      defaultModel: 'custom:qwen-plus',
      modelOverrides: { world: 'custom:qwen-max' },
    })

    render(<SettingsModal open={true} onClose={vi.fn()} />)

    await user.selectOptions(screen.getByLabelText('AI 服务商'), 'openai')

    expect(useSettingsStore.getState().settings.ai.provider).toBe('openai')
    expect(useSettingsStore.getState().settings.ai.baseUrl).toBe('')
    expect(useSettingsStore.getState().settings.ai.defaultModel).toBe('')
    expect(useSettingsStore.getState().settings.ai.modelOverrides).toEqual({})
  })

  it('shows all supported AI providers', () => {
    render(<SettingsModal open={true} onClose={vi.fn()} />)

    const provider = screen.getByLabelText('AI 服务商')
    expect(screen.getByRole('option', { name: 'OpenAI' })).toBeDefined()
    expect(screen.getByRole('option', { name: 'Anthropic' })).toBeDefined()
    expect(screen.getByRole('option', { name: 'DeepSeek' })).toBeDefined()
    expect(screen.getByRole('option', { name: '硅基流动' })).toBeDefined()
    expect(screen.getByRole('option', { name: '魔搭' })).toBeDefined()
    expect(screen.getByRole('option', { name: '阿里云百炼' })).toBeDefined()
    expect(screen.getByRole('option', { name: '龙猫' })).toBeDefined()
    expect(screen.getByRole('option', { name: 'Gemini' })).toBeDefined()
    expect(screen.getByRole('option', { name: '自定义' })).toBeDefined()
    expect(provider).toBeDefined()
  })

  it('shows Base URL when the custom provider is selected', async () => {
    const user = userEvent.setup()
    render(<SettingsModal open={true} onClose={vi.fn()} />)

    await user.selectOptions(screen.getByLabelText('AI 服务商'), 'custom')

    expect(screen.getByLabelText('Base URL')).toBeDefined()
  })

  it('shows default model and advanced override controls', async () => {
    const user = userEvent.setup()
    render(<SettingsModal open={true} onClose={vi.fn()} />)

    expect(screen.getByLabelText('默认模型')).toBeDefined()
    expect(screen.queryByLabelText('world 模型覆盖')).toBeNull()

    await user.click(screen.getByText('高级设置'))

    expect(screen.getByLabelText('world 模型覆盖')).toBeDefined()
    expect(screen.getByLabelText('narrative 模型覆盖')).toBeDefined()
  })

  it('shows AI token telemetry in the AI tab', () => {
    useAITelemetryStore.getState().recordRequest({
      calls: 4,
      inputTokens: 400,
      outputTokens: 180,
      totalTokens: 580,
      byAgent: {
        world: { calls: 1, inputTokens: 60, outputTokens: 20, totalTokens: 80, model: 'openai:gpt-4o-mini' },
        event: { calls: 1, inputTokens: 80, outputTokens: 40, totalTokens: 120, model: 'openai:gpt-4o-mini' },
        npc: { calls: 1, inputTokens: 120, outputTokens: 40, totalTokens: 160, model: 'openai:gpt-4o' },
        narrative: { calls: 1, inputTokens: 140, outputTokens: 80, totalTokens: 220, model: 'openai:gpt-4o' },
      },
    })

    render(<SettingsModal open={true} onClose={vi.fn()} />)

    expect(screen.getByText('Token 统计')).toBeDefined()
    expect(screen.getByText(/本局累计/)).toBeDefined()
    expect(screen.getAllByText(/580 Tokens/)).toHaveLength(2)
    expect(screen.getByText(/narrative/)).toBeDefined()
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
