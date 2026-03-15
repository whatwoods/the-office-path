'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { PixelButton } from '@/components/ui/PixelButton'
import { useGameStore } from '@/store/gameStore'
import { listSaves, deleteSave, type SaveMeta, type SaveSlot, SAVE_SLOTS } from '@/save/storage'

interface SaveModalProps {
  open: boolean
  onClose: () => void
  mode: 'load' | 'full'
}

const SLOT_LABELS: Record<string, string> = {
  auto: '自动存档',
  slot1: '存档1',
  slot2: '存档2',
  slot3: '存档3',
}

export function SaveModal({ open, onClose, mode }: SaveModalProps) {
  const router = useRouter()
  const saveGame = useGameStore(s => s.saveGame)
  const loadGame = useGameStore(s => s.loadGame)
  const state = useGameStore(s => s.state)
  const [saves, setSaves] = useState<SaveMeta[]>([])

  useEffect(() => {
    if (open) {
      setSaves(listSaves())
    }
  }, [open])

  const getSaveMeta = (slot: string) => saves.find(s => s.slot === slot)

  const handleSave = (slot: string) => {
    const existing = getSaveMeta(slot)
    if (existing && !confirm('覆盖已有存档？')) return
    saveGame(slot)
    setSaves(listSaves())
  }

  const handleLoad = (slot: string) => {
    loadGame(slot)
    onClose()
    router.push('/game')
  }

  const handleDelete = (slot: string) => {
    if (!confirm('确定删除此存档？')) return
    deleteSave(slot as SaveSlot)
    setSaves(listSaves())
  }

  return (
    <Modal open={open} onClose={onClose} title="存档管理">
      <div className="space-y-3">
        {SAVE_SLOTS.map(slot => {
          const meta = getSaveMeta(slot)

          return (
            <div
              key={slot}
              className="pixel-border-light flex items-center justify-between bg-[var(--pixel-bg-light)] p-3"
            >
              <div>
                <p className="text-sm">{SLOT_LABELS[slot]}</p>
                {meta ? (
                  <p className="text-[10px] text-[var(--pixel-text-dim)]">
                    Q{meta.quarter} | {meta.level} | {new Date(meta.savedAt).toLocaleString('zh-CN')}
                  </p>
                ) : (
                  <p className="text-[10px] text-[var(--pixel-text-dim)]">空</p>
                )}
              </div>

              <div className="flex gap-2">
                {meta && (
                  <PixelButton onClick={() => handleLoad(slot)}>
                    读取
                  </PixelButton>
                )}
                {mode === 'full' && slot !== 'auto' && (
                  <>
                    <PixelButton onClick={() => handleSave(slot)}>
                      保存
                    </PixelButton>
                    {meta && (
                      <PixelButton
                        variant="danger"
                        onClick={() => handleDelete(slot)}
                      >
                        删除
                      </PixelButton>
                    )}
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </Modal>
  )
}
