import type { PhoneMessage } from "@/types/game";

const PHONE_CONTEXT_TEXT_LIMIT = 36;

function truncateText(text: string, maxLength: number): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 3)}...`;
}

export function buildPhoneReplyContext(
  messages: PhoneMessage[],
  limit: number = 3,
): string | undefined {
  const replied = messages.filter((m) => m.selectedReply);
  if (replied.length === 0) return undefined;

  // Assuming array order has newest at the end
  const recent = [...replied].reverse().slice(0, limit);

  const lines = recent.map((m) => {
    return `- ${m.app} / ${m.sender}: "${truncateText(
      m.content,
      PHONE_CONTEXT_TEXT_LIMIT,
    )}" -> 玩家回复: "${truncateText(m.selectedReply ?? "", PHONE_CONTEXT_TEXT_LIMIT)}"`;
  });

  return `最近手机回复：\n${lines.join("\n")}`;
}
