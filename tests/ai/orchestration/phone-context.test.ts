import { describe, expect, it } from "vitest";
import { buildPhoneReplyContext } from "@/ai/orchestration/phone-context";
import type { PhoneMessage } from "@/types/game";

describe("buildPhoneReplyContext", () => {
  it("formats replies correctly", () => {
    const messages: Partial<PhoneMessage>[] = [
      { app: "xiaoxin", sender: "王建国", content: "今晚一起吃饭？", selectedReply: "今晚得加班，下次" },
      { app: "dingding", sender: "系统通知", content: "周会改到 9 点", selectedReply: "收到" },
    ];

    const result = buildPhoneReplyContext(messages as PhoneMessage[]);
    expect(result).toBe(
      `最近手机回复：\n- dingding / 系统通知: "周会改到 9 点" -> 玩家回复: "收到"\n- xiaoxin / 王建国: "今晚一起吃饭？" -> 玩家回复: "今晚得加班，下次"`
    );
  });

  it("returns undefined for empty input", () => {
    expect(buildPhoneReplyContext([])).toBeUndefined();
    expect(buildPhoneReplyContext([{ app: "xiaoxin", selectedReply: undefined } as PhoneMessage])).toBeUndefined();
  });

  it("respects the max-item limit", () => {
    const messages: Partial<PhoneMessage>[] = Array.from({ length: 5 }, (_, i) => ({
      app: "xiaoxin",
      sender: `人${i}`,
      content: "内容",
      selectedReply: `回复${i}`,
    }));

    const result = buildPhoneReplyContext(messages as PhoneMessage[], 2);
    expect(result).toContain("回复4");
    expect(result).toContain("回复3");
    expect(result).not.toContain("回复2");
  });
});
