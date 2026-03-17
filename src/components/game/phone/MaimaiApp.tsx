'use client'

import { useGameStore } from '@/store/gameStore'
import { canPostMaimai } from '@/engine/maimai'
import { MaimaiCompose } from '@/components/game/phone/MaimaiCompose'
import { MaimaiPostCard } from '@/components/game/phone/MaimaiPostCard'
import { useState } from 'react'

export function MaimaiApp() {
  const state = useGameStore(s => s.state)
  const postOnMaimai = useGameStore(s => s.postOnMaimai)
  const likePost = useGameStore(s => s.likePost)
  const commentOnPost = useGameStore(s => s.commentOnPost)
  const [showComposer, setShowComposer] = useState(false)

  if (!state) return null

  const posts = [...state.maimaiPosts].sort((a, b) => b.quarter - a.quarter)
  const canPost = canPostMaimai(
    state.maimaiPostsThisQuarter,
    state.timeMode,
    state.criticalPeriod?.type ?? null,
  )
  const postsRemaining = 2 - state.maimaiPostsThisQuarter

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm text-[var(--pixel-text-bright)]">麦麦</h3>
          <p className="text-[10px] text-[var(--pixel-text-dim)]">匿名职场树洞</p>
        </div>
        <button
          onClick={() => setShowComposer((value) => !value)}
          className="pixel-btn px-2 py-1 text-[10px]"
        >
          {showComposer ? '收起' : '发帖'}
        </button>
      </div>

      {showComposer && (
        <MaimaiCompose
          canPost={canPost}
          postsRemaining={postsRemaining}
          onSubmit={(content) => {
            postOnMaimai(content)
            setShowComposer(false)
          }}
        />
      )}

      {posts.length === 0 ? (
        <p className="text-xs text-[var(--pixel-text-dim)]">暂无爆料，做第一个发声的人。</p>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <MaimaiPostCard
              key={post.id}
              post={post}
              onLike={likePost}
              onComment={commentOnPost}
            />
          ))}
        </div>
      )}
    </div>
  )
}
