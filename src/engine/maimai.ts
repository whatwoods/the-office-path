import type { CriticalPeriodType, TimeMode } from "@/types/game";
import type { MaimaiPost } from "@/types/maimai";

const MAX_POSTS_PER_QUARTER = 2;
const POSTING_ALLOWED_CRITICAL_TYPES: CriticalPeriodType[] = ["board_review"];

export function canPostMaimai(
  postsThisQuarter: number,
  timeMode: TimeMode,
  criticalType: CriticalPeriodType | null,
): boolean {
  if (postsThisQuarter >= MAX_POSTS_PER_QUARTER) {
    return false;
  }

  if (timeMode === "critical") {
    return (
      criticalType !== null &&
      POSTING_ALLOWED_CRITICAL_TYPES.includes(criticalType)
    );
  }

  return true;
}

export function createPlayerPost(content: string, quarter: number): MaimaiPost {
  return {
    id: `maimai_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    quarter,
    author: "player",
    content,
    likes: 0,
    playerLiked: false,
    comments: [],
  };
}

export function addPlayerLike(post: MaimaiPost): MaimaiPost {
  if (post.playerLiked) {
    return post;
  }

  return {
    ...post,
    likes: post.likes + 1,
    playerLiked: true,
  };
}

export function addPlayerComment(
  post: MaimaiPost,
  content: string,
): MaimaiPost {
  if (post.comments.some((comment) => comment.author === "player")) {
    return post;
  }

  return {
    ...post,
    comments: [
      ...post.comments,
      {
        id: `comment_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        author: "player",
        content,
        authorName: "我（匿名）",
      },
    ],
  };
}
