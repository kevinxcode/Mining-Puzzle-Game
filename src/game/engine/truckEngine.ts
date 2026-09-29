/**
 * MINING FLOW — truck engine.
 * Truck state machine: movement, queueing, loading hand-off, dumping,
 * fuel, refueling and breakdown recovery.
 * Pure simulation logic — no React imports.
 */

import type { LevelConfig, MapNode, SimState, TruckRuntime, TruckRuntimeState } from '@/types/game';
import { balance } from '../config/balance';
import {
  findRoad,
  isSegmentOccupied,
  pathLength,
  roadFuelBurn,
  shortestPath,
  speedFactorFor,
} from './routeEngine';
import { registerDump } from './productionEngine';
import { pushFeed } from './feed';
import { t, tx } from '@/i18n/core';
import { fuelStationOpen } from './eventEngine';

/** Per-truck flag for the current queue episode (module-scoped per runtime object). */
const jamFlagged = new WeakSet<TruckRuntime>();

export function updateTrucks(
  state: SimState,
  level: LevelConfig,
  dt: number,
  rainUntil: number,
): void {
  for (const truck of state.trucks) {
    updateTruck(state, level, truck, dt, rainUntil);
  }
}

function updateTruck(
  state: SimState,
  level: LevelConfig,
  truck: TruckRuntime,
  dt: number,
  rainUntil: number,
): void {
  if (truck.state === 'breakdown') {
    truck.idleTime += dt;
    if (state.elapsed >= truck.breakdownUntil) {
      recoverTruck(state, level, truck);
    }
    return;
  }

  switch (truck.state) {
    case 'idle':
      truck.idleTime += dt;
      break;
    case 'queueing':
      accumulateQueue(state, truck, dt);
      tryResumeTruck(state, level, truck);
      break;
    case 'driving-to-loader':
    case 'hauling':
    case 'to-fuel':
    case 'returning': {
      const result = advanceAlongPath(state, level, truck, dt, rainUntil);
      if (truck.fuel <= 0) {
        triggerBreakdown(state, truck);
        break;
      }
      if (result === 'arrived') {
        onNodeArrival(state, level, truck);
      } else if (result === 'blocked') {
        truck.state = 'queueing';
      }
      break;
    }
    case 'dumping': {
      const duration = dumpDuration(truck);
      truck.segmentProgress += dt / duration;
      if (truck.segmentProgress >= 1) {
        completeDumpAndContinue(state, level, truck);
      }
      break;
    }
    case 'loading':
      // Loading progress is driven by the excavator engine.
      break;
    case 'refueling': {
      // Trucks wait at the station while it is unavailable.
      if (!fuelStationOpen(state, level)) break;
      truck.fuel = Math.min(
        truck.fuelCapacity,
        truck.fuel + balance.refuelLitersPerSecond * dt,
      );
      if (truck.fuel >= truck.fuelCapacity - 1e-6) {
        if (truck.load > 0) {
          // Already loaded — head straight back to the dump.
          const route = level.map.routes.find((r) => r.id === truck.routeId);
          const dumpId = route ? route.nodePath[route.nodePath.length - 1] : null;
          const fromId = currentNodeId(truck);
          if (dumpId) {
            const path = shortestPath(level.map, fromId, dumpId);
            truck.nodePath = path && path.length > 1 ? path : [fromId];
            truck.pathIndex = 0;
            truck.segmentProgress = 0;
            truck.targetNodeId = dumpId;
            truck.state = 'hauling';
          } else {
            dispatchToLoader(state, level, truck);
          }
        } else {
          dispatchToLoader(state, level, truck);
        }
        pushFeed(state, t('game.feed.refueled', { truck: tx(truck.spec.name) }));
      }
      break;
    }
  }
}

function accumulateQueue(state: SimState, truck: TruckRuntime, dt: number): void {
  truck.queueTime += dt;
  truck.maxQueueTime = Math.max(truck.maxQueueTime, truck.queueTime);
  // Only road blockages are traffic jams — waiting at the loader is queue time.
  const onRoad = truck.pathIndex < truck.nodePath.length - 1;
  if (onRoad && truck.queueTime >= balance.jamQueueSeconds && !jamFlagged.has(truck)) {
    state.stats.jamCount += 1;
    pushFeed(state, t('game.feed.jam', { truck: tx(truck.spec.name) }));
    jamFlagged.add(truck);
  }
}

function dumpDuration(truck: TruckRuntime): number {
  return balance.dumpBaseSeconds + truck.load * balance.dumpSecondsPerTon;
}

type AdvanceResult = 'moving' | 'arrived' | 'blocked';

