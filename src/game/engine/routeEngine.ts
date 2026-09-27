/**
 * MINING FLOW — route engine.
 * Pure helpers for paths, travel time, fuel burn and road occupancy.
 * No React or React Native imports — deterministic and unit-testable.
 */

import type { MapConfig, Road, SimState } from '@/types/game';
import { balance } from '../config/balance';

/** Physical road between two nodes in either direction (closed roads included). */
export function roadBetween(map: MapConfig, fromId: string, toId: string): Road | null {
  for (const road of map.roads) {
    if (road.from === fromId && road.to === toId) return road;
    if (!road.oneWay && road.from === toId && road.to === fromId) return road;
  }
  return null;
}

/** Drivable road between two nodes (skips closed roads, respects one-way). */
export function findRoad(map: MapConfig, fromId: string, toId: string): Road | null {
  for (const road of map.roads) {
    if (road.closed) continue;
    if (road.from === fromId && road.to === toId) return road;
    if (!road.oneWay && road.from === toId && road.to === fromId) return road;
  }
  return null;
}

/** Sum of physical road lengths along a node path. */
export function pathLength(map: MapConfig, nodePath: string[]): number {
  let total = 0;
  for (let i = 0; i < nodePath.length - 1; i += 1) {
    const road = roadBetween(map, nodePath[i], nodePath[i + 1]);
    if (road) total += road.length;
  }
  return total;
}

/** Effective speed factor for a road (speed limit, mud, rain). */
export function speedFactorFor(road: Road, rainUntil: number, elapsed: number): number {
  let factor = road.speedLimit;
  if (road.mud) factor *= balance.mudSpeedFactor;
  if (elapsed < rainUntil) factor *= balance.rainSpeedFactor;
  return factor;
}

/** Seconds needed to traverse a road at the given truck speed. */
export function roadTravelSeconds(
  road: Road,
  truckSpeed: number,
  rainUntil: number,
  elapsed: number,
): number {
  const factor = speedFactorFor(road, rainUntil, elapsed);
  const speed = Math.max(0.01, truckSpeed * factor);
  return road.length / speed;
}

/** Fuel burned to traverse a road at the given truck efficiency. */
export function roadFuelBurn(road: Road, truckFuelEfficiency: number): number {
  return road.length * truckFuelEfficiency * (road.mud ? balance.mudFuelFactor : 1);
}

/** Direction-independent key for a road segment (used for occupancy checks). */
export function segmentKey(fromId: string, toId: string): string {
  return fromId < toId ? `${fromId}|${toId}` : `${toId}|${fromId}`;
}

/**
 * True when another truck already occupies the given road segment
 * (used to block narrow roads and create queueing).
 */
export function isSegmentOccupied(
  state: SimState,
  map: MapConfig,
  fromId: string,
  toId: string,
  exceptTruckId: string,
): boolean {
  const key = segmentKey(fromId, toId);
  for (const truck of state.trucks) {
    if (truck.id === exceptTruckId) continue;
    if (truck.pathIndex >= truck.nodePath.length - 1) continue;
    const truckFrom = truck.nodePath[truck.pathIndex];
    const truckTo = truck.nodePath[truck.pathIndex + 1];
    if (segmentKey(truckFrom, truckTo) !== key) continue;
    if (truck.segmentProgress > 0) return true;
  }
  return false;
}

/**
 * Dijkstra shortest path by effective travel time (rain ignored — temporary).
 * Returns ordered node ids, or null when unreachable.
 */
export function shortestPath(map: MapConfig, fromId: string, toId: string): string[] | null {
  if (fromId === toId) return [fromId];
  const nodeIds = map.nodes.map((n) => n.id);
  const distances = new Map<string, number>();
  const previous = new Map<string, string>();
  const visited = new Set<string>();
  for (const id of nodeIds) distances.set(id, Infinity);
  distances.set(fromId, 0);

  for (;;) {
    let current: string | null = null;
    let best = Infinity;
    for (const id of nodeIds) {
      if (visited.has(id)) continue;
      const d = distances.get(id) ?? Infinity;
      if (d < best) {
        best = d;
        current = id;
      }
    }
    if (current === null || current === toId) break;
    visited.add(current);
    for (const road of map.roads) {
      if (road.closed) continue;
      let neighbor: string | null = null;
      if (road.from === current) neighbor = road.to;
      else if (!road.oneWay && road.to === current) neighbor = road.from;
      if (!neighbor) continue;
      const factor = road.speedLimit * (road.mud ? balance.mudSpeedFactor : 1);
      const weight = road.length / Math.max(0.01, factor);
      const candidate = (distances.get(current) ?? Infinity) + weight;
      if (candidate < (distances.get(neighbor) ?? Infinity)) {
        distances.set(neighbor, candidate);
        previous.set(neighbor, current);
      }
    }
  }

  if (!Number.isFinite(distances.get(toId) ?? Infinity)) return null;
  const path: string[] = [toId];
  let cursor = toId;
  while (cursor !== fromId) {
    const prev = previous.get(cursor);
    if (!prev) return null;
    path.unshift(prev);
    cursor = prev;
  }
  return path;
}