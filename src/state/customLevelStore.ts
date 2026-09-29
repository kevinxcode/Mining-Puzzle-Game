/**
 * Player-made levels (level editor): drafts plus each level's personal best.
 * Custom levels never pay XP or coins, so they cannot be used to farm rewards.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LevelConfig } from '@/types/game';
import { CUSTOM_PREFIX, compileDraft, createDraft, type LevelDraft } from '@/game/editor/customLevel';
import { sanitizeStoredDraft } from '@/game/editor/draftCode';
import { registerCustomLevelResolver } from '@/game/levels/modeLevels';

export const MAX_CUSTOM_LEVELS = 30;

export interface CustomBest {
  stars: number;
  bestScore: number;
  bestTimeSeconds: number;
}

interface CustomLevelStore {
  drafts: LevelDraft[];
  bests: Record<string, CustomBest>;
  /** Creates a draft (from scratch or from a shared code) and returns its id, or null when full. */
  create: (from?: Omit<LevelDraft, 'id' | 'updatedAt'>) => string | null;
  save: (draft: LevelDraft) => void;
  remove: (id: string) => void;
  recordBest: (id: string, result: CustomBest) => void;
}

function newId(taken: readonly string[]): string {
  for (;;) {
    const id = `${CUSTOM_PREFIX}${Math.random().toString(36).slice(2, 8)}`;
    if (!taken.includes(id)) return id;
  }
}

export const useCustomLevels = create<CustomLevelStore>()(
  persist(
    (set, get) => ({
      drafts: [],
      bests: {},
      create: (from) => {
        const { drafts } = get();
        if (drafts.length >= MAX_CUSTOM_LEVELS) return null;
        const id = newId(drafts.map((d) => d.id));
        const now = Date.now();
        const draft: LevelDraft = from ? { ...from, id, updatedAt: now } : createDraft(id, now);
        set({ drafts: [draft, ...drafts] });
        return id;
      },
      save: (draft) =>
        set({ drafts: get().drafts.map((d) => (d.id === draft.id ? { ...draft, updatedAt: Date.now() } : d)) }),
      remove: (id) => {
        const { [id]: _removed, ...bests } = get().bests;
        set({ drafts: get().drafts.filter((d) => d.id !== id), bests });
      },
      recordBest: (id, result) => {
        const prev = get().bests[id];
        set({
          bests: {
            ...get().bests,
            [id]: prev
              ? {
                  stars: Math.max(prev.stars, result.stars),
                  bestScore: Math.max(prev.bestScore, result.bestScore),
                  bestTimeSeconds: Math.min(prev.bestTimeSeconds, result.bestTimeSeconds),
                }
              : result,
          },
        });
      },
    }),
    {
      name: 'miningpuzzle.customLevels',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ drafts: s.drafts, bests: s.bests }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as { drafts?: unknown; bests?: unknown };
        const drafts = Array.isArray(p.drafts)
          ? p.drafts.map(sanitizeStoredDraft).filter((d): d is LevelDraft => d !== null).slice(0, MAX_CUSTOM_LEVELS)
          : [];
        const bests = typeof p.bests === 'object' && p.bests !== null ? (p.bests as Record<string, CustomBest>) : {};
        return { ...current, drafts, bests };
      },
    },
  ),
);

/** The playable level for a custom id, or undefined when missing or not playable. */
export function resolveCustomLevel(id: string): LevelConfig | undefined {
  const draft = useCustomLevels.getState().drafts.find((d) => d.id === id);
  if (!draft) return undefined;
  // Drafts are immutable, so one compile per draft version keeps the level object
  // stable across renders (screens memoize on it).
  let level = compiledCache.get(draft);
  if (level === undefined) {
    const compiled = compileDraft(draft);
    level = compiled.ok ? compiled.level : null;
    compiledCache.set(draft, level);
  }
  return level ?? undefined;
}

const compiledCache = new WeakMap<LevelDraft, LevelConfig | null>();

registerCustomLevelResolver(resolveCustomLevel);