/** Move a truck along its node path for dt seconds. */
function advanceAlongPath(
  state: SimState,
  level: LevelConfig,
  truck: TruckRuntime,
  dt: number,
  rainUntil: number,
): AdvanceResult {
  const path = truck.nodePath;
  if (truck.pathIndex >= path.length - 1) return 'arrived';
  const fromId = path[truck.pathIndex];
  const toId = path[truck.pathIndex + 1];
  const road = findRoad(level.map, fromId, toId);

  if (!road) {
    // Route broken (closed or removed) — reroute from the current node.
    const targetId = path[path.length - 1];
    if (fromId === targetId) return 'arrived';
    const reroute = shortestPath(level.map, fromId, targetId);
    if (reroute && reroute.length > 1) {
      truck.nodePath = reroute;
      truck.pathIndex = 0;
      truck.segmentProgress = 0;
      pushFeed(state, t('game.feed.rerouting', { truck: tx(truck.spec.name) }));
      return 'moving';
    }
    return 'blocked';
  }

  if (
    road.narrow &&
    truck.segmentProgress === 0 &&
    isSegmentOccupied(state, level.map, fromId, toId, truck.id)
  ) {
    return 'blocked';
  }

  const factor = speedFactorFor(road, rainUntil, state.elapsed);
  const speed = Math.max(0.01, truck.spec.speed * factor);
  const travelSeconds = road.length / speed;
  const distance = speed * dt;
  const burnPerUnit = roadFuelBurn(road, truck.spec.fuelEfficiency) / Math.max(0.01, road.length);

  const burn = distance * burnPerUnit;
  state.stats.fuelUsed += burn;
  // Tanks only drain on maps with a fuel station (fuel is introduced with the
  // refueling station — otherwise trucks would inevitably run dry).
  if (level.map.nodes.some((n) => n.type === 'fuel')) {
    truck.fuel = Math.max(0, truck.fuel - burn);
  }
  truck.segmentProgress += dt / travelSeconds;

  if (truck.segmentProgress >= 1) {
    truck.segmentProgress = 0;
    truck.pathIndex += 1;
    if (truck.pathIndex >= path.length - 1) return 'arrived';
  }
  return 'moving';
}

function onNodeArrival(state: SimState, level: LevelConfig, truck: TruckRuntime): void {
  const nodeId = truck.nodePath[truck.pathIndex];
  const node = nodeById(level, nodeId);
  switch (truck.state) {
    case 'driving-to-loader':
    case 'returning':
      // Arrived at a loader — join the queue for pickup.
      truck.state = 'queueing';
      truck.targetNodeId = nodeId;
      truck.queueTime = 0;
      jamFlagged.delete(truck);
      break;
    case 'hauling':
      if (node?.type === 'dump') {
        truck.state = 'dumping';
        truck.segmentProgress = 0;
      } else {
        dispatchToLoader(state, level, truck);
      }
      break;
    case 'to-fuel':
      if (node?.type === 'fuel') {
        truck.state = 'refueling';
      } else {
        dispatchToLoader(state, level, truck);
      }
      break;
    default:
      break;
  }
}

/* ------------------------------------------------------------------ */
/* Transitions                                                         */
/* ------------------------------------------------------------------ */

/** Start hauling along the truck's assigned route (after loading completes). */
export function startHaul(state: SimState, level: LevelConfig, truck: TruckRuntime): void {
  const route = level.map.routes.find((r) => r.id === truck.routeId);
  const fromId = currentNodeId(truck);
  let path: string[] | null = null;
  let dumpId = route ? route.nodePath[route.nodePath.length - 1] : fromId;

  if (route && route.nodePath[0] === fromId) {
    path = [...route.nodePath];
  } else if (route) {
    // Truck was reassigned — drive from the current loader to the route's dump.
    path = shortestPath(level.map, fromId, dumpId);
  }
  if (!path || path.length === 0) path = [fromId];
  dumpId = path[path.length - 1];

  truck.nodePath = path;
  truck.pathIndex = 0;
  truck.segmentProgress = 0;
  truck.targetNodeId = dumpId;
  truck.state = path.length > 1 ? 'hauling' : 'dumping';
}

/** Send a truck to the loader queue (start, after refuel, or on reassignment). */
export function dispatchToLoader(
  state: SimState,
  level: LevelConfig,
  truck: TruckRuntime,
): void {
  const excavator = state.excavators.find((e) => e.id === truck.assignedExcavatorId);
  const loaderId = excavator?.spec.nodeId ?? currentNodeId(truck);
  const fromId = currentNodeId(truck);
  const path = shortestPath(level.map, fromId, loaderId);

  truck.nodePath = path && path.length > 0 ? path : [fromId];
  truck.pathIndex = 0;
  truck.segmentProgress = 0;
  truck.targetNodeId = loaderId;
  truck.queueTime = 0;
  truck.state = truck.nodePath.length > 1 ? 'driving-to-loader' : 'queueing';
}

