import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchProviderModels } from '@/lib/aiModelList'

describe('fetchProviderModels', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches and normalizes OpenAI-compatible models', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          data: [{ id: 'deepseek-chat' }, { id: 'deepseek-reasoner' }],
        }),
      })),
    )

    await expect(
      fetchProviderModels({
        provider: 'deepseek',
        apiKey: 'dk-key',
        baseUrl: '',
      }),
    ).resolves.toEqual([
      { id: 'deepseek-chat', value: 'deepseek:deepseek-chat' },
      { id: 'deepseek-reasoner', value: 'deepseek:deepseek-reasoner' },
    ])
  })

  it('maps Gemini models to provider-prefixed values', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          models: [{ name: 'models/gemini-2.5-flash' }],
        }),
      })),
    )

    await expect(
      fetchProviderModels({
        provider: 'gemini',
        apiKey: 'gm-key',
        baseUrl: '',
      }),
    ).resolves.toEqual([
      { id: 'gemini-2.5-flash', value: 'gemini:gemini-2.5-flash' },
    ])
  })

  it('returns an empty list for manual providers', async () => {
    await expect(
      fetchProviderModels({
        provider: 'anthropic',
        apiKey: 'sk-key',
        baseUrl: '',
      }),
    ).resolves.toEqual([])
  })
})
