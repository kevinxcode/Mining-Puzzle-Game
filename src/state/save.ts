/**
 * MINING FLOW — versioned save format.
 * Pure serialization/deserialization so the store stays thin and tests can
 * cover save/load without React Native.
 */

import { balance } from '../game/config/balance';

export const SAVE_VERSION = 1;
export const SAVE_KEY = 'miningflow.save';

export interface LevelRecord {
  stars: number;
  bestTimeSeconds: number;
  bestScore: number;
  /** Total XP / coins already paid for this level (replays only pay the difference). */
  xpEarned?: number;
  coinsEarned?: number;
}

export interface StatisticsState {
  totalTonsMoved: number;
  totalTrips: number;
  totalFuelUsed: number;
  levelsCompleted: number;
  threeStarLevels: number;
  bestCompletionSeconds: number | null;
  totalPlaytimeSeconds: number;
  averageEfficiency: number;
  bestProductionRate: number;
  attempts: number;
}

export interface SettingsState {
  music: boolean;
  sfx: boolean;
  haptics: boolean;
}

export interface SaveData {
  version: number;
  xp: number;
  coins: number;
  levels: Record<string, LevelRecord>;
  upgrades: Record<string, number>;
  achievements: Record<string, number>;
  statistics: StatisticsState;
  settings: SettingsState;
  lastPlayedLevelId: string | null;
}

export interface LevelResultInput {
  success: boolean;
  stars: number;
  elapsedSeconds: number;
  score: number;
  tonsMoved: number;
  trips: number;
  fuelUsed: number;
  efficiency: number;
  breakdowns: number;
  productionRate: number;
  playtimeSeconds: number;
  xpGain: number;
  coinsGain: number;
}

export class SaveCorruptError extends Error {}

export function createDefaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    xp: 0,
    coins: 0,
    levels: {},
    upgrades: {},
    achievements: {},
    statistics: {
      totalTonsMoved: 0,
      totalTrips: 0,
      totalFuelUsed: 0,
      levelsCompleted: 0,
      threeStarLevels: 0,
      bestCompletionSeconds: null,
      totalPlaytimeSeconds: 0,
      averageEfficiency: 0,
      bestProductionRate: 0,
      attempts: 0,
    },
    settings: { music: true, sfx: true, haptics: true },
    lastPlayedLevelId: null,
  };
}

export function serializeSave(data: SaveData): string {
  return JSON.stringify({ ...data, version: SAVE_VERSION });
}

/** Parses a save string; throws SaveCorruptError on invalid data. */
export function deserializeSave(raw: string): SaveData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new SaveCorruptError('Save is not valid JSON');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new SaveCorruptError('Save is not an object');
  }
  const data = migrateSave(parsed as Partial<SaveData> & { version?: number });
  validateShape(data);
  return data;
}

/** Merges partial/older saves into a complete current-version save. */
export function migrateSave(data: Partial<SaveData> & { version?: number }): SaveData {
  const base = createDefaultSave();
  const merged: SaveData = {
    ...base,
    ...data,
    levels: { ...(data.levels ?? {}) },
    upgrades: { ...(data.upgrades ?? {}) },
    achievements: { ...(data.achievements ?? {}) },
    statistics: { ...base.statistics, ...(data.statistics ?? {}) },
    settings: { ...base.settings, ...(data.settings ?? {}) },
    version: SAVE_VERSION,
  };
  return merged;
}

function validateShape(data: SaveData): void {
  if (typeof data.xp !== 'number' || Number.isNaN(data.xp)) {
    throw new SaveCorruptError('Save has invalid xp');
  }
  if (typeof data.coins !== 'number' || Number.isNaN(data.coins)) {
    throw new SaveCorruptError('Save has invalid coins');
  }
  for (const [levelId, record] of Object.entries(data.levels)) {
    if (!record || typeof record.stars !== 'number' || typeof record.bestScore !== 'number') {
      throw new SaveCorruptError(`Save has invalid level record: ${levelId}`);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Level result application (pure, testable)                           */
/* ------------------------------------------------------------------ */

export interface ApplyLevelResultResult {
  save: SaveData;
  /** True when any new XP or coins were granted. */
  rewarded: boolean;
  xpGranted: number;
  coinsGranted: number;
}

export function applyLevelResult(
  save: SaveData,
  levelId: string,
  result: LevelResultInput,
): ApplyLevelResultResult {
  const next: SaveData = {
    ...save,
    levels: { ...save.levels },
    statistics: { ...save.statistics },
  };
  const previous = next.levels[levelId];
  const moreStars = !previous || result.stars > previous.stars;
  // Legacy records have no earned totals: treat them as fully paid unless stars improve.
  const xpEarned = previous?.xpEarned ?? (previous && !moreStars ? result.xpGain : 0);
  const coinsEarned = previous?.coinsEarned ?? (previous && !moreStars ? result.coinsGain : 0);
  const xpGranted = result.success && moreStars ? Math.max(0, result.xpGain - xpEarned) : 0;
  const coinsGranted = result.success && moreStars ? Math.max(0, result.coinsGain - coinsEarned) : 0;

  if (result.success) {
    next.levels[levelId] = {
      stars: Math.max(previous?.stars ?? 0, result.stars),
      bestTimeSeconds: previous
        ? Math.min(previous.bestTimeSeconds, result.elapsedSeconds)
        : result.elapsedSeconds,
      bestScore: Math.max(previous?.bestScore ?? 0, result.score),
      xpEarned: xpEarned + xpGranted,
      coinsEarned: coinsEarned + coinsGranted,
    };
  }

  const stats = next.statistics;
  stats.attempts += 1;
  stats.totalTonsMoved += result.tonsMoved;
  stats.totalTrips += result.trips;
  stats.totalFuelUsed += result.fuelUsed;
  stats.totalPlaytimeSeconds += result.playtimeSeconds;
  stats.averageEfficiency =
    Math.round((stats.averageEfficiency + (result.efficiency - stats.averageEfficiency) / stats.attempts) * 10) /
    10;
  stats.bestProductionRate = Math.max(stats.bestProductionRate, result.productionRate);
  if (result.success) {
    stats.bestCompletionSeconds =
      stats.bestCompletionSeconds === null
        ? result.elapsedSeconds
        : Math.min(stats.bestCompletionSeconds, result.elapsedSeconds);
  }
  stats.levelsCompleted = Object.keys(next.levels).length;
  stats.threeStarLevels = Object.values(next.levels).filter((r) => r.stars >= 3).length;

  // Rewards are paid once per star tier: a replay only pays what was not paid before.
  next.xp += xpGranted;
  next.coins += coinsGranted;
  const rewarded = xpGranted > 0 || coinsGranted > 0;

  next.lastPlayedLevelId = levelId;
  return { save: next, rewarded, xpGranted, coinsGranted };
}

/* ------------------------------------------------------------------ */
/* Player level progression                                            */
/* ------------------------------------------------------------------ */

/** Cumulative XP needed to reach a player level (level 1 = 0 XP). */
export function totalXpForPlayerLevel(level: number): number {
  return (balance.playerLevelXpBase * (level - 1) * level) / 2;
}

export function playerLevelFromXp(xp: number): number {
  let level = 1;
  while (level < 999 && totalXpForPlayerLevel(level + 1) <= xp) {
    level += 1;
  }
  return level;
}

export function xpProgress(xp: number): {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
} {
  const level = playerLevelFromXp(xp);
  return {
    level,
    currentLevelXp: totalXpForPlayerLevel(level),
    nextLevelXp: totalXpForPlayerLevel(level + 1),
  };
}