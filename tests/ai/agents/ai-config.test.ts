import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('ai', () => ({
  generateText: vi.fn(),
  Output: { object: vi.fn(({ schema }: { schema: unknown }) => schema) },
}))

vi.mock('@/ai/provider', () => ({
  AGENT_MODELS: {
    world: 'openai:gpt-4o-mini',
    event: 'openai:gpt-4o-mini',
    npc: 'openai:gpt-4o',
    narrative: 'openai:gpt-4o',
  },
  getModel: vi.fn(() => ({ modelId: 'resolved-model' })),
  resolveAgentModel: vi.fn(() => 'anthropic:claude-sonnet-4-20250514'),
}))

import { generateText } from 'ai'
import { runEventAgent } from '@/ai/agents/event'
import { runNarrativeAgent } from '@/ai/agents/narrative'
import { runNPCAgent } from '@/ai/agents/npc'
import { runWorldAgent } from '@/ai/agents/world'
import { getModel, resolveAgentModel } from '@/ai/provider'
import { createNewGame } from '@/engine/state'
import type {
  AgentInput,
  EventAgentOutput,
  NPCAgentOutput,
  WorldAgentOutput,
} from '@/types/agents'
import type { ActionAllocation } from '@/types/actions'
import type { AIConfig } from '@/types/settings'

const mockedGenerateText = vi.mocked(generateText)
const mockedGetModel = vi.mocked(getModel)
const mockedResolveAgentModel = vi.mocked(resolveAgentModel)

function makeInput(): AgentInput {
  return { state: createNewGame(), recentHistory: [] }
}

const aiConfig: AIConfig = {
  provider: 'custom',
  apiKey: 'custom-key',
  baseUrl: 'https://example.com/v1',
  defaultModel: 'custom:qwen-plus',
  modelOverrides: {},
}

const worldContext: WorldAgentOutput = {
  economy: 'stable',
  trends: ['AI行业持续发展'],
  companyStatus: 'expanding',
  newsItems: ['某大厂裁员'],
}

const eventContext: EventAgentOutput = {
  events: [],
  phoneMessages: [],
}

const npcContext: NPCAgentOutput = {
  npcActions: [],
  chatMessages: [],
}

const actions: ActionAllocation[] = [{ action: 'work_hard' }]

describe('agent aiConfig support', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedGenerateText.mockResolvedValue({ output: {} } as never)
    mockedGetModel.mockReturnValue({ modelId: 'resolved-model' } as never)
    mockedResolveAgentModel.mockReturnValue('custom:qwen-plus')
  })

  it('runWorldAgent resolves and loads the model from aiConfig', async () => {
    mockedGenerateText.mockResolvedValueOnce({
      output: {
        economy: 'stable',
        trends: [],
        companyStatus: 'stable',
        newsItems: [],
      },
    } as never)

    await runWorldAgent(makeInput(), aiConfig)

    expect(mockedResolveAgentModel).toHaveBeenCalledWith('world', aiConfig)
    expect(mockedGetModel).toHaveBeenCalledWith(
      'custom:qwen-plus',
      'custom-key',
      'https://example.com/v1',
    )
  })

  it('runEventAgent resolves and loads the model from aiConfig', async () => {
    mockedGenerateText.mockResolvedValueOnce({
      output: { events: [], phoneMessages: [] },
    } as never)

    await runEventAgent(makeInput(), worldContext, aiConfig)

    expect(mockedResolveAgentModel).toHaveBeenCalledWith('event', aiConfig)
    expect(mockedGetModel).toHaveBeenCalledWith(
      'custom:qwen-plus',
      'custom-key',
      'https://example.com/v1',
    )
  })

  it('runNPCAgent resolves and loads the model from aiConfig', async () => {
    mockedGenerateText.mockResolvedValueOnce({
      output: { npcActions: [], chatMessages: [] },
    } as never)

    await runNPCAgent(
      makeInput(),
      worldContext,
      eventContext,
      actions,
      '玩家选择了认真听培训',
      aiConfig,
    )

    expect(mockedResolveAgentModel).toHaveBeenCalledWith('npc', aiConfig)
    expect(mockedGetModel).toHaveBeenCalledWith(
      'custom:qwen-plus',
      'custom-key',
      'https://example.com/v1',
    )
  })

  it('runNarrativeAgent resolves and loads the model from aiConfig', async () => {
    mockedGenerateText.mockResolvedValueOnce({
      output: { narrative: 'test narrative' },
    } as never)

    await runNarrativeAgent(
      makeInput(),
      worldContext,
      eventContext,
      npcContext,
      actions,
      false,
      '玩家选择了认真听培训',
      false,
      aiConfig,
    )

    expect(mockedResolveAgentModel).toHaveBeenCalledWith('narrative', aiConfig)
    expect(mockedGetModel).toHaveBeenCalledWith(
      'custom:qwen-plus',
      'custom-key',
      'https://example.com/v1',
    )
  })
})
