/**
 * Replay modes built from campaign seeds:
 * - Daily Challenge: one deterministic level per calendar date (same for everyone).
 * - Endless Shift: shifts that keep raising the production target.
 * Both are resolvable through getLevelById, e.g. "daily-2026-09-28" or "endless-3@H"
 * (the optional "@X" suffix swaps every truck to an unlocked class the player chose).
 */

import type { LevelConfig, TruckClass } from '@/types/game';
import { buildLevel } from './levelFactory';
import { LEVEL_SEEDS, type LevelSeed, type SeedEventType } from './levelTable';

const CLASS_BY_LETTER: Record<string, TruckClass> = { C: 'Compact', S: 'Standard', H: 'Heavy', U: 'Ultra' };
const LETTER_BY_CLASS: Record<TruckClass, string> = { Compact: 'C', Standard: 'S', Heavy: 'H', Ultra: 'U' };

/** Campaign levels whose seeds the daily challenge draws from (mid-game variety). */
const DAILY_BASE_FIRST = 11;
const DAILY_BASE_LAST = 50;
const DAILY_TARGET_FACTORS = [0.85, 0.9, 0.95, 1];
const DAILY_EXTRA_EVENTS: (SeedEventType | null)[] = [null, 'breakdown', null, 'rain'];
/** From here on levels carry per-material quotas and are already tight — played as designed. */
const DAILY_QUOTA_LEVELS_FROM = 41;

/** Endless shifts all run on this campaign seed (two excavators, room for strategy). */
const ENDLESS_BASE_LEVEL = 20;
const ENDLESS_START_FACTOR = 0.8;
const ENDLESS_STEP = 0.07;

export type ModeLevelRef =
  | { mode: 'daily'; date: string; fleetClass: TruckClass | undefined }
  | { mode: 'endless'; shift: number; fleetClass: TruckClass | undefined };

export const dailyLevelId = (date: string): string => `daily-${date}`;
export const endlessLevelId = (shift: number): string => `endless-${shift}`;

/** "YYYY-MM-DD" for a local date. */
export function localDateKey(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function withFleetClass(levelId: string, fleetClass: TruckClass | undefined): string {
  return fleetClass ? `${levelId}@${LETTER_BY_CLASS[fleetClass]}` : levelId;
}

export function parseModeLevelId(id: string): ModeLevelRef | null {
  const match = id.match(/^(daily|endless)-([^@]+)(?:@([A-Z]))?$/);
  if (!match) return null;
  const [, mode, body, letter] = match;
  const fleetClass = letter ? CLASS_BY_LETTER[letter] : undefined;
  if (letter && !fleetClass) return null;
  if (mode === 'daily') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body) || Number.isNaN(Date.parse(body))) return null;
    return { mode, date: body, fleetClass };
  }
  const shift = Number(body);
  if (!Number.isInteger(shift) || shift < 1) return null;
  return { mode: 'endless', shift, fleetClass };
}

/** FNV-1a — stable across devices so every player gets the same daily. */
function hashString(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const roundTo10 = (n: number) => Math.max(10, Math.round(n / 10) * 10);

function swapFleet(fleet: string, fleetClass: TruckClass | undefined): string {
  if (!fleetClass) return fleet;
  return fleet.replace(/[CSHU](?=\d[a-z])/g, LETTER_BY_CLASS[fleetClass]);
}

export function buildDailyLevel(date: string, fleetClass?: TruckClass): LevelConfig {
  const hash = hashString(date);
  const baseNumber = DAILY_BASE_FIRST + (hash % (DAILY_BASE_LAST - DAILY_BASE_FIRST + 1));
  const base = LEVEL_SEEDS[baseNumber - 1];
  const variable = baseNumber < DAILY_QUOTA_LEVELS_FROM;
  const factor = variable ? DAILY_TARGET_FACTORS[(hash >>> 8) % DAILY_TARGET_FACTORS.length] : 1;
  const extra = variable ? DAILY_EXTRA_EVENTS[(hash >>> 16) % DAILY_EXTRA_EVENTS.length] : null;
  const events = [...(base.events ?? [])];
  if (extra && !events.includes(extra)) events.push(extra);
  const seed: LevelSeed = {
    ...base,
    target: roundTo10(base.target * factor),
    events,
    fleet: swapFleet(base.fleet, fleetClass),
    tutorial: false,
  };
  return buildLevel(baseNumber, seed, {
    id: withFleetClass(dailyLevelId(date), fleetClass),
    name: `Daily Challenge · ${date}`,
    rngSeed: hash,
  });
}

export function buildEndlessLevel(shift: number, fleetClass?: TruckClass): LevelConfig {
  const base = LEVEL_SEEDS[ENDLESS_BASE_LEVEL - 1];
  const events: SeedEventType[] = [];
  if (shift >= 3) events.push('rain');
  if (shift >= 5) events.push('breakdown');
  if (shift >= 7) events.push('closure');
  if (shift >= 9) events.push('target');
  const seed: LevelSeed = {
    ...base,
    target: roundTo10(base.target * (ENDLESS_START_FACTOR + ENDLESS_STEP * (shift - 1))),
    events,
    fleet: swapFleet(base.fleet, fleetClass),
    tutorial: false,
  };
  return buildLevel(ENDLESS_BASE_LEVEL, seed, {
    id: withFleetClass(endlessLevelId(shift), fleetClass),
    name: `Endless Shift ${shift}`,
    rngSeed: 10_000 + shift,
  });
}

export function resolveModeLevel(id: string): LevelConfig | undefined {
  const ref = parseModeLevelId(id);
  if (!ref) return undefined;
  return ref.mode === 'daily'
    ? buildDailyLevel(ref.date, ref.fleetClass)
    : buildEndlessLevel(ref.shift, ref.fleetClass);
}

/** Where the result screen's "Next" button goes for a finished run. */
export function nextRouteAfter(levelId: string, totalLevels: number): string {
  const ref = parseModeLevelId(levelId);
  if (!ref) return `/level/${Math.min(totalLevels, Number(levelId) + 1)}`;
  if (ref.mode === 'daily') return '/modes';
  return `/level/${withFleetClass(endlessLevelId(ref.shift + 1), ref.fleetClass)}`;
}
