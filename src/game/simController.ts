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

type Listener = () => void;

export class SimController {
  readonly level: LevelConfig;
  state: SimState;
  version = 0;

  private listeners = new Set<Listener>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastFrame = 0;
  private accumulator = 0;

  constructor(level: LevelConfig, upgrades: Record<string, number> = {}) {
    this.level = level;
    this.state = createSimState(level, upgrades);
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
      tick(this.state, this.level, balance.baseTickSeconds);
    }
    this.notify();
  }

  /* --- player-facing actions --- */

  start(): void {
    startOperation(this.state, this.level);
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
    const ok = assignTruckInEngine(this.state, this.level, truckId, excavatorId);
    this.notify();
    return ok;
  }

  setTruckRoute(truckId: string, routeId: string): boolean {
    const ok = setTruckRouteInEngine(this.state, this.level, truckId, routeId);
    this.notify();
    return ok;
  }

  sendToFuel(truckId: string): boolean {
    const ok = sendToFuelInEngine(this.state, this.level, truckId);
    this.notify();
    return ok;
  }

  /** Reset to planning (change strategy) with fresh state. */
  reset(upgrades: Record<string, number> = {}): void {
    this.pause();
    this.state = createSimState(this.level, upgrades);
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