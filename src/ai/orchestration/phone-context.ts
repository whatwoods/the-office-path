import type { PhoneMessage } from "@/types/game";

export function buildPhoneReplyContext(
  messages: PhoneMessage[],
  limit: number = 3,
): string | undefined {
  const replied = messages.filter((m) => m.selectedReply);
  if (replied.length === 0) return undefined;

  // Assuming array order has newest at the end
  const recent = [...replied].reverse().slice(0, limit);

  const lines = recent.map((m) => {
    return `- ${m.app} / ${m.sender}: "${m.content}" -> 玩家回复: "${m.selectedReply}"`;
  });

  return `最近手机回复：\n${lines.join("\n")}`;
}
