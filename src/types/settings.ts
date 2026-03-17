export interface AIConfig {
  provider: 'openai' | 'anthropic' | 'deepseek'
  apiKey: string
  modelOverrides?: Record<string, string>
}

export interface Settings {
  ai: {
    provider: 'openai' | 'anthropic' | 'deepseek'
    apiKey: string
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
