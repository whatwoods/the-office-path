import { describe, expect, it } from 'vitest'
import { parseNarrative, type NarrativeSegment } from '@/lib/narrative'

describe('parseNarrative', () => {
  it('parses plain text into a single segment', () => {
    const result = parseNarrative('这个季度你埋头苦干。')
    expect(result).toEqual([
      { type: 'text', content: '这个季度你埋头苦干。' },
    ])
  })

  it('parses NPC dialogue markers', () => {
    const input = '你走进办公室。\n【NPC:王建国】"早啊，新来的！"\n你紧张地点了点头。'
    const result = parseNarrative(input)
    expect(result).toEqual([
      { type: 'text', content: '你走进办公室。' },
      { type: 'dialogue', speaker: '王建国', content: '早啊，新来的！' },
      { type: 'text', content: '你紧张地点了点头。' },
    ])
  })

  it('handles multiple consecutive dialogues', () => {
    const input = '【NPC:王建国】"开会了"\n【NPC:张伟】"来了来了"'
    const result = parseNarrative(input)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ type: 'dialogue', speaker: '王建国', content: '开会了' })
    expect(result[1]).toEqual({ type: 'dialogue', speaker: '张伟', content: '来了来了' })
  })

  it('handles text with no dialogues', () => {
    const input = '第一段。\n\n第二段。'
    const result = parseNarrative(input)
    expect(result).toEqual([
      { type: 'text', content: '第一段。' },
      { type: 'text', content: '第二段。' },
    ])
  })

  it('trims empty segments', () => {
    const input = '\n\n你走进去了。\n\n'
    const result = parseNarrative(input)
    expect(result).toEqual([
      { type: 'text', content: '你走进去了。' },
    ])
  })
})
