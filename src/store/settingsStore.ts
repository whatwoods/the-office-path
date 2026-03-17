import { create } from 'zustand'
import { DEFAULT_SETTINGS } from '@/types/settings'
import type { AIConfig, Settings } from '@/types/settings'

const STORAGE_KEY = 'office_path_settings'

function deepMerge(defaults: Settings, partial: Partial<Settings>): Settings {
  return {
    ai: {
      ...defaults.ai,
      ...partial.ai,
      modelOverrides: {
        ...defaults.ai.modelOverrides,
        ...partial.ai?.modelOverrides,
      },
    },
    display: {
      ...defaults.display,
      ...partial.display,
    },
    gameplay: {
      ...defaults.gameplay,
      ...partial.gameplay,
    },
  }
}

function persist(settings: Settings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

interface SettingsStore {
  settings: Settings
  loadSettings: () => void
  updateAI: (patch: Partial<Settings['ai']>) => void
  updateDisplay: (patch: Partial<Settings['display']>) => void
  updateGameplay: (patch: Partial<Settings['gameplay']>) => void
  getAIConfig: () => AIConfig | null
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: structuredClone(DEFAULT_SETTINGS),

  loadSettings: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) {
        return
      }

      const parsed = JSON.parse(raw) as Partial<Settings>
      set({ settings: deepMerge(DEFAULT_SETTINGS, parsed) })
    } catch {
      set({ settings: structuredClone(DEFAULT_SETTINGS) })
    }
  },

  updateAI: patch => {
    const currentAI = get().settings.ai
    const settings = {
      ...get().settings,
      ai: {
        ...currentAI,
        ...patch,
        modelOverrides:
          patch.modelOverrides === undefined
            ? currentAI.modelOverrides
            : patch.modelOverrides,
      },
    }
    set({ settings })
    persist(settings)
  },

  updateDisplay: patch => {
    const settings = {
      ...get().settings,
      display: {
        ...get().settings.display,
        ...patch,
      },
    }
    set({ settings })
    persist(settings)
  },

  updateGameplay: patch => {
    const settings = {
      ...get().settings,
      gameplay: {
        ...get().settings.gameplay,
        ...patch,
      },
    }
    set({ settings })
    persist(settings)
  },

  getAIConfig: () => {
    const { ai } = get().settings
    if (!ai.apiKey) {
      return null
    }

    return {
      provider: ai.provider,
      apiKey: ai.apiKey,
      baseUrl: ai.baseUrl,
      defaultModel: ai.defaultModel,
      modelOverrides: ai.modelOverrides,
    }
  },
}))
