'use client'

import type { MaimaiPost } from '@/types/maimai'
import { MaimaiCommentInput } from '@/components/game/phone/MaimaiCommentInput'

interface MaimaiPostCardProps {
  post: MaimaiPost
  onLike: (id: string) => void
  onComment: (id: string, content: string) => void
}

const VIRAL_LABELS = {
  ignored: '无人问津',
  small_buzz: '小范围发酵',
  trending: '圈内热议',
  viral: '全网热帖',
} as const

function getAuthorLabel(post: MaimaiPost): string {
  if (post.author === 'player') {
    return '我（匿名）'
  }

  return '匿名用户'
}

export function MaimaiPostCard({
  post,
  onLike,
  onComment,
}: MaimaiPostCardProps) {
  const playerCommented = post.comments.some((comment) => comment.author === 'player')

  return (
    <article className="pixel-border-light bg-[var(--pixel-bg-light)] p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] text-[var(--pixel-text-dim)]">
            {getAuthorLabel(post)} · Q{post.quarter}
          </div>
          <p className="mt-2 text-xs leading-5">{post.content}</p>
        </div>
        <div className="space-y-1 text-right text-[10px]">
          {post.viralLevel && (
            <div className="text-[var(--pixel-accent)]">{VIRAL_LABELS[post.viralLevel]}</div>
          )}
          {post.identityExposed && (
            <div className="text-[var(--pixel-red)]">身份疑似暴露</div>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-[var(--pixel-border)] pt-2 text-[10px] text-[var(--pixel-text-dim)]">
        <span>{post.comments.length} 条评论</span>
        <button onClick={() => onLike(post.id)} className="pixel-btn px-2 py-1 text-[10px]">
          {post.playerLiked ? '已赞' : '点赞'} · {post.likes}
        </button>
      </div>

      {post.comments.length > 0 && (
        <div className="mt-2 space-y-2">
          {post.comments.map((comment) => (
            <div key={comment.id} className="pixel-border bg-[var(--pixel-bg-panel)] p-2">
              <div className="text-[10px] text-[var(--pixel-text-dim)]">
                {comment.authorName}
              </div>
              <div className="mt-1 text-xs">{comment.content}</div>
            </div>
          ))}
        </div>
      )}

      <MaimaiCommentInput
        disabled={playerCommented}
        onSubmit={(content) => onComment(post.id, content)}
      />
    </article>
  )
}
