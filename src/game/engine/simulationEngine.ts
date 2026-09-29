/**
 * MINING FLOW — simulation engine.
 * Deterministic tick-based simulation, independent from React components.
 * Each tick updates: events, truck movement, loading, dumping, fuel,
 * queue, production and mission status.
 */

import type {
  ExcavatorRuntime,
  LevelConfig,
  SimState,
  SimStats,
  TruckRuntime,
  TruckSpec,
} from '@/types/game';
import { UPGRADES, upgradeStatMultiplier } from '../config/equipment';
import { activeRainUntil, processEvents } from './eventEngine';
import { pushFeed } from './feed';
import { t, tx } from '@/i18n/core';
import { updateExcavators } from './excavatorEngine';
import { dispatchToLoader, dispatchToFuel, updateTrucks } from './truckEngine';
import { shortestPath } from './routeEngine';

/* ------------------------------------------------------------------ */
/* State creation                                                      */
/* ------------------------------------------------------------------ */

export function createSimState(
  level: LevelConfig,
  upgrades: Record<string, number> = {},
): SimState {
  const mul = (upgradeId: string): number => {
    const def = UPGRADES.find((u) => u.id === upgradeId);
    return def ? upgradeStatMultiplier(upgrades, def) : 1;
  };

  const trucks: TruckRuntime[] = level.trucks.map((spec: TruckSpec) => ({
    id: spec.id,
    spec: {
      ...spec,
      capacity: spec.capacity * mul('truck:capacity'),
      speed: spec.speed * mul('truck:speed'),
      fuelEfficiency: spec.fuelEfficiency * mul('truck:fuelEfficiency'),
      condition: spec.condition * mul('truck:durability'),
    },
    state: 'idle',
    assignedExcavatorId: spec.assignedExcavatorId,
    routeId: spec.routeId,
    nodePath: [spec.startNodeId],
    pathIndex: 0,
    segmentProgress: 0,
    load: 0,
    fuel: spec.fuelCapacity,
    fuelCapacity: spec.fuelCapacity,
    queueTime: 0,
    maxQueueTime: 0,
    idleTime: 0,
    trips: 0,
    tonsHauled: 0,
    breakdownUntil: 0,
    targetNodeId: null,
  }));

  const excavators: ExcavatorRuntime[] = level.excavators.map((spec) => ({
    id: spec.id,
    spec: {
      ...spec,
      bucketCapacity: spec.bucketCapacity * mul('excavator:bucketCapacity'),
      loadingSpeed: spec.loadingSpeed * mul('excavator:loadingSpeed'),
      fuelEfficiency: spec.fuelEfficiency * mul('excavator:fuelEfficiency'),
      condition: spec.condition * mul('excavator:reliability'),
    },
    queue: [],
    loadingTruckId: null,
    efficiencyModifier: 1,
    modifierUntil: 0,
  }));

  const stats: SimStats = {
    tonsMoved: 0,
    tonsByMaterial: { ore: 0, overburden: 0, coal: 0, gravel: 0 },
    fuelUsed: 0,
    trips: 0,
    jamCount: 0,
    maxQueueTime: 0,
    avgProductionRate: 0,
    efficiency: 100,
    breakdowns: 0,
  };

  return {
    levelId: level.id,
    elapsed: 0,
    speed: 1,
    status: 'ready',
    targetTons: level.targetTons,
    trucks,
    excavators,
    roads: level.map.roads.map((road) => ({ ...road })),
    stats,
    eventsFired: [],
    eventFeed: [],
    rewarded: false,
  };
}

/* ------------------------------------------------------------------ */
/* Tick                                                                */
/* ------------------------------------------------------------------ */

/**
 * Level view whose map uses the live road list (closures/openings applied by
 * events live in state.roads, not in the static level config).
 */
export function liveLevel(state: SimState, level: LevelConfig): LevelConfig {
  if (level.map.roads === state.roads) return level;
  return { ...level, map: { ...level.map, roads: state.roads } };
}

