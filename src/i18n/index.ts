/**
 * i18n entry: the persisted language choice plus a hook that re-renders
 * screens when it changes. English is the default.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setLanguageNow, t, tn, tx, type Lang } from './core';

export * from './core';

interface LanguageStore {
  language: Lang;
  setLanguage: (lang: Lang) => void;
}

export const useLanguageStore = create<LanguageStore>()(
  persist(
    (set) => ({
      language: 'en',
      setLanguage: (language) => {
        setLanguageNow(language);
        set({ language });
      },
    }),
    {
      name: 'miningpuzzle.language',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state && (state.language === 'en' || state.language === 'id')) setLanguageNow(state.language);
      },
    },
  ),
);

/** Subscribes the component to language changes and returns the translators. */
export function useT() {
  const language = useLanguageStore((s) => s.language);
  return { t, tx, tn, language };
}
