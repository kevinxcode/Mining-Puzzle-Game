/**
 * Active Site Induction content pack (built-in or imported), persisted locally.
 * A stored pack is re-validated on load; anything invalid falls back to built-in.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_CONTENT_PACK,
  contentPackJson,
  parseContentPack,
  type ContentPack,
  type ParseResult,
} from '@/game/induction/contentPack';

interface ContentStore {
  /** Imported pack, or null for the built-in content. */
  custom: ContentPack | null;
  importPack: (raw: string) => ParseResult;
  resetToBuiltIn: () => void;
}

export const useContentStore = create<ContentStore>()(
  persist(
    (set) => ({
      custom: null,
      importPack: (raw) => {
        const result = parseContentPack(raw);
        if (result.ok) set({ custom: result.pack });
        return result;
      },
      resetToBuiltIn: () => set({ custom: null }),
    }),
    {
      name: 'miningpuzzle.contentPack',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ custom: s.custom }),
      merge: (persisted, current) => {
        const custom = (persisted as { custom?: ContentPack | null } | undefined)?.custom ?? null;
        if (!custom) return { ...current, custom: null };
        const check = parseContentPack(contentPackJson(custom));
        return { ...current, custom: check.ok ? check.pack : null };
      },
    },
  ),
);

/** The content pack currently in use. */
export function useActivePack(): ContentPack {
  return useContentStore((s) => s.custom) ?? DEFAULT_CONTENT_PACK;
}
