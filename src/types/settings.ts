export type AIProvider =
  | 'openai'
  | 'anthropic'
  | 'deepseek'
  | 'siliconflow'
  | 'modelscope'
  | 'bailian'
  | 'longcat'
  | 'gemini'
  | 'custom'

export interface AIConfig {
  provider: AIProvider
  apiKey: string
  baseUrl?: string
  defaultModel?: string
  modelOverrides?: Record<string, string>
}

export interface Settings {
  ai: {
    provider: AIProvider
    apiKey: string
    baseUrl: string
    defaultModel: string
    modelOverrides: {
      world?: string
      event?: string
      npc?: string
      narrative?: string
    }
  }
  display: {
    narrativeSpeed: number
    fontSize: 'small' | 'medium' | 'large'
  }
  gameplay: {
    autoSave: boolean
  }
}

export const DEFAULT_SETTINGS: Settings = {
  ai: {
    provider: 'openai',
    apiKey: '',
    baseUrl: '',
    defaultModel: '',
    modelOverrides: {},
  },
  display: {
    narrativeSpeed: 40,
    fontSize: 'medium',
  },
  gameplay: {
    autoSave: true,
  },
}
