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
  applyInductionQuiz,
  applyLevelResult,
  applyModeResult,
  applyUpgradePurchase,
  createDefaultSave,
  setTraineeName,
  type QuizAttempt,
  migrateSave,
  type LevelResultInput,
  type SaveData,
  type SettingsState,
} from './save';
import { parseModeLevelId } from '@/game/levels/modeLevels';

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
  buyUpgrade: (upgradeId: string) => boolean;
  toggleSetting: (key: keyof SettingsState) => void;
  setLastPlayed: (levelId: string) => void;
  resetProgress: () => void;
  recordInductionQuiz: (moduleId: string, attempt: QuizAttempt, allModuleIds: readonly string[]) => void;
  setTraineeName: (name: string) => void;
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
        // Daily / endless runs keep their own bookkeeping and never touch campaign records.
        const applied = parseModeLevelId(levelId)
          ? applyModeResult(get(), levelId, result)
          : applyLevelResult(get(), levelId, result);
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

      buyUpgrade: (upgradeId) => {
        const purchase = applyUpgradePurchase(get(), upgradeId);
        if (purchase.ok) set(purchase.save);
        return purchase.ok;
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

      recordInductionQuiz: (moduleId, attempt, allModuleIds) => {
        set(applyInductionQuiz(getCurrentSave(), moduleId, attempt, allModuleIds));
      },

      setTraineeName: (name) => {
        set(setTraineeName(getCurrentSave(), name));
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
        induction: state.induction,
        modes: state.modes,
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
    induction: state.induction,
    modes: state.modes,
  };
}