export function tick(state: SimState, baseLevel: LevelConfig, dt: number): void {
  if (state.status !== 'running') return;
  const level = liveLevel(state, baseLevel);
  state.elapsed += dt;
  processEvents(state, level);
  const rainUntil = activeRainUntil(state, level);
  updateExcavators(state, level, dt);
  updateTrucks(state, level, dt, rainUntil);
  state.stats.maxQueueTime = Math.max(
    state.stats.maxQueueTime,
    ...state.trucks.map((t) => t.maxQueueTime),
  );
  state.stats.avgProductionRate =
    state.elapsed > 0 ? (state.stats.tonsMoved / state.elapsed) * 3600 : 0;
  checkOutcome(state, level);
}

function checkOutcome(state: SimState, level: LevelConfig): void {
  if (state.stats.tonsMoved >= state.targetTons) {
    const result = evaluateObjectives(state, level);
    finish(state, result);
    return;
  }
  if (state.elapsed >= level.timeLimit) {
    finish(state, { success: false, failedObjectiveId: 'obj-tons' });
  }
}

function finish(state: SimState, result: OutcomeResult): void {
  state.status = result.success ? 'success' : 'failed';
  pushFeed(
    state,
    result.success ? t('game.feed.shiftComplete') : t('game.feed.shiftFailed'),
  );
}

/* ------------------------------------------------------------------ */
/* Outcome evaluation                                                  */
/* ------------------------------------------------------------------ */

export interface OutcomeResult {
  success: boolean;
  failedObjectiveId: string | null;
}

export function fleetIdlePercent(state: SimState): number {
  const totalIdle = state.trucks.reduce((sum, t) => sum + t.idleTime, 0);
  const denominator = state.trucks.length * Math.max(0.01, state.elapsed);
  return (totalIdle / denominator) * 100;
}

/** Non-bonus objectives gate the mission; bonus objectives never fail it. */
export function evaluateObjectives(state: SimState, level: LevelConfig): OutcomeResult {
  const idlePercent = fleetIdlePercent(state);
  const usedTrucks = state.trucks.filter((t) => t.trips > 0).length;

  for (const objective of level.objectives) {
    if (objective.bonus) continue;
    switch (objective.kind) {
      case 'tons':
        if (state.stats.tonsMoved < (objective.target ?? state.targetTons)) {
          return { success: false, failedObjectiveId: objective.id };
        }
        break;
      case 'time':
        if (state.elapsed > (objective.target ?? level.timeLimit)) {
          return { success: false, failedObjectiveId: objective.id };
        }
        break;
      case 'idle':
        if (idlePercent > (objective.target ?? 100)) {
          return { success: false, failedObjectiveId: objective.id };
        }
        break;
      case 'fuel':
        if (state.stats.fuelUsed > (objective.target ?? Infinity)) {
          return { success: false, failedObjectiveId: objective.id };
        }
        break;
      case 'queue':
        if (state.stats.maxQueueTime > (objective.target ?? Infinity)) {
          return { success: false, failedObjectiveId: objective.id };
        }
        break;
      case 'deliver':
        if (
          objective.materialId &&
          state.stats.tonsByMaterial[objective.materialId] < (objective.target ?? 0)
        ) {
          return { success: false, failedObjectiveId: objective.id };
        }
        break;
      case 'no-jam':
        if (state.stats.jamCount > 0) {
          return { success: false, failedObjectiveId: objective.id };
        }
        break;
      case 'trucks':
        if (usedTrucks > (objective.target ?? state.trucks.length)) {
          return { success: false, failedObjectiveId: objective.id };
        }
        break;
    }
  }
  return { success: true, failedObjectiveId: null };
}

/* ------------------------------------------------------------------ */
/* Player actions                                                      */
/* ------------------------------------------------------------------ */

/** Start the operation — trucks leave the standby yard for their loaders. */
export function startOperation(state: SimState, baseLevel: LevelConfig): void {
  const level = liveLevel(state, baseLevel);
  if (state.status !== 'ready') return;
  state.status = 'running';
  for (const truck of state.trucks) {
    if (truck.state !== 'idle') continue;
    dispatchToLoader(state, level, truck);
  }
  pushFeed(state, t('game.feed.started'));
}

