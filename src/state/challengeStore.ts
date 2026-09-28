/**
 * Friend challenges: the player's nickname (persisted) and the challenge
 * currently opened from a pasted code (memory only).
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Challenge } from '@/game/challenge';

interface ChallengeStore {
  /** Shown to friends instead of the trainee's real name. */
  nickname: string;
  active: Challenge | null;
  setNickname: (nickname: string) => void;
  setActive: (challenge: Challenge | null) => void;
}

export const useChallengeStore = create<ChallengeStore>()(
  persist(
    (set) => ({
      nickname: '',
      active: null,
      setNickname: (nickname) => set({ nickname: nickname.slice(0, 20) }),
      setActive: (active) => set({ active }),
    }),
    {
      name: 'miningpuzzle.challenge',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ nickname: s.nickname }),
    },
  ),
);
