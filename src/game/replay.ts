/**
 * Ghost replay — the engine is deterministic, so a run is fully described by
 * the player's commands and the sim tick each was issued on.
 */

import type { LevelConfig, SimState } from '@/types/game';
import { balance } from './config/balance';
import {
  assignTruck,
  createSimState,
  sendToFuel,
  setTruckRoute,
  startOperation,
  tick,
} from './engine/simulationEngine';

export type ReplayCommand =
  | { t: number; kind: 'start' }
  | { t: number; kind: 'assign'; truckId: string; target: string }
  | { t: number; kind: 'route'; truckId: string; target: string }
  | { t: number; kind: 'fuel'; truckId: string };

export interface RunLog {
  upgrades: Record<string, number>;
  commands: ReplayCommand[];
}

/** Longer logs are not stored (keeps saves small). */
export const MAX_REPLAY_COMMANDS = 300;
/** Safety stop for replays that never finish. */
const MAX_REPLAY_TICKS = 200_000;

export function applyCommand(state: SimState, level: LevelConfig, cmd: ReplayCommand): boolean {
  switch (cmd.kind) {
    case 'start':
      startOperation(state, level);
      return state.status === 'running';
    case 'assign':
      return assignTruck(state, level, cmd.truckId, cmd.target);
    case 'route':
      return setTruckRoute(state, level, cmd.truckId, cmd.target);
    case 'fuel':
      return sendToFuel(state, level, cmd.truckId);
  }
}

/** Applies every command due at tick `t`; returns the next command index. */
export function applyDue(state: SimState, level: LevelConfig, commands: readonly ReplayCommand[], from: number, t: number): number {
  let i = from;
  while (i < commands.length && commands[i].t <= t) {
    applyCommand(state, level, commands[i]);
    i += 1;
  }
  return i;
}

/** Runs a whole log headlessly and returns the final state. */
export function simulateRunLog(level: LevelConfig, log: RunLog): SimState {
  const state = createSimState(level, log.upgrades);
  let next = applyDue(state, level, log.commands, 0, 0);
  let t = 0;
  while ((state.status === 'running' || next < log.commands.length) && t < MAX_REPLAY_TICKS) {
    if (state.status === 'running') {
      tick(state, level, balance.baseTickSeconds);
      t += 1;
    } else if (state.status === 'ready') {
      // Planning commands issued before start share tick 0..t.
      t = Math.max(t, log.commands[next].t);
    } else {
      break;
    }
    next = applyDue(state, level, log.commands, next, t);
  }
  return state;
}

export function isRunLog(v: unknown): v is RunLog {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as RunLog;
  return (
    typeof r.upgrades === 'object' &&
    r.upgrades !== null &&
    Array.isArray(r.commands) &&
    r.commands.length <= MAX_REPLAY_COMMANDS &&
    r.commands.every((c) => typeof c === 'object' && c !== null && typeof c.t === 'number' && typeof c.kind === 'string')
  );
}
