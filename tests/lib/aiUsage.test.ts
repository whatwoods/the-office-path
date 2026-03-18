import { describe, expect, it } from 'vitest'
import {
  createEmptyAIUsageSummary,
  mergeAIUsageSummaries,
  recordAIUsage,
} from '@/lib/aiUsage'

describe('aiUsage helpers', () => {
  it('records usage into totals and agent buckets', () => {
    const summary = createEmptyAIUsageSummary()

    recordAIUsage(summary, {
      agent: 'event',
      model: 'openai:gpt-4o-mini',
      inputTokens: 120,
      outputTokens: 30,
      totalTokens: 150,
    })

    expect(summary.calls).toBe(1)
    expect(summary.totalTokens).toBe(150)
    expect(summary.byAgent.event.calls).toBe(1)
    expect(summary.byAgent.event.totalTokens).toBe(150)
    expect(summary.byAgent.event.model).toBe('openai:gpt-4o-mini')
  })

  it('merges multiple summaries together', () => {
    const first = createEmptyAIUsageSummary()
    const second = createEmptyAIUsageSummary()

    recordAIUsage(first, {
      agent: 'world',
      model: 'openai:gpt-4o-mini',
      inputTokens: 50,
      outputTokens: 10,
      totalTokens: 60,
    })
    recordAIUsage(second, {
      agent: 'narrative',
      model: 'openai:gpt-4o',
      inputTokens: 200,
      outputTokens: 120,
      totalTokens: 320,
    })

    const merged = mergeAIUsageSummaries(first, second)

    expect(merged.calls).toBe(2)
    expect(merged.totalTokens).toBe(380)
    expect(merged.byAgent.world.totalTokens).toBe(60)
    expect(merged.byAgent.narrative.totalTokens).toBe(320)
  })
})
