/**
 * MINING FLOW — versioned save format.
 * Pure serialization/deserialization so the store stays thin and tests can
 * cover save/load without React Native.
 */

import { balance } from '../game/config/balance';
import { UPGRADES, upgradeCost } from '../game/config/equipment';
import { modeRewards } from '../game/config/rewards';
import { parseModeLevelId } from '../game/levels/modeLevels';
import { HAZARD_MAX_MISSES } from '../game/induction/hazards';

/**
 * v1: campaign progression.
 * v2: adds `induction` (Site Induction training progress + trainee name).
 */
export const SAVE_VERSION = 3;
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

export interface InductionModuleRecord {
  /** Best quiz score (correct answers). */
  bestScore: number;
  /** Number of questions in the quiz when the best score was set. */
  total: number;
  /** Timestamp of the first passing attempt, or null while not passed. */
  completedAt: number | null;
  attempts: number;
}

export interface InductionState {
  modules: Record<string, InductionModuleRecord>;
  /** Player-entered name for the certificate (stored locally only). */
  traineeName: string;
  /** Timestamp when all modules were first completed. */
  certifiedAt: number | null;
  /** Hazard-spotting results per scene id. */
  hazards: Record<string, HazardRecord>;
  /** Pre-start inspection (P2H) results per scenario id. */
  prestart: Record<string, PrestartRecord>;
}

export interface PrestartRecord {
  bestCorrect: number;
  total: number;
  attempts: number;
  passedAt: number | null;
}

export interface PrestartRunInput {
  correct: number;
  total: number;
  passed: boolean;
}

export interface HazardRecord {
  bestFound: number;
  total: number;
  attempts: number;
  /** First passing run, or null. */
  passedAt: number | null;
}

export interface HazardRunInput {
  found: number;
  total: number;
  misses: number;
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
  induction: InductionState;
  modes: ModesState;
}

export interface ModesState {
  daily: {
    /** Date (YYYY-MM-DD) of the last paid daily win. */
    lastWinDate: string | null;
    streak: number;
    /** Best score on lastWinDate / today's attempts. */
    bestScoreDate: string | null;
    bestScoreToday: number;
    totalWins: number;
  };
  endless: {
    bestShift: number;
    bestTons: number;
  };
  weekly: {
    /** ISO week (YYYY-Www) of the last paid weekly win. */
    lastWinWeek: string | null;
    /** Week the best score belongs to. */
    bestWeek: string | null;
    bestScore: number;
    totalWins: number;
  };
}

export function createDefaultModes(): ModesState {
  return {
    daily: { lastWinDate: null, streak: 0, bestScoreDate: null, bestScoreToday: 0, totalWins: 0 },
    endless: { bestShift: 0, bestTons: 0 },
    weekly: { lastWinWeek: null, bestWeek: null, bestScore: 0, totalWins: 0 },
  };
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
    induction: createDefaultInduction(),
    modes: createDefaultModes(),
  };
}

export function createDefaultInduction(): InductionState {
  return { modules: {}, traineeName: '', certifiedAt: null, hazards: {}, prestart: {} };
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
function migrateModes(data: Partial<ModesState> | undefined): ModesState {
  const base = createDefaultModes();
  const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
  const str = (v: unknown) => (typeof v === 'string' ? v : null);
  return {
    daily: {
      lastWinDate: str(data?.daily?.lastWinDate),
      streak: num(data?.daily?.streak, base.daily.streak),
      bestScoreDate: str(data?.daily?.bestScoreDate),
      bestScoreToday: num(data?.daily?.bestScoreToday, 0),
      totalWins: num(data?.daily?.totalWins, 0),
    },
    endless: {
      bestShift: num(data?.endless?.bestShift, 0),
      bestTons: num(data?.endless?.bestTons, 0),
    },
    weekly: {
      lastWinWeek: str(data?.weekly?.lastWinWeek),
      bestWeek: str(data?.weekly?.bestWeek),
      bestScore: num(data?.weekly?.bestScore, 0),
      totalWins: num(data?.weekly?.totalWins, 0),
    },
  };
}

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
    induction: migrateInduction(data.induction),
    modes: migrateModes(data.modes),
    version: SAVE_VERSION,
  };
  return merged;
}

/** v1 saves have no induction block; malformed entries are dropped instead of failing the whole save. */
function migrateInduction(raw: unknown): InductionState {
  const base = createDefaultInduction();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base;
  const data = raw as Partial<InductionState>;
  const modules: Record<string, InductionModuleRecord> = {};
  if (data.modules && typeof data.modules === 'object') {
    for (const [id, rec] of Object.entries(data.modules)) {
      if (!rec || typeof rec !== 'object') continue;
      const r = rec as Partial<InductionModuleRecord>;
      modules[id] = {
        bestScore: typeof r.bestScore === 'number' ? r.bestScore : 0,
        total: typeof r.total === 'number' ? r.total : 0,
        completedAt: typeof r.completedAt === 'number' ? r.completedAt : null,
        attempts: typeof r.attempts === 'number' ? r.attempts : 0,
      };
    }
  }
  return {
    modules,
    traineeName: typeof data.traineeName === 'string' ? data.traineeName.slice(0, MAX_TRAINEE_NAME) : '',
    certifiedAt: typeof data.certifiedAt === 'number' ? data.certifiedAt : null,
    hazards: migrateHazards(data.hazards),
    prestart: migratePrestart(data.prestart),
  };
}

