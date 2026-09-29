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
import { DEFAULT_CONTENT_PACK_ID } from '@/game/induction/contentPackId';
import { useLanguageStore, type Lang } from '@/i18n';

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

/** Built-in pack for a language (Indonesian or English). */
export function builtInPack(lang: Lang): ContentPack {
  return lang === 'id' ? DEFAULT_CONTENT_PACK_ID : DEFAULT_CONTENT_PACK;
}

/**
 * The content pack currently in use. An imported pack is always shown as written
 * by the site's HSE team; otherwise the built-in pack follows the app language.
 */
export function useActivePack(): ContentPack {
  const custom = useContentStore((s) => s.custom);
  const language = useLanguageStore((s) => s.language);
  return custom ?? builtInPack(language);
}
