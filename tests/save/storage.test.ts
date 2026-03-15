import { beforeEach, describe, expect, it, vi } from "vitest";

import { createNewGame } from "@/engine/state";
import { deleteSave, listSaves, loadGame, saveGame } from "@/save/storage";

const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

vi.stubGlobal("localStorage", localStorageMock);

describe("saveGame", () => {
  beforeEach(() => localStorageMock.clear());

  it("saves and loads game state", () => {
    const state = createNewGame();
    saveGame(state, "slot1");

    const loaded = loadGame("slot1");

    expect(loaded).not.toBeNull();
    expect(loaded?.player.health).toBe(90);
    expect(loaded?.job.level).toBe("L1");
  });

  it("returns null for an empty slot", () => {
    expect(loadGame("slot1")).toBeNull();
  });
});

describe("listSaves", () => {
  beforeEach(() => localStorageMock.clear());

  it("lists save slots with metadata", () => {
    const state = createNewGame();
    saveGame(state, "slot1");

    const saves = listSaves();

    expect(saves).toHaveLength(1);
    expect(saves[0]?.slot).toBe("slot1");
    expect(saves[0]?.quarter).toBe(0);
  });
});

describe("deleteSave", () => {
  beforeEach(() => localStorageMock.clear());

  it("removes a save slot", () => {
    const state = createNewGame();
    saveGame(state, "slot1");

    expect(listSaves()).toHaveLength(1);

    deleteSave("slot1");

    expect(listSaves()).toHaveLength(0);
    expect(loadGame("slot1")).toBeNull();
  });
});
