/**
 * MINING FLOW — progression store (Zustand + AsyncStorage persistence).
 * Separates progression state from simulation state and from persistence.
 * Save format is versioned; corruption falls back to a fresh save.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setMusicEnabled, setSfxEnabled } from '@/services/audio';
import { setHapticsEnabled } from '@/services/haptics';
import { evaluateAchievements } from '@/game/achievements';
import type { ResultFlags } from '@/game/scoring';
import {
  SAVE_KEY,
  SAVE_VERSION,
  applyLevelResult,
  createDefaultSave,
  migrateSave,
  type LevelResultInput,
  type SaveData,
  type SettingsState,
} from './save';

export interface LevelResultOutcome {
  rewarded: boolean;
  xpGranted: number;
  coinsGranted: number;
  newAchievements: string[];
}

interface ProgressionActions {
  recordLevelResult: (
    levelId: string,
    result: LevelResultInput,
    flags: ResultFlags,
  ) => LevelResultOutcome;
  buyUpgrade: (upgradeId: string, cost: number) => boolean;
  toggleSetting: (key: keyof SettingsState) => void;
  setLastPlayed: (levelId: string) => void;
  resetProgress: () => void;
}

export type ProgressionStore = SaveData & ProgressionActions;

function syncServiceSettings(settings: SettingsState): void {
  setMusicEnabled(settings.music);
  setSfxEnabled(settings.sfx);
  setHapticsEnabled(settings.haptics);
}

export const useProgression = create<ProgressionStore>()(
  persist(
    (set, get) => ({
      ...createDefaultSave(),

      recordLevelResult: (levelId, result, flags) => {
        const applied = applyLevelResult(get(), levelId, result);
        const newAchievements = evaluateAchievements(applied.save, flags);
        const merged: SaveData = {
          ...applied.save,
          achievements: { ...applied.save.achievements },
        };
        for (const id of newAchievements) {
          merged.achievements[id] = Date.now();
        }
        syncServiceSettings(merged.settings);
        set(merged);
        return {
          rewarded: applied.rewarded,
          xpGranted: applied.xpGranted,
          coinsGranted: applied.coinsGranted,
          newAchievements,
        };
      },

      buyUpgrade: (upgradeId, cost) => {
        const current = get();
        if (current.coins < cost) return false;
        set({
          ...current,
          coins: current.coins - cost,
          upgrades: { ...current.upgrades, [upgradeId]: (current.upgrades[upgradeId] ?? 0) + 1 },
        });
        return true;
      },

      toggleSetting: (key) => {
        const current = get();
        const settings = { ...current.settings, [key]: !current.settings[key] };
        syncServiceSettings(settings);
        set({ ...current, settings });
      },

      setLastPlayed: (levelId) => {
        set({ ...get(), lastPlayedLevelId: levelId });
      },

      resetProgress: () => {
        const fresh = createDefaultSave();
        syncServiceSettings(fresh.settings);
        set(fresh);
      },
    }),
    {
      name: SAVE_KEY,
      version: SAVE_VERSION,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        version: SAVE_VERSION,
        xp: state.xp,
        coins: state.coins,
        levels: state.levels,
        upgrades: state.upgrades,
        achievements: state.achievements,
        statistics: state.statistics,
        settings: state.settings,
        lastPlayedLevelId: state.lastPlayedLevelId,
      }),
      migrate: (persisted) => migrateSave((persisted ?? {}) as Partial<SaveData>),
      merge: (persisted, current) => {
        const saved = deserializeSaveSafe(persisted);
        return { ...current, ...saved };
      },
      onRehydrateStorage: () => (state) => {
        if (state) syncServiceSettings(state.settings);
      },
    },
  ),
);

/** Rehydrate helper that never throws on corrupted storage. */
function deserializeSaveSafe(persisted: unknown): Partial<SaveData> {
  try {
    return migrateSave((persisted ?? {}) as Partial<SaveData>);
  } catch {
    return createDefaultSave();
  }
}

/** Snapshot of the current save data (pure shape, useful for helpers). */
export function getCurrentSave(): SaveData {
  const state = useProgression.getState();
  return {
    version: SAVE_VERSION,
    xp: state.xp,
    coins: state.coins,
    levels: state.levels,
    upgrades: state.upgrades,
    achievements: state.achievements,
    statistics: state.statistics,
    settings: state.settings,
    lastPlayedLevelId: state.lastPlayedLevelId,
  };
}