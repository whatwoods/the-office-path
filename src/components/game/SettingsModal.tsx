'use client'

import { useState } from 'react'
import { PROVIDER_CATALOG } from '@/ai/providerCatalog'
import { ModelSearchInput } from '@/components/game/ModelSearchInput'
import { Modal } from '@/components/ui/Modal'
import { useAITelemetryStore } from '@/store/aiTelemetryStore'
import { useSettingsStore } from '@/store/settingsStore'
import type { AIProvider } from '@/types/settings'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

type SettingsTab = 'ai' | 'display' | 'gameplay'

const TAB_LABELS: Record<SettingsTab, string> = {
  ai: 'AI 模型',
  display: '显示',
  gameplay: '游戏',
}

const AGENT_ORDER = ['world', 'event', 'npc', 'narrative'] as const

function formatTokens(value: number) {
  return value.toLocaleString('en-US')
}

function AITelemetryPanel() {
  const session = useAITelemetryStore(s => s.session)
  const lastRequest = useAITelemetryStore(s => s.lastRequest)

  return (
    <div className="space-y-2">
      <div className="text-sm text-[var(--pixel-text)]">Token 统计</div>
      {session.calls === 0 ? (
        <div className="pixel-border-light bg-[var(--pixel-bg-light)] p-3 text-xs text-[var(--pixel-text-dim)]">
          本局还没有 AI 调用。
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="pixel-border-light bg-[var(--pixel-bg-light)] p-3">
              <div className="text-[var(--pixel-text-dim)]">本局累计</div>
              <div className="mt-1 text-sm text-[var(--pixel-text)]">
                {formatTokens(session.totalTokens)} Tokens
              </div>
              <div className="mt-1 text-[10px] text-[var(--pixel-text-dim)]">
                {session.calls} 次调用 / 输入 {formatTokens(session.inputTokens)} / 输出{' '}
                {formatTokens(session.outputTokens)}
              </div>
            </div>
            <div className="pixel-border-light bg-[var(--pixel-bg-light)] p-3">
              <div className="text-[var(--pixel-text-dim)]">最近一次请求</div>
              <div className="mt-1 text-sm text-[var(--pixel-text)]">
                {formatTokens(lastRequest?.totalTokens ?? 0)} Tokens
              </div>
              <div className="mt-1 text-[10px] text-[var(--pixel-text-dim)]">
                {(lastRequest?.calls ?? 0)} 次调用 / 输入{' '}
                {formatTokens(lastRequest?.inputTokens ?? 0)} / 输出{' '}
                {formatTokens(lastRequest?.outputTokens ?? 0)}
              </div>
            </div>
          </div>

          <div className="pixel-border-light overflow-hidden bg-[var(--pixel-bg-light)]">
            <div className="grid grid-cols-[72px_52px_76px_1fr] gap-2 border-b border-[var(--pixel-border)] px-3 py-2 text-[10px] text-[var(--pixel-text-dim)]">
              <span>Agent</span>
              <span>调用</span>
              <span>Tokens</span>
              <span>模型</span>
            </div>
            {AGENT_ORDER.map(agent => (
              <div
                key={agent}
                className="grid grid-cols-[72px_52px_76px_1fr] gap-2 border-b border-[var(--pixel-border)] px-3 py-2 text-[10px] last:border-b-0"
              >
                <span className="text-[var(--pixel-text)]">{agent}</span>
                <span className="text-[var(--pixel-text-dim)]">
                  {session.byAgent[agent].calls}
                </span>
                <span className="text-[var(--pixel-text-dim)]">
                  {formatTokens(session.byAgent[agent].totalTokens)}
                </span>
                <span className="truncate text-[var(--pixel-text-dim)]">
                  {session.byAgent[agent].model || '-'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function AITab() {
  const ai = useSettingsStore(s => s.settings.ai)
  const updateAI = useSettingsStore(s => s.updateAI)
  const [showKey, setShowKey] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const providerBaseUrl = ai.provider === 'custom' ? (ai.baseUrl ?? '') : ''

  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="settings-provider"
          className="mb-1 block text-xs text-[var(--pixel-text-dim)]"
        >
          AI 服务商
        </label>
        <select
          id="settings-provider"
          aria-label="AI 服务商"
          className="pixel-border-light w-full bg-[var(--pixel-bg-light)] px-3 py-2 text-sm text-[var(--pixel-text)]"
          value={ai.provider}
          onChange={event => {
            const nextProvider = event.target.value as AIProvider
            updateAI({
              provider: nextProvider,
              baseUrl: nextProvider === 'custom' ? (ai.baseUrl ?? '') : '',
              defaultModel: '',
              modelOverrides: {},
            })
          }}
        >
          {(Object.entries(PROVIDER_CATALOG) as [AIProvider, (typeof PROVIDER_CATALOG)[AIProvider]][]).map(
            ([provider, metadata]) => (
              <option key={provider} value={provider}>
                {metadata.label}
              </option>
            ),
          )}
        </select>
      </div>

      <div>
        <label
          htmlFor="settings-api-key"
          className="mb-1 block text-xs text-[var(--pixel-text-dim)]"
        >
          API Key
        </label>
        <div className="flex gap-2">
          <input
            id="settings-api-key"
            aria-label="API Key"
            type={showKey ? 'text' : 'password'}
            className="pixel-border-light min-w-0 flex-1 bg-[var(--pixel-bg-light)] px-3 py-2 text-sm text-[var(--pixel-text)]"
            value={ai.apiKey}
            onChange={event => updateAI({ apiKey: event.target.value })}
            placeholder="sk-..."
          />
          <button
            type="button"
            className="pixel-btn px-2 py-1 text-xs"
            onClick={() => setShowKey(prev => !prev)}
          >
            {showKey ? '隐藏' : '查看'}
          </button>
        </div>
      </div>

      {ai.provider === 'custom' && (
        <div>
          <label
            htmlFor="settings-base-url"
            className="mb-1 block text-xs text-[var(--pixel-text-dim)]"
          >
            Base URL
          </label>
          <input
            id="settings-base-url"
            aria-label="Base URL"
            type="url"
            className="pixel-border-light w-full bg-[var(--pixel-bg-light)] px-3 py-2 text-sm text-[var(--pixel-text)]"
            value={ai.baseUrl ?? ''}
            onChange={event => updateAI({ baseUrl: event.target.value })}
            placeholder="https://example.com/v1"
          />
        </div>
      )}

      <ModelSearchInput
        label="默认模型"
        provider={ai.provider}
        apiKey={ai.apiKey}
        baseUrl={providerBaseUrl}
        value={ai.defaultModel ?? ''}
        onChange={value => updateAI({ defaultModel: value })}
      />

      <div className="space-y-2">
        <button
          type="button"
          className="pixel-btn px-3 py-1 text-xs"
          onClick={() => setAdvancedOpen(prev => !prev)}
        >
          高级设置
        </button>

        {advancedOpen &&
          (['world', 'event', 'npc', 'narrative'] as const).map(agent => (
            <ModelSearchInput
              key={agent}
              label={`${agent} 模型覆盖`}
              provider={ai.provider}
              apiKey={ai.apiKey}
              baseUrl={providerBaseUrl}
              value={ai.modelOverrides[agent] ?? ''}
              onChange={value =>
                updateAI({
                  modelOverrides: {
                    ...ai.modelOverrides,
                    [agent]: value || undefined,
                  },
                })
              }
            />
          ))}
      </div>

      <AITelemetryPanel />
    </div>
  )
}

function DisplayTab() {
  const display = useSettingsStore(s => s.settings.display)
  const updateDisplay = useSettingsStore(s => s.updateDisplay)

  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="settings-narrative-speed"
          className="mb-1 block text-xs text-[var(--pixel-text-dim)]"
        >
          叙事速度
        </label>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-[var(--pixel-text-dim)]">快</span>
          <input
            id="settings-narrative-speed"
            aria-label="叙事速度"
            type="range"
            min={10}
            max={100}
            step={5}
            value={display.narrativeSpeed}
            onChange={event =>
              updateDisplay({ narrativeSpeed: Number(event.target.value) })
            }
            className="flex-1"
          />
          <span className="text-[10px] text-[var(--pixel-text-dim)]">慢</span>
          <span className="w-12 text-right text-xs text-[var(--pixel-text)]">
            {display.narrativeSpeed}ms
          </span>
        </div>
      </div>

      <div>
        <label
          htmlFor="settings-font-size"
          className="mb-1 block text-xs text-[var(--pixel-text-dim)]"
        >
          字体大小
        </label>
        <select
          id="settings-font-size"
          aria-label="字体大小"
          className="pixel-border-light w-full bg-[var(--pixel-bg-light)] px-3 py-2 text-sm text-[var(--pixel-text)]"
          value={display.fontSize}
          onChange={event =>
            updateDisplay({
              fontSize: event.target.value as 'small' | 'medium' | 'large',
            })
          }
        >
          <option value="small">小</option>
          <option value="medium">中</option>
          <option value="large">大</option>
        </select>
      </div>
    </div>
  )
}

function GameplayTab() {
  const gameplay = useSettingsStore(s => s.settings.gameplay)
  const updateGameplay = useSettingsStore(s => s.updateGameplay)

  return (
    <div className="space-y-4">
      <div className="pixel-border-light flex items-center justify-between bg-[var(--pixel-bg-light)] p-3">
        <label
          htmlFor="settings-auto-save"
          className="text-sm text-[var(--pixel-text)]"
        >
          自动存档
        </label>
        <input
          id="settings-auto-save"
          aria-label="自动存档"
          type="checkbox"
          checked={gameplay.autoSave}
          onChange={event => updateGameplay({ autoSave: event.target.checked })}
          className="h-4 w-4 accent-[var(--pixel-accent)]"
        />
      </div>
    </div>
  )
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('ai')

  return (
    <Modal open={open} onClose={onClose} title="设置">
      <div className="mb-4 flex gap-2">
        {(Object.entries(TAB_LABELS) as [SettingsTab, string][]).map(([tab, label]) => (
          <button
            key={tab}
            type="button"
            className={`pixel-btn px-3 py-1 text-xs ${
              activeTab === tab
                ? 'bg-[var(--pixel-accent)] text-[var(--pixel-bg)]'
                : ''
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'ai' && <AITab />}
      {activeTab === 'display' && <DisplayTab />}
      {activeTab === 'gameplay' && <GameplayTab />}
    </Modal>
  )
}