function migrateHazards(raw: unknown): Record<string, HazardRecord> {
  const out: Record<string, HazardRecord> = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [id, rec] of Object.entries(raw as Record<string, Partial<HazardRecord>>)) {
    if (!rec || typeof rec !== 'object') continue;
    out[id] = {
      bestFound: typeof rec.bestFound === 'number' ? rec.bestFound : 0,
      total: typeof rec.total === 'number' ? rec.total : 0,
      attempts: typeof rec.attempts === 'number' ? rec.attempts : 0,
      passedAt: typeof rec.passedAt === 'number' ? rec.passedAt : null,
    };
  }
  return out;
}

function migratePrestart(raw: unknown): Record<string, PrestartRecord> {
  const out: Record<string, PrestartRecord> = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [id, rec] of Object.entries(raw as Record<string, Partial<PrestartRecord>>)) {
    if (!rec || typeof rec !== 'object') continue;
    out[id] = {
      bestCorrect: typeof rec.bestCorrect === 'number' ? rec.bestCorrect : 0,
      total: typeof rec.total === 'number' ? rec.total : 0,
      attempts: typeof rec.attempts === 'number' ? rec.attempts : 0,
      passedAt: typeof rec.passedAt === 'number' ? rec.passedAt : null,
    };
  }
  return out;
}

/** Records one pre-start inspection run (best kept, first pass stamped once). */
export function applyPrestartRun(save: SaveData, scenarioId: string, run: PrestartRunInput, now: number): SaveData {
  const prev = save.induction.prestart[scenarioId];
  return {
    ...save,
    induction: {
      ...save.induction,
      prestart: {
        ...save.induction.prestart,
        [scenarioId]: {
          bestCorrect: Math.max(prev?.bestCorrect ?? 0, run.correct),
          total: run.total,
          attempts: (prev?.attempts ?? 0) + 1,
          passedAt: prev?.passedAt ?? (run.passed ? now : null),
        },
      },
    },
  };
}

/** Records one hazard-spotting run (best result kept, first pass stamped once). */
export function applyHazardRun(save: SaveData, sceneId: string, run: HazardRunInput, now: number): SaveData {
  const prev = save.induction.hazards[sceneId];
  const passed = run.found >= run.total && run.misses <= HAZARD_MAX_MISSES;
  return {
    ...save,
    induction: {
      ...save.induction,
      hazards: {
        ...save.induction.hazards,
        [sceneId]: {
          bestFound: Math.max(prev?.bestFound ?? 0, run.found),
          total: run.total,
          attempts: (prev?.attempts ?? 0) + 1,
          passedAt: prev?.passedAt ?? (passed ? now : null),
        },
      },
    },
  };
}

/* ------------------------------------------------------------------ */
/* Site Induction progress (pure, testable)                            */
/* ------------------------------------------------------------------ */

export const MAX_TRAINEE_NAME = 40;

export interface QuizAttempt {
  correct: number;
  total: number;
  passed: boolean;
}

/**
 * Records a quiz attempt. Best score is kept; a module is completed on its
 * first pass and stays completed. When every module in `allModuleIds` is
 * complete, the certificate date is set (once).
 */
export function applyInductionQuiz(
  save: SaveData,
  moduleId: string,
  attempt: QuizAttempt,
  allModuleIds: readonly string[],
  now: number = Date.now(),
): SaveData {
  const prev = save.induction.modules[moduleId];
  const better = !prev || attempt.correct > prev.bestScore;
  const record: InductionModuleRecord = {
    bestScore: better ? attempt.correct : prev.bestScore,
    total: better ? attempt.total : prev.total,
    completedAt: prev?.completedAt ?? (attempt.passed ? now : null),
    attempts: (prev?.attempts ?? 0) + 1,
  };
  const modules = { ...save.induction.modules, [moduleId]: record };
  const allDone = allModuleIds.length > 0 && allModuleIds.every((id) => modules[id]?.completedAt != null);
  return {
    ...save,
    induction: {
      ...save.induction,
      modules,
      certifiedAt: save.induction.certifiedAt ?? (allDone ? now : null),
    },
  };
}

export function setTraineeName(save: SaveData, name: string): SaveData {
  return {
    ...save,
    induction: { ...save.induction, traineeName: name.replace(/\s+/g, ' ').trimStart().slice(0, MAX_TRAINEE_NAME) },
  };
}

