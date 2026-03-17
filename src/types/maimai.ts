export type ViralLevel = "ignored" | "small_buzz" | "trending" | "viral";

export interface MaimaiComment {
  id: string;
  author: "player" | "anonymous";
  content: string;
  authorName: string;
}

export interface MaimaiPost {
  id: string;
  quarter: number;
  author: "player" | "anonymous";
  content: string;
  likes: number;
  playerLiked: boolean;
  comments: MaimaiComment[];
  viralLevel?: ViralLevel;
  identityExposed?: boolean;
}
