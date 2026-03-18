import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/components/intro/BlackScreenText", () => ({
  BlackScreenText: ({ onComplete }: { onComplete: () => void }) => (
    <button onClick={onComplete}>完成黑屏</button>
  ),
}));

vi.mock("@/components/intro/GraduationNarrative", () => ({
  GraduationNarrative: ({ onComplete }: { onComplete: () => void }) => (
    <button onClick={onComplete}>完成叙事</button>
  ),
}));

vi.mock("@/components/intro/NameInput", () => ({
  NameInput: ({ onSubmit }: { onSubmit: (name: string) => void }) => (
    <button onClick={() => onSubmit("小明")}>提交名字</button>
  ),
}));

vi.mock("@/components/intro/MajorSelect", () => ({
  MajorSelect: ({ onSelect }: { onSelect: (major: "finance") => void }) => (
    <button onClick={() => onSelect("finance")}>选择专业</button>
  ),
}));

vi.mock("@/components/intro/PhoneNotification", () => ({
  PhoneNotification: ({ onComplete }: { onComplete: () => void }) => (
    <button onClick={onComplete}>查看通知</button>
  ),
}));

vi.mock("@/components/intro/OfferLetter", () => ({
  OfferLetter: ({
    playerName,
    major,
    onAccept,
  }: {
    playerName: string;
    major: string;
    onAccept: () => void;
  }) => (
    <button onClick={onAccept}>{`${playerName}-${major}-接受`}</button>
  ),
}));

import IntroPage from "@/app/intro/page";
import { createNewGame } from "@/engine/state";
import { useGameStore } from "@/store/gameStore";

describe("IntroPage", () => {
  beforeEach(() => {
    push.mockReset();
    useGameStore.setState({
      state: null,
      isLoading: false,
      error: null,
      activePanel: "attributes",
      activePhoneApp: null,
      showSaveModal: false,
      narrativeQueue: [],
      promotionInfo: null,
      currentEvent: null,
      criticalChoices: [],
      showQuarterTransition: false,
      lastPerformance: null,
    });
  });

  it("advances through the intro phases until the name step", async () => {
    const user = userEvent.setup();

    render(<IntroPage />);

    await user.click(screen.getByText("完成黑屏"));
    await user.click(screen.getByText("完成叙事"));

    expect(screen.getByText("提交名字")).toBeDefined();
  });

  it("uses a scrollable safe-area layout on mobile", () => {
    const { container } = render(<IntroPage />);
    const root = container.firstElementChild as HTMLElement;

    expect(root.className).toContain("min-h-[100dvh]");
    expect(root.className).toContain("overflow-y-auto");
    expect(root.className).toContain("px-4");
    expect(root.className).toContain("pb-safe");
    expect(root.className).toContain("sm:px-6");
  });

  it("collects intro choices and starts a game before entering /game", async () => {
    const user = userEvent.setup();
    const newGame = vi.fn(
      async (params?: { major?: "tech" | "finance" | "liberal"; playerName?: string }) => {
        useGameStore.setState({
          state: createNewGame({
            major: params?.major,
            playerName: params?.playerName,
          }),
          isLoading: false,
        });
      },
    );

    useGameStore.setState({ newGame });

    render(<IntroPage />);

    await user.click(screen.getByText("完成黑屏"));
    await user.click(screen.getByText("完成叙事"));
    await user.click(screen.getByText("提交名字"));
    await user.click(screen.getByText("选择专业"));
    await user.click(screen.getByText("查看通知"));

    expect(screen.getByText("小明-finance-接受")).toBeDefined();

    await user.click(screen.getByText("小明-finance-接受"));

    expect(newGame).toHaveBeenCalledWith({
      major: "finance",
      playerName: "小明",
    });
    expect(push).toHaveBeenCalledWith("/game");
  });
});
