/**
 * Hint engine — reads the live simulation and suggests one concrete move.
 * Pure and deterministic; the UI can apply the suggested action in one tap.
 */

import type { LevelConfig, SimState, TruckRuntime } from '@/types/game';
import { roadBetween, roadTravelSeconds } from './routeEngine';
import { liveLevel } from './simulationEngine';

export const HINTS_PER_RUN = 3;
/** Refuel suggestion below this share of the tank. */
const LOW_FUEL = 0.25;
/** A route must be at least this much faster to be worth switching to. */
const ROUTE_GAIN = 0.15;

export type HintAction =
  | { kind: 'fuel'; truckId: string }
  | { kind: 'assign'; truckId: string; excavatorId: string }
  | { kind: 'route'; truckId: string; routeId: string };

export interface Hint {
  message: string;
  action?: HintAction;
}

const BUSY_STATES = new Set(['to-fuel', 'refueling', 'breakdown']);

function routeSeconds(level: LevelConfig, nodePath: string[], truck: TruckRuntime): number {
  let total = 0;
  for (let i = 0; i < nodePath.length - 1; i += 1) {
    const road = roadBetween(level.map, nodePath[i], nodePath[i + 1]);
    if (!road || road.closed) return Infinity;
    total += roadTravelSeconds(road, truck.spec.speed, 0, 0);
  }
  return total;
}

export function computeHint(state: SimState, baseLevel: LevelConfig): Hint {
  const level = liveLevel(state, baseLevel);
  const exName = (id: string) => state.excavators.find((e) => e.id === id)?.spec.name ?? id;

  // 1. Low fuel — only meaningful where a fuel station exists.
  if (level.map.nodes.some((n) => n.type === 'fuel')) {
    const low = state.trucks
      .filter((t) => !BUSY_STATES.has(t.state) && t.fuel / Math.max(1, t.fuelCapacity) < LOW_FUEL)
      .sort((a, b) => a.fuel / a.fuelCapacity - b.fuel / b.fuelCapacity)[0];
    if (low) {
      return {
        message: `${low.spec.name} is low on fuel (${Math.round((low.fuel / low.fuelCapacity) * 100)}%). Send it to refuel before it runs dry on the ramp.`,
        action: { kind: 'fuel', truckId: low.id },
      };
    }
  }

  // 2. Queue imbalance — a crowded loader while another has no trucks.
  if (state.excavators.length > 1) {
    const assigned = (exId: string) => state.trucks.filter((t) => t.assignedExcavatorId === exId);
    const crowded = [...state.excavators].sort((a, b) => b.queue.length - a.queue.length)[0];
    const idle = state.excavators.find(
      (e) => e.id !== crowded.id && assigned(e.id).length === 0 && !e.loadingTruckId,
    );
    if (crowded.queue.length >= 2 && idle) {
      const truckId = crowded.queue[crowded.queue.length - 1];
      const truck = state.trucks.find((t) => t.id === truckId)!;
      return {
        message: `${exName(crowded.id)} has ${crowded.queue.length} trucks waiting while ${exName(idle.id)} is idle. Move ${truck.spec.name} to ${exName(idle.id)}.`,
        action: { kind: 'assign', truckId, excavatorId: idle.id },
      };
    }
  }

  // 3. A clearly faster route for the same excavator.
  let best: { truck: TruckRuntime; routeId: string; routeName: string; gain: number } | null = null;
  for (const truck of state.trucks) {
    const excavator = state.excavators.find((e) => e.id === truck.assignedExcavatorId);
    const current = level.map.routes.find((r) => r.id === truck.routeId);
    if (!excavator || !current) continue;
    const currentSeconds = routeSeconds(level, current.nodePath, truck);
    for (const route of level.map.routes) {
      if (route.id === current.id || route.nodePath[0] !== excavator.spec.nodeId) continue;
      if (route.nodePath[route.nodePath.length - 1] !== current.nodePath[current.nodePath.length - 1]) continue;
      const seconds = routeSeconds(level, route.nodePath, truck);
      const gain = currentSeconds === Infinity ? 1 : (currentSeconds - seconds) / currentSeconds;
      if (seconds < Infinity && gain >= ROUTE_GAIN && (!best || gain > best.gain)) {
        best = { truck, routeId: route.id, routeName: route.name, gain };
      }
    }
  }
  if (best) {
    const closed = best.gain === 1;
    return {
      message: closed
        ? `${best.truck.spec.name}'s route is closed. Switch it to ${best.routeName}.`
        : `${best.routeName} is about ${Math.round(best.gain * 100)}% faster for ${best.truck.spec.name}. Try rerouting it.`,
      action: { kind: 'route', truckId: best.truck.id, routeId: best.routeId },
    };
  }

  // 4. Nothing obviously wrong.
  if (state.status === 'ready') {
    return { message: 'Your plan looks good. Press START to begin the shift.' };
  }
  const idleTrucks = state.trucks.filter((t) => t.state === 'idle').length;
  return {
    message:
      idleTrucks > 0
        ? 'Some trucks are idle — make sure every truck has an excavator and a route.'
        : 'Your fleet looks balanced. Speed up to 2x and watch the queue times.',
  };
}
