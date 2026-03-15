export interface NarrativeSegment {
  type: 'text' | 'dialogue'
  content: string
  speaker?: string
}

const DIALOGUE_REGEX = /^【NPC:(.+?)】[""「](.+?)[""」]$/

export function parseNarrative(raw: string): NarrativeSegment[] {
  const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  const segments: NarrativeSegment[] = []

  for (const line of lines) {
    const match = line.match(DIALOGUE_REGEX)
    if (match) {
      segments.push({
        type: 'dialogue',
        speaker: match[1],
        content: match[2],
      })
    } else {
      segments.push({
        type: 'text',
        content: line,
      })
    }
  }

  return segments
}
