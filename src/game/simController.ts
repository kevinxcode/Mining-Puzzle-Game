/**
 * MINING FLOW — simulation controller.
 * Owns the SimState, runs the fixed-step loop outside React and notifies
 * subscribers (useSyncExternalStore) on every frame.
 * Changing simulation speed never changes the simulation outcome:
 * every frame runs integer sub-ticks of the same base step.
 */

import type { LevelConfig, SimState } from '@/types/game';
import { balance } from './config/balance';
import {
  assignTruck as assignTruckInEngine,
  createSimState,
  resetToPlanning,
  sendToFuel as sendToFuelInEngine,
  setPaused,
  setSpeed as setSpeedInEngine,
  setTruckRoute as setTruckRouteInEngine,
  startOperation,
  tick,
} from './engine/simulationEngine';
import { MAX_REPLAY_COMMANDS, applyDue, type ReplayCommand, type RunLog } from './replay';

type Listener = () => void;

/** A truck's assignment before a player move — what undo restores. */
interface UndoStep {
  truckId: string;
  excavatorId: string;
  routeId: string;
}

const MAX_UNDO = 5;

export class SimController {
  readonly level: LevelConfig;
  state: SimState;
  version = 0;

  private listeners = new Set<Listener>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastFrame = 0;
  private accumulator = 0;
  private history: UndoStep[] = [];
  /** Sim ticks run since start — the timestamp for recorded commands. */
  private tickIndex = 0;
  private commands: ReplayCommand[] = [];
  private upgrades: Record<string, number>;
  /** When set, the controller plays this log back and ignores player input. */
  readonly ghost: RunLog | null;
  private ghostNext = 0;

  constructor(level: LevelConfig, upgrades: Record<string, number> = {}, ghost: RunLog | null = null) {
    this.level = level;
    this.ghost = ghost;
    this.upgrades = ghost ? ghost.upgrades : upgrades;
    this.state = createSimState(level, this.upgrades);
    if (ghost) this.ghostNext = applyDue(this.state, level, ghost.commands, 0, 0);
  }

  /** The commands of the current run, replayable with simulateRunLog. */
  runLog(): RunLog {
    return { upgrades: { ...this.upgrades }, commands: this.commands.slice(0, MAX_REPLAY_COMMANDS) };
  }

  private record(cmd: ReplayCommand): void {
    if (!this.ghost) this.commands.push(cmd);
  }