function completeDumpAndContinue(
  state: SimState,
  level: LevelConfig,
  truck: TruckRuntime,
): void {
  const dumpId = truck.nodePath[truck.pathIndex];
  const result = registerDump(state, level, truck, dumpId);
  truck.load = 0;
  truck.trips += 1;
  state.stats.trips += 1;
  if (result.credited) truck.tonsHauled += result.tons;

  const fuelNode = level.map.nodes.find((n) => n.type === 'fuel');
  const need = roundTripFuelNeed(level, truck) * balance.refuelSafetyFactor;
  if (fuelNode && truck.fuel < need) {
    dispatchToFuel(state, level, truck);
    pushFeed(state, t('game.feed.lowFuel', { truck: tx(truck.spec.name) }));
    return;
  }
  dispatchToLoader(state, level, truck);
}

/** Send a truck to the fuel station (keeps its current load). */
export function dispatchToFuel(state: SimState, level: LevelConfig, truck: TruckRuntime): void {
  const fuelNode = level.map.nodes.find((n) => n.type === 'fuel');
  if (!fuelNode) return;
  const fromId = currentNodeId(truck);
  const path = shortestPath(level.map, fromId, fuelNode.id);
  truck.nodePath = path && path.length > 0 ? path : [fromId];
  truck.pathIndex = 0;
  truck.segmentProgress = 0;
  truck.targetNodeId = fuelNode.id;
  truck.state = truck.nodePath.length > 1 ? 'to-fuel' : 'refueling';
}

/** Fuel needed for a full haul + return round trip on the current route. */
export function roundTripFuelNeed(level: LevelConfig, truck: TruckRuntime): number {
  const route = level.map.routes.find((r) => r.id === truck.routeId);
  if (!route) return 0;
  const haul = pathLength(level.map, route.nodePath);
  const back = shortestPath(
    level.map,
    route.nodePath[route.nodePath.length - 1],
    route.nodePath[0],
  );
  const returnLen = back ? pathLength(level.map, back) : haul;
  return (haul + returnLen) * truck.spec.fuelEfficiency;
}

function triggerBreakdown(state: SimState, truck: TruckRuntime): void {
  const recovery = balance.breakdownRecoverySeconds * (100 / Math.max(1, truck.spec.condition));
  truck.state = 'breakdown';
  truck.breakdownUntil = state.elapsed + recovery;
  state.stats.breakdowns += 1;
  pushFeed(state, t('game.feed.outOfFuel', { truck: tx(truck.spec.name) }));
}

function recoverTruck(state: SimState, level: LevelConfig, truck: TruckRuntime): void {
  truck.fuel = Math.max(truck.fuel, truck.fuelCapacity * balance.towRefillFraction);
  if (truck.load >= truck.spec.capacity - 1e-6) {
    // Loaded — head straight to the dump.
    const dumpId = truck.nodePath[truck.nodePath.length - 1];
    const fromId = currentNodeId(truck);
    const path = shortestPath(level.map, fromId, dumpId);
    truck.nodePath = path && path.length > 1 ? path : [fromId];
    truck.pathIndex = 0;
    truck.segmentProgress = 0;
    truck.targetNodeId = dumpId;
    truck.state = 'hauling';
  } else {
    dispatchToLoader(state, level, truck);
  }
  pushFeed(state, t('game.feed.repaired', { truck: tx(truck.spec.name) }));
}

/** Resume a queued truck once its way is clear (narrow road or reopened road). */
function tryResumeTruck(state: SimState, level: LevelConfig, truck: TruckRuntime): void {
  const path = truck.nodePath;
  if (path.length === 0 || truck.pathIndex >= path.length - 1) return;
  const fromId = path[truck.pathIndex];
  const toId = path[truck.pathIndex + 1];
  const road = findRoad(level.map, fromId, toId);
  if (!road) return;
  if (
    road.narrow &&
    truck.segmentProgress === 0 &&
    isSegmentOccupied(state, level.map, fromId, toId, truck.id)
  ) {
    return;
  }
  const finalNode = nodeById(level, path[path.length - 1]);
  truck.state = resumeStateFor(finalNode);
  jamFlagged.delete(truck);
}

function resumeStateFor(node: MapNode | undefined): TruckRuntimeState {
  if (node?.type === 'dump') return 'hauling';
  if (node?.type === 'fuel') return 'to-fuel';
  return 'driving-to-loader';
}

/* ------------------------------------------------------------------ */
/* Public helpers                                                      */
/* ------------------------------------------------------------------ */

/** Node id the truck is currently at or travelling from. */
export function currentNodeId(truck: TruckRuntime): string {
  return truck.nodePath[Math.min(truck.pathIndex, truck.nodePath.length - 1)];
}

export function nodeById(level: LevelConfig, nodeId: string): MapNode | undefined {
  return level.map.nodes.find((n) => n.id === nodeId);
}