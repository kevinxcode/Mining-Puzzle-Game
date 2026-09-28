/**
 * Offline challenge codes — a run (level + ghost) packed into text that can be
 * pasted into any chat. The receiver never trusts the sender's score: the
 * ghost is replayed on the deterministic engine and scored locally.
 */

import { balance } from './config/balance';
import { UPGRADES } from './config/equipment';
import { resolveLevel } from './levels/modeLevels';
import { MAX_REPLAY_COMMANDS, simulateRunLog, type ReplayCommand, type RunLog } from './replay';
import { computeRewards, computeStars } from './scoring';

export const CHALLENGE_PREFIX = 'MPG1.';
const CODE_PATTERN = /MPG1\.([A-Za-z0-9_-]+)\.([0-9a-f]{8})/;
const MAX_NICKNAME = 20;
const MAX_ID = 40;

export interface Challenge {
  levelId: string;
  nickname: string;
  log: RunLog;
}

export type DecodeResult = { ok: true; challenge: Challenge } | { ok: false; error: string };

export interface ChallengeResult {
  success: boolean;
  stars: 0 | 1 | 2 | 3;
  score: number;
  tons: number;
  targetTons: number;
  seconds: number;
}

/* --- text encoding helpers (Hermes has btoa/atob but no Buffer) --- */

function toBase64Url(text: string): string {
  const binary = unescape(encodeURIComponent(text));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(data: string): string {
  const b64 = data.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  return decodeURIComponent(escape(atob(padded)));
}

/** FNV-1a 32-bit — detects typos and truncation, not a security measure. */
function checksum(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/* --- compact command form: [tick, kind, truckId?, target?] --- */

type Packed = [number, 's'] | [number, 'a' | 'r', string, string] | [number, 'f', string];

function pack(cmd: ReplayCommand): Packed {
  switch (cmd.kind) {
    case 'start':
      return [cmd.t, 's'];
    case 'assign':
      return [cmd.t, 'a', cmd.truckId, cmd.target];
    case 'route':
      return [cmd.t, 'r', cmd.truckId, cmd.target];
    case 'fuel':
      return [cmd.t, 'f', cmd.truckId];
  }
}

const isId = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= MAX_ID;

function unpack(raw: unknown, previousTick: number): ReplayCommand | null {
  if (!Array.isArray(raw)) return null;
  const [t, kind, truckId, target] = raw;
  if (typeof t !== 'number' || !Number.isInteger(t) || t < previousTick) return null;
  if (kind === 's' && raw.length === 2) return { t, kind: 'start' };
  if (kind === 'f' && raw.length === 3 && isId(truckId)) return { t, kind: 'fuel', truckId };
  if ((kind === 'a' || kind === 'r') && raw.length === 4 && isId(truckId) && isId(target)) {
    return { t, kind: kind === 'a' ? 'assign' : 'route', truckId, target };
  }
  return null;
}

/** Keeps only real upgrade ids, clamped to the legal level range. */
function sanitizeUpgrades(raw: unknown): Record<string, number> | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const out: Record<string, number> = {};
  for (const def of UPGRADES) {
    const v = (raw as Record<string, unknown>)[def.id];
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
      out[def.id] = Math.min(Math.floor(v), balance.maxUpgradeLevel);
    }
  }
  return out;
}

export function encodeChallenge(challenge: Challenge): string {
  const payload = JSON.stringify({
    v: 1,
    l: challenge.levelId,
    n: challenge.nickname.trim().slice(0, MAX_NICKNAME),
    u: challenge.log.upgrades,
    c: challenge.log.commands.slice(0, MAX_REPLAY_COMMANDS).map(pack),
  });
  const body = toBase64Url(payload);
  return `${CHALLENGE_PREFIX}${body}.${checksum(body)}`;
}

export function decodeChallenge(text: string): DecodeResult {
  // Chat apps wrap long lines and add text around the code.
  const match = text.replace(/\s+/g, '').match(CODE_PATTERN);
  if (!match) return { ok: false, error: 'No challenge code found. Paste the whole code starting with MPG1.' };
  const [, body, sum] = match;
  if (checksum(body) !== sum) return { ok: false, error: 'This code is incomplete or was changed. Ask for it again.' };

  let data: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(fromBase64Url(body));
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new Error('shape');
    data = parsed as Record<string, unknown>;
  } catch {
    return { ok: false, error: 'This code could not be read.' };
  }
  if (data.v !== 1) return { ok: false, error: 'This code was made by a newer version of the game. Please update.' };

  const levelId = data.l;
  if (!isId(levelId) || !resolveLevel(levelId)) return { ok: false, error: 'This code is for a level that does not exist.' };

  const upgrades = sanitizeUpgrades(data.u);
  if (!upgrades) return { ok: false, error: 'This code could not be read.' };

  const rawCommands = Array.isArray(data.c) ? data.c : null;
  if (!rawCommands || rawCommands.length === 0 || rawCommands.length > MAX_REPLAY_COMMANDS) {
    return { ok: false, error: 'This code does not contain a valid run.' };
  }
  const commands: ReplayCommand[] = [];
  for (const raw of rawCommands) {
    const cmd = unpack(raw, commands.length > 0 ? commands[commands.length - 1].t : 0);
    if (!cmd) return { ok: false, error: 'This code does not contain a valid run.' };
    commands.push(cmd);
  }

  const nickname = typeof data.n === 'string' && data.n.trim() ? data.n.trim().slice(0, MAX_NICKNAME) : 'Player';
  return { ok: true, challenge: { levelId, nickname, log: { upgrades, commands } } };
}

/** Replays the ghost and scores it with the same rules as a live mission. */
export function verifyChallenge(challenge: Challenge): ChallengeResult {
  const level = resolveLevel(challenge.levelId);
  if (!level) return { success: false, stars: 0, score: 0, tons: 0, targetTons: 0, seconds: 0 };
  const state = simulateRunLog(level, challenge.log);
  const success = state.status === 'success';
  const stars = success ? computeStars(state, level) : 0;
  return {
    success,
    stars,
    score: success && stars > 0 ? computeRewards(state, level, stars as 1 | 2 | 3).score : 0,
    tons: state.stats.tonsMoved,
    targetTons: state.targetTons,
    seconds: state.elapsed,
  };
}