  /** Runs exactly one fixed sub-tick (plus any ghost commands due). */
  stepOnce(): void {
    tick(this.state, this.level, balance.baseTickSeconds);
    this.tickIndex += 1;
    if (this.ghost) this.ghostNext = applyDue(this.state, this.level, this.ghost.commands, this.ghostNext, this.tickIndex);
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private notify(): void {
    this.version += 1;
    for (const listener of this.listeners) {
      listener();
    }
  }

  /** Start (or resume) the fixed-step loop. */
  play(): void {
    if (this.timer) return;
    this.lastFrame = Date.now();
    this.timer = setInterval(() => this.frame(), balance.simIntervalMs);
    this.notify();
  }

  pause(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    setPaused(this.state, true);
    this.notify();
  }

  /** Frame: runs `speed` fixed sub-ticks of baseTickSeconds — speed-invariant. */
  private frame(): void {
    const now = Date.now();
    const elapsedReal = Math.min(2, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    this.accumulator += elapsedReal * this.state.speed;
    let steps = Math.floor(this.accumulator / balance.baseTickSeconds);
    this.accumulator -= steps * balance.baseTickSeconds;
    steps = Math.min(steps, 40);
    for (let i = 0; i < steps; i += 1) {
      if (this.state.status !== 'running') {
        this.accumulator = 0;
        break;
      }
      this.stepOnce();
    }
    // A finished mission needs no more frames (the result screen is static).
    if ((this.state.status === 'success' || this.state.status === 'failed') && this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.notify();
  }

  /* --- player-facing actions --- */

  start(): void {
    if (this.ghost) {
      // Planning + start were already applied from the log at tick 0.
      this.ghostNext = applyDue(this.state, this.level, this.ghost.commands, this.ghostNext, this.tickIndex);
    } else {
      startOperation(this.state, this.level);
      if (this.state.status === 'running') this.record({ t: this.tickIndex, kind: 'start' });
    }
    if (this.state.status === 'running') this.play();
    this.notify();
  }

  setSpeed(speed: 1 | 2 | 3): void {
    setSpeedInEngine(this.state, speed);
    this.notify();
  }

  togglePause(): void {
    if (this.state.status === 'running') {
      this.pause();
    } else if (this.state.status === 'paused') {
      setPaused(this.state, false);
      this.play();
    }
  }

  assignTruck(truckId: string, excavatorId: string): boolean {
    if (this.ghost) return false;
    const step = this.snapshot(truckId);
    const ok = assignTruckInEngine(this.state, this.level, truckId, excavatorId);
    if (ok) this.record({ t: this.tickIndex, kind: 'assign', truckId, target: excavatorId });
    if (ok && step) this.remember(step);
    this.notify();
    return ok;
  }

  setTruckRoute(truckId: string, routeId: string): boolean {
    if (this.ghost) return false;
    const step = this.snapshot(truckId);
    const ok = setTruckRouteInEngine(this.state, this.level, truckId, routeId);
    if (ok) this.record({ t: this.tickIndex, kind: 'route', truckId, target: routeId });
    if (ok && step) this.remember(step);
    this.notify();
    return ok;
  }

  get canUndo(): boolean {
    return this.history.length > 0;
  }

  /** Reverts the last successful reassign/reroute. */
  undo(): boolean {
    const step = this.history.pop();
    if (!step) return false;
    const truck = this.state.trucks.find((t) => t.id === step.truckId);
    if (!truck) return false;
    if (truck.assignedExcavatorId !== step.excavatorId) {
      if (assignTruckInEngine(this.state, this.level, step.truckId, step.excavatorId))
        this.record({ t: this.tickIndex, kind: 'assign', truckId: step.truckId, target: step.excavatorId });
    }
    if (truck.routeId !== step.routeId) {
      if (setTruckRouteInEngine(this.state, this.level, step.truckId, step.routeId))
        this.record({ t: this.tickIndex, kind: 'route', truckId: step.truckId, target: step.routeId });
    }
    this.notify();
    return true;
  }

  private snapshot(truckId: string): UndoStep | null {
    const truck = this.state.trucks.find((t) => t.id === truckId);
    return truck ? { truckId, excavatorId: truck.assignedExcavatorId, routeId: truck.routeId } : null;
  }

  private remember(step: UndoStep): void {
    this.history.push(step);
    if (this.history.length > MAX_UNDO) this.history.shift();
  }

  sendToFuel(truckId: string): boolean {
    if (this.ghost) return false;
    const ok = sendToFuelInEngine(this.state, this.level, truckId);
    if (ok) this.record({ t: this.tickIndex, kind: 'fuel', truckId });
    this.notify();
    return ok;
  }

  /** Reset to planning (change strategy) with fresh state. */
  reset(upgrades: Record<string, number> = {}): void {
    this.pause();
    if (!this.ghost) this.upgrades = upgrades;
    this.state = createSimState(this.level, this.upgrades);
    this.history = [];
    this.commands = [];
    this.tickIndex = 0;
    this.ghostNext = this.ghost ? applyDue(this.state, this.level, this.ghost.commands, 0, 0) : 0;
    // A replay's start command runs at tick 0, so it needs the loop right away.
    if (this.ghost && this.state.status === 'running') this.play();
    this.notify();
  }

  markRewarded(): void {
    this.state.rewarded = true;
    this.notify();
  }

  dispose(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.listeners.clear();
  }
}