export function setPaused(state: SimState, paused: boolean): void {
  if (state.status === 'running' && paused) state.status = 'paused';
  else if (state.status === 'paused' && !paused) state.status = 'running';
}

export function setSpeed(state: SimState, speed: 1 | 2 | 3): void {
  state.speed = speed;
}

/** Reassign a truck to another excavator (returns false when invalid). */
export function assignTruck(
  state: SimState,
  baseLevel: LevelConfig,
  truckId: string,
  excavatorId: string,
): boolean {
  const level = liveLevel(state, baseLevel);
  const truck = state.trucks.find((t) => t.id === truckId);
  const excavator = state.excavators.find((e) => e.id === excavatorId);
  if (!truck || !excavator || truck.assignedExcavatorId === excavatorId) return false;

  truck.assignedExcavatorId = excavatorId;
  const route = level.map.routes.find((r) => r.nodePath[0] === excavator.spec.nodeId);
  if (route) truck.routeId = route.id;

  // Loaded trucks finish their haul to the matching stockpile; empty trucks
  // head straight to the new loader.
  if (
    truck.load <= 0 &&
    (truck.state === 'idle' ||
      truck.state === 'queueing' ||
      truck.state === 'driving-to-loader' ||
      truck.state === 'returning')
  ) {
    dispatchToLoader(state, level, truck);
  }
  pushFeed(state, t('game.feed.reassigned', { truck: tx(truck.spec.name), excavator: tx(excavator.spec.name) }));
  return true;
}

/** Change a truck's haul route (returns false when the route is invalid for it). */
export function setTruckRoute(
  state: SimState,
  baseLevel: LevelConfig,
  truckId: string,
  routeId: string,
): boolean {
  const level = liveLevel(state, baseLevel);
  const truck = state.trucks.find((t) => t.id === truckId);
  const route = level.map.routes.find((r) => r.id === routeId);
  if (!truck || !route) return false;
  // The route must start at the truck's assigned excavator's loading node.
  const excavator = state.excavators.find((e) => e.id === truck.assignedExcavatorId);
  if (!excavator || route.nodePath[0] !== excavator.spec.nodeId) return false;

  truck.routeId = routeId;

  // A loaded truck reroutes toward the route's dump from its current position.
  if (truck.load > 0 && truck.state !== 'dumping' && truck.state !== 'breakdown') {
    const dumpId = route.nodePath[route.nodePath.length - 1];
    const fromId = currentNodeIdOf(truck);
    const path = shortestPath(level.map, fromId, dumpId);
    if (path && path.length > 1) {
      truck.nodePath = path;
      truck.pathIndex = 0;
      truck.segmentProgress = 0;
      truck.targetNodeId = dumpId;
      truck.state = 'hauling';
    }
  }
  pushFeed(state, t('game.feed.rerouted', { truck: tx(truck.spec.name), route: tx(route.name) }));
  return true;
}

/** Send a truck to the fuel station (returns false when unavailable). */
export function sendToFuel(state: SimState, baseLevel: LevelConfig, truckId: string): boolean {
  const level = liveLevel(state, baseLevel);
  const truck = state.trucks.find((t) => t.id === truckId);
  if (!truck) return false;
  const fuelNode = level.map.nodes.find((n) => n.type === 'fuel');
  if (!fuelNode) return false;
  if (truck.state === 'refueling' || truck.state === 'breakdown') return false;

  dispatchToFuel(state, level, truck);
  pushFeed(state, t('game.feed.toFuel', { truck: tx(truck.spec.name) }));
  return true;
}

/** Reset to the planning phase (change strategy without leaving the level). */
export function resetToPlanning(
  state: SimState,
  level: LevelConfig,
  upgrades: Record<string, number> = {},
): void {
  const fresh = createSimState(level, upgrades);
  Object.assign(state, fresh);
}

function currentNodeIdOf(truck: TruckRuntime): string {
  return truck.nodePath[Math.min(truck.pathIndex, truck.nodePath.length - 1)];
}