export function inductionProgress(
  induction: InductionState,
  allModuleIds: readonly string[],
): { completed: number; total: number; fraction: number } {
  const completed = allModuleIds.filter((id) => induction.modules[id]?.completedAt != null).length;
  const total = allModuleIds.length;
  return { completed, total, fraction: total > 0 ? completed / total : 0 };
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

/** Career statistics shared by campaign and mode runs (mutates `stats`). */
function accumulateRunStats(stats: StatisticsState, result: LevelResultInput): void {
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
}

export function applyLevelResult(
  save: SaveData,
  levelId: string,
  result: LevelResultInput,
): ApplyLevelResultResult {
  if (parseModeLevelId(levelId)) {
    throw new Error(`applyLevelResult: "${levelId}" is a mode level — use applyModeResult`);
  }
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
  accumulateRunStats(stats, result);
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
/* ------------------------------------------------------------------ */
/* Upgrade purchases (pure, testable)                                  */
/* ------------------------------------------------------------------ */

export interface UpgradePurchaseResult {
  save: SaveData;
  ok: boolean;
}

/** Buys one level of an upgrade: cost comes from config, max level enforced. */
export function applyUpgradePurchase(save: SaveData, upgradeId: string): UpgradePurchaseResult {
  const def = UPGRADES.find((u) => u.id === upgradeId);
  if (!def) return { save, ok: false };
  const level = save.upgrades[upgradeId] ?? 0;
  if (level >= balance.maxUpgradeLevel) return { save, ok: false };
  const cost = upgradeCost(save.upgrades, def);
  if (save.coins < cost) return { save, ok: false };
  return {
    ok: true,
    save: {
      ...save,
      coins: save.coins - cost,
      upgrades: { ...save.upgrades, [upgradeId]: level + 1 },
    },
  };
}

/* ------------------------------------------------------------------ */
/* Replay-mode results (daily / endless) — never touch campaign records */
/* ------------------------------------------------------------------ */

const DAY_MS = 86_400_000;

function daysBetween(fromDate: string, toDate: string): number {
  return Math.round((Date.parse(toDate) - Date.parse(fromDate)) / DAY_MS);
}

export function applyModeResult(
  save: SaveData,
  levelId: string,
  result: LevelResultInput,
): ApplyLevelResultResult {
  const ref = parseModeLevelId(levelId);
  if (!ref) throw new Error(`applyModeResult: "${levelId}" is not a mode level`);

  const next: SaveData = {
    ...save,
    statistics: { ...save.statistics },
    modes: {
      daily: { ...save.modes.daily },
      endless: { ...save.modes.endless },
      weekly: { ...save.modes.weekly },
    },
  };
  accumulateRunStats(next.statistics, result);

  let xpGranted = 0;
  let coinsGranted = 0;
  if (ref.mode === 'daily') {
    const daily = next.modes.daily;
    if (daily.bestScoreDate !== ref.date) {
      daily.bestScoreDate = ref.date;
      daily.bestScoreToday = 0;
    }
    if (result.success) {
      daily.bestScoreToday = Math.max(daily.bestScoreToday, result.score);
      if (daily.lastWinDate !== ref.date) {
        const consecutive = daily.lastWinDate !== null && daysBetween(daily.lastWinDate, ref.date) === 1;
        daily.streak = consecutive ? daily.streak + 1 : 1;
        daily.lastWinDate = ref.date;
        daily.totalWins += 1;
        xpGranted = modeRewards.dailyXp;
        coinsGranted =
          modeRewards.dailyCoins +
          modeRewards.dailyStreakBonus * Math.min(daily.streak, modeRewards.dailyStreakCap);
      }
    }
  } else if (ref.mode === 'weekly') {
    const weekly = next.modes.weekly;
    if (weekly.bestWeek !== ref.week) {
      weekly.bestWeek = ref.week;
      weekly.bestScore = 0;
    }
    if (result.success) {
      weekly.bestScore = Math.max(weekly.bestScore, result.score);
      if (weekly.lastWinWeek !== ref.week) {
        weekly.lastWinWeek = ref.week;
        weekly.totalWins += 1;
        xpGranted = modeRewards.weeklyXp;
        coinsGranted = modeRewards.weeklyCoins;
      }
    }
  } else if (result.success) {
    const endless = next.modes.endless;
    endless.bestShift = Math.max(endless.bestShift, ref.shift);
    endless.bestTons = Math.max(endless.bestTons, result.tonsMoved);
    xpGranted = modeRewards.endlessXpPerShift;
    coinsGranted = modeRewards.endlessCoinsBase + ref.shift * modeRewards.endlessCoinsPerShift;
  }

  next.xp += xpGranted;
  next.coins += coinsGranted;
  return { save: next, rewarded: xpGranted > 0 || coinsGranted > 0, xpGranted, coinsGranted };
}
