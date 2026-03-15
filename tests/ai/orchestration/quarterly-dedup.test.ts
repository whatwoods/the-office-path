import { describe, expect, it } from 'vitest'
import { deduplicateMessages } from '@/ai/orchestration/quarterly'
import type { PhoneApp } from '@/types/game'

describe('deduplicateMessages', () => {
  it('removes duplicate messages by app+sender+content', () => {
    const messages: Array<{ app: PhoneApp; content: string; sender?: string }> = [
      { app: 'xiaoxin', content: '你好', sender: '张伟' },
      { app: 'xiaoxin', content: '你好', sender: '张伟' },
      { app: 'xiaoxin', content: '不同内容', sender: '张伟' },
      { app: 'maimai', content: '你好', sender: '张伟' },
    ]

    expect(deduplicateMessages(messages)).toHaveLength(3)
  })

  it('keeps messages with different senders', () => {
    const messages: Array<{ app: PhoneApp; content: string; sender?: string }> = [
      { app: 'xiaoxin', content: '你好', sender: '张伟' },
      { app: 'xiaoxin', content: '你好', sender: '李雪' },
    ]

    expect(deduplicateMessages(messages)).toHaveLength(2)
  })
})
