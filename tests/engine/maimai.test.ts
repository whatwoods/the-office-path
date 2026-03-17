import { describe, expect, it } from "vitest";

import {
  addPlayerComment,
  addPlayerLike,
  canPostMaimai,
  createPlayerPost,
} from "@/engine/maimai";
import type { MaimaiPost } from "@/types/maimai";

describe("canPostMaimai", () => {
  it("allows posting when count is under the limit and not in a critical period", () => {
    expect(canPostMaimai(0, "quarterly", null)).toBe(true);
    expect(canPostMaimai(1, "quarterly", null)).toBe(true);
  });

  it("blocks posting when count reaches the limit", () => {
    expect(canPostMaimai(2, "quarterly", null)).toBe(false);
  });

  it("blocks posting during normal critical periods", () => {
    expect(canPostMaimai(0, "critical", "project_sprint")).toBe(false);
  });

  it("allows posting during non-combat executive critical periods", () => {
    expect(canPostMaimai(0, "critical", "board_review")).toBe(true);
  });

  it("blocks posting during combat executive critical periods", () => {
    expect(canPostMaimai(0, "critical", "power_struggle")).toBe(false);
  });
});

describe("createPlayerPost", () => {
  it("creates a player-authored post with default interaction state", () => {
    const post = createPlayerPost("test content", 3);

    expect(post.author).toBe("player");
    expect(post.content).toBe("test content");
    expect(post.quarter).toBe(3);
    expect(post.likes).toBe(0);
    expect(post.playerLiked).toBe(false);
    expect(post.comments).toEqual([]);
    expect(post.id).toBeTruthy();
  });
});

describe("addPlayerLike", () => {
  it("sets playerLiked to true and increments likes", () => {
    const post: MaimaiPost = {
      id: "1",
      quarter: 1,
      author: "anonymous",
      content: "test",
      likes: 5,
      playerLiked: false,
      comments: [],
    };

    const result = addPlayerLike(post);

    expect(result.playerLiked).toBe(true);
    expect(result.likes).toBe(6);
  });

  it("does not double-like the same post", () => {
    const post: MaimaiPost = {
      id: "1",
      quarter: 1,
      author: "anonymous",
      content: "test",
      likes: 5,
      playerLiked: true,
      comments: [],
    };

    const result = addPlayerLike(post);

    expect(result.likes).toBe(5);
  });
});

describe("addPlayerComment", () => {
  it("adds a player comment", () => {
    const post: MaimaiPost = {
      id: "1",
      quarter: 1,
      author: "anonymous",
      content: "test",
      likes: 0,
      playerLiked: false,
      comments: [],
    };

    const result = addPlayerComment(post, "my comment");

    expect(result.comments).toHaveLength(1);
    expect(result.comments[0].author).toBe("player");
    expect(result.comments[0].content).toBe("my comment");
    expect(result.comments[0].authorName).toBe("我（匿名）");
  });

  it("rejects a second player comment on the same post", () => {
    const post: MaimaiPost = {
      id: "1",
      quarter: 1,
      author: "anonymous",
      content: "test",
      likes: 0,
      playerLiked: false,
      comments: [
        {
          id: "c1",
          author: "player",
          content: "first",
          authorName: "我（匿名）",
        },
      ],
    };

    const result = addPlayerComment(post, "second");

    expect(result.comments).toHaveLength(1);
  });
});
