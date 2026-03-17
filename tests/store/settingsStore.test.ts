import { beforeEach, describe, expect, it, vi } from 'vitest'
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

import { useSettingsStore } from '@/store/settingsStore'

describe('useSettingsStore', () => {
  beforeEach(() => {
    Object.keys(storage).forEach(key => delete storage[key])
    useSettingsStore.setState({ settings: structuredClone(DEFAULT_SETTINGS) })
  })

  it('has default settings on init', () => {
    const { settings } = useSettingsStore.getState()
    expect(settings).toEqual(DEFAULT_SETTINGS)
  })

  it('updateAI updates ai settings and persists', () => {
    useSettingsStore
      .getState()
      .updateAI({ provider: 'anthropic', apiKey: 'sk-test' })

    const { settings } = useSettingsStore.getState()
    expect(settings.ai.provider).toBe('anthropic')
    expect(settings.ai.apiKey).toBe('sk-test')

    const stored = JSON.parse(storage.office_path_settings)
    expect(stored.ai.provider).toBe('anthropic')
  })

  it('updateDisplay updates display settings and persists', () => {
    useSettingsStore
      .getState()
      .updateDisplay({ narrativeSpeed: 80, fontSize: 'large' })

    const { settings } = useSettingsStore.getState()
    expect(settings.display.narrativeSpeed).toBe(80)
    expect(settings.display.fontSize).toBe('large')
  })

  it('updateGameplay updates gameplay settings and persists', () => {
    useSettingsStore.getState().updateGameplay({ autoSave: false })

    const { settings } = useSettingsStore.getState()
    expect(settings.gameplay.autoSave).toBe(false)
  })

  it('loadSettings reads from localStorage and deep-merges with defaults', () => {
    storage.office_path_settings = JSON.stringify({
      ai: { provider: 'deepseek', apiKey: 'dk-123', modelOverrides: {} },
      display: { narrativeSpeed: 60, fontSize: 'small' },
    })

    useSettingsStore.getState().loadSettings()

    const { settings } = useSettingsStore.getState()
    expect(settings.ai.provider).toBe('deepseek')
    expect(settings.gameplay.autoSave).toBe(true)
  })

  it('loadSettings falls back to defaults on corrupt JSON', () => {
    storage.office_path_settings = '{broken'

    useSettingsStore.getState().loadSettings()

    expect(useSettingsStore.getState().settings).toEqual(DEFAULT_SETTINGS)
  })

  it('getAIConfig returns null when apiKey is empty', () => {
    const config = useSettingsStore.getState().getAIConfig()
    expect(config).toBeNull()
  })

  it('getAIConfig returns AIConfig when apiKey is set', () => {
    useSettingsStore
      .getState()
      .updateAI({ provider: 'anthropic', apiKey: 'sk-test' })

    const config = useSettingsStore.getState().getAIConfig()
    expect(config).toEqual({
      provider: 'anthropic',
      apiKey: 'sk-test',
      modelOverrides: {},
    })
  })
})
