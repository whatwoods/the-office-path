'use client'

import { useEffect, useId, useState } from 'react'
import { fetchProviderModels, type ModelOption } from '@/lib/aiModelList'
import type { AIProvider } from '@/types/settings'

interface ModelSearchInputProps {
  label: string
  provider: AIProvider
  apiKey: string
  baseUrl: string
  value: string
  onChange: (value: string) => void
}

function toInputValue(provider: AIProvider, value: string): string {
  const prefix = `${provider}:`

  if (!value) {
    return ''
  }

  if (value.startsWith(prefix)) {
    return value.slice(prefix.length)
  }

  return value
}

export function ModelSearchInput({
  label,
  provider,
  apiKey,
  baseUrl,
  value,
  onChange,
}: ModelSearchInputProps) {
  const inputId = useId()
  const listboxId = useId()
  const [inputValue, setInputValue] = useState(() => toInputValue(provider, value))
  const [options, setOptions] = useState<ModelOption[]>([])
  const [status, setStatus] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [loadedKey, setLoadedKey] = useState('')

  useEffect(() => {
    setInputValue(toInputValue(provider, value))
  }, [provider, value])

  useEffect(() => {
    setOptions([])
    setStatus('')
    setLoadedKey('')
  }, [provider, apiKey, baseUrl])

  const filteredOptions = options.filter(option =>
    option.id.toLowerCase().includes(inputValue.trim().toLowerCase()),
  )

  async function loadOptions() {
    const nextLoadedKey = `${provider}|${apiKey}|${baseUrl}`
    if (loadedKey === nextLoadedKey) {
      return
    }

    try {
      const nextOptions = await fetchProviderModels({
        provider,
        apiKey,
        baseUrl,
      })
      setOptions(nextOptions)
      setStatus('')
      setLoadedKey(nextLoadedKey)
    } catch {
      setOptions([])
      setStatus('未获取到模型列表，可手动输入')
      setLoadedKey(nextLoadedKey)
    }
  }

  return (
    <div className="space-y-1">
      <label
        htmlFor={inputId}
        className="mb-1 block text-xs text-[var(--pixel-text-dim)]"
      >
        {label}
      </label>
      <input
        id={inputId}
        aria-label={label}
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-expanded={isOpen && filteredOptions.length > 0}
        className="pixel-border-light w-full bg-[var(--pixel-bg-light)] px-3 py-2 text-sm text-[var(--pixel-text)]"
        type="search"
        value={inputValue}
        placeholder="model-id"
        onFocus={() => {
          setIsOpen(true)
          void loadOptions()
        }}
        onBlur={() => {
          setTimeout(() => setIsOpen(false), 100)
        }}
        onChange={event => {
          const nextValue = event.target.value
          setInputValue(nextValue)
          setIsOpen(true)

          if (!nextValue) {
            onChange('')
            return
          }

          onChange(`${provider}:${nextValue}`)
        }}
      />
      {status && <p className="text-xs text-[var(--pixel-text-dim)]">{status}</p>}
      {isOpen && filteredOptions.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          className="pixel-border-light max-h-48 space-y-1 overflow-auto bg-[var(--pixel-bg-light)] p-2"
        >
          {filteredOptions.map(option => (
            <li key={option.value}>
              <button
                type="button"
                className="w-full text-left text-sm text-[var(--pixel-text)] hover:text-[var(--pixel-accent)]"
                onMouseDown={event => {
                  event.preventDefault()
                }}
                onClick={() => {
                  setInputValue(option.id)
                  setIsOpen(false)
                  onChange(option.value)
                }}
              >
                {option.id}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
