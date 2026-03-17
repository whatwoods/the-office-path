import type { GameState } from "@/types/game";
import { migrate } from "@/save/migration";
import type { JobOffer } from "@/types/job-offer";

const CURRENT_VERSION = "1.2";
const STORAGE_PREFIX = "office_path_save_";

export const SAVE_SLOTS = ["auto", "slot1", "slot2", "slot3"] as const;
export type SaveSlot = (typeof SAVE_SLOTS)[number];

export interface SaveMeta {
  slot: SaveSlot;
  quarter: number;
  phase: number;
  level: string;
  savedAt: string;
}

export function saveGame(state: GameState, slot: SaveSlot): void {
  const payload = {
    state,
    savedAt: new Date().toISOString(),
  };

  localStorage.setItem(STORAGE_PREFIX + slot, JSON.stringify(payload));
}

export function loadGame(slot: SaveSlot): GameState | null {
  const raw = localStorage.getItem(STORAGE_PREFIX + slot);
  if (!raw) {
    return null;
  }

  try {
    const payload = JSON.parse(raw) as { state: GameState };
    let state: GameState | null = payload.state;
    if (state.version !== CURRENT_VERSION) {
      const migrated = migrate(
        state as unknown as Record<string, unknown>,
        CURRENT_VERSION,
      );
      state = migrated as GameState | null;
    }

    if (!state) {
      return null;
    }

    if (state.jobOffers) {
      state.jobOffers = state.jobOffers.filter(
        (offer: JobOffer) => offer.expiresAtQuarter >= state.currentQuarter,
      );
    }

    return state;
  } catch {
    return null;
  }
}

export function listSaves(): SaveMeta[] {
  const saves: SaveMeta[] = [];

  for (const slot of SAVE_SLOTS) {
    const raw = localStorage.getItem(STORAGE_PREFIX + slot);
    if (!raw) {
      continue;
    }

    try {
      const payload = JSON.parse(raw) as { state: GameState; savedAt: string };
      saves.push({
        slot,
        quarter: payload.state.currentQuarter,
        phase: payload.state.phase,
        level: payload.state.job.level,
        savedAt: payload.savedAt,
      });
    } catch {
      continue;
    }
  }

  return saves;
}

export function deleteSave(slot: SaveSlot): void {
  localStorage.removeItem(STORAGE_PREFIX + slot);
}
