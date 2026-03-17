import { PROVIDER_CATALOG } from '@/ai/providerCatalog'
import type { AIProvider } from '@/types/settings'

export interface ModelOption {
  id: string
  value: `${AIProvider}:${string}`
}

interface FetchProviderModelsInput {
  provider: AIProvider
  apiKey: string
  baseUrl: string
}

export async function fetchProviderModels(
  input: FetchProviderModelsInput,
): Promise<ModelOption[]> {
  const catalog = PROVIDER_CATALOG[input.provider]

  if (!input.apiKey || catalog.kind === 'anthropic') {
    return []
  }

  if (catalog.kind === 'gemini') {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(input.apiKey)}`,
    )

    if (!response.ok) {
      throw new Error('Failed to fetch Gemini models')
    }

    const data = (await response.json()) as {
      models?: Array<{ name: string }>
    }

    return (data.models ?? []).map(model => {
      const id = model.name.replace(/^models\//, '')
      return {
        id,
        value: `gemini:${id}` as const,
      }
    })
  }

  const baseUrl =
    input.provider === 'custom'
      ? input.baseUrl
      : (catalog.defaultBaseUrl ?? '')

  if (!baseUrl) {
    return []
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/models`, {
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch provider models')
  }

  const data = (await response.json()) as {
    data?: Array<{ id: string }>
  }

  return (data.data ?? []).map(model => ({
    id: model.id,
    value: `${input.provider}:${model.id}` as `${AIProvider}:${string}`,
  }))
}
