import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ModelSearchInput } from '@/components/game/ModelSearchInput'

const { fetchProviderModels } = vi.hoisted(() => ({
  fetchProviderModels: vi.fn(),
}))

vi.mock('@/lib/aiModelList', () => ({
  fetchProviderModels,
}))

describe('ModelSearchInput', () => {
  beforeEach(() => {
    fetchProviderModels.mockReset()
  })

  it('allows manual typing when the provider list is unavailable', async () => {
    fetchProviderModels.mockRejectedValueOnce(new Error('no list'))
    const onChange = vi.fn()
    const user = userEvent.setup()

    render(
      <ModelSearchInput
        label="默认模型"
        provider="openai"
        apiKey="sk-key"
        baseUrl=""
        value=""
        onChange={onChange}
      />,
    )

    await user.click(screen.getByLabelText('默认模型'))
    await user.type(screen.getByLabelText('默认模型'), 'gpt-4.1')

    await waitFor(() =>
      expect(screen.getByText('未获取到模型列表，可手动输入')).toBeDefined(),
    )
    expect(onChange).toHaveBeenLastCalledWith('openai:gpt-4.1')
  })

  it('shows matching options after a successful fetch', async () => {
    fetchProviderModels.mockResolvedValueOnce([
      { id: 'gpt-4o-mini', value: 'openai:gpt-4o-mini' },
      { id: 'gpt-4.1', value: 'openai:gpt-4.1' },
    ])
    const onChange = vi.fn()
    const user = userEvent.setup()

    render(
      <ModelSearchInput
        label="默认模型"
        provider="openai"
        apiKey="sk-key"
        baseUrl=""
        value=""
        onChange={onChange}
      />,
    )

    await user.click(screen.getByLabelText('默认模型'))
    await waitFor(() => expect(screen.getByText('gpt-4.1')).toBeDefined())
    await user.type(screen.getByLabelText('默认模型'), '4.1')
    await user.click(screen.getByText('gpt-4.1'))

    expect(onChange).toHaveBeenLastCalledWith('openai:gpt-4.1')
  })
})
