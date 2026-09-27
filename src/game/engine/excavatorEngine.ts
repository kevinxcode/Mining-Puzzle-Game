/**
 * MINING FLOW — excavator engine.
 * Handles the loading queue and pass-based loading at each excavator.
 * Pure simulation logic — no React imports.
 */

import type { ExcavatorRuntime, LevelConfig, SimState } from '@/types/game';
import { balance } from '../config/balance';
import { dispatchToFuel, roundTripFuelNeed, startHaul } from './truckEngine';
import { pushFeed } from './feed';

export function updateExcavators(state: SimState, level: LevelConfig, dt: number): void {
  for (const excavator of state.excavators) {
    updateExcavator(state, level, excavator, dt);
  }
}

function updateExcavator(
  state: SimState,
  level: LevelConfig,
  excavator: ExcavatorRuntime,
  dt: number,
): void {
  // Expire timed efficiency modifiers (e.g. efficiency drop events).
  if (excavator.modifierUntil && state.elapsed >= excavator.modifierUntil) {
    excavator.efficiencyModifier = 1;
    excavator.modifierUntil = 0;
  }

  if (excavator.loadingTruckId) {
    const truck = state.trucks.find((t) => t.id === excavator.loadingTruckId);
    if (!truck || truck.state !== 'loading') {
      excavator.loadingTruckId = null;
      return;
    }
    // Pass-based loading: ceil(capacity / bucket) passes, each adding one
    // bucket (the last pass tops up the remainder).
    excavator.passProgress = (excavator.passProgress ?? 0) + dt / passSeconds(excavator);
    state.stats.fuelUsed += excavator.spec.fuelEfficiency * dt;
    while (excavator.passProgress >= 1 && truck.load < truck.spec.capacity - 1e-6) {
      excavator.passProgress -= 1;
      truck.load = Math.min(truck.spec.capacity, truck.load + excavator.spec.bucketCapacity);
    }
    if (truck.load >= truck.spec.capacity - 1e-6) {
      truck.load = truck.spec.capacity;
      excavator.loadingTruckId = null;
      excavator.passProgress = 0;
      // A loaded truck tops up fuel first when it could not finish a full
      // round trip — prevents running dry mid-haul.
      const fuelNode = level.map.nodes.find((n) => n.type === 'fuel');
      const need = roundTripFuelNeed(level, truck) * balance.refuelSafetyFactor;
      if (fuelNode && truck.fuel < need) {
        dispatchToFuel(state, level, truck);
        pushFeed(state, `${truck.spec.name} tops up fuel before hauling.`);
      } else {
        startHaul(state, level, truck);
        pushFeed(state, `${truck.spec.name} loaded — hauling to the stockpile.`);
      }
    }
    return;
  }

  // FIFO queue of trucks physically waiting at this excavator's node.
  const waiting = state.trucks.filter(
    (t) =>
      t.state === 'queueing' &&
      t.assignedExcavatorId === excavator.id &&
      t.pathIndex >= t.nodePath.length - 1 &&
      t.nodePath[t.nodePath.length - 1] === excavator.spec.nodeId,
  );
  const waitingIds = new Set(waiting.map((t) => t.id));
  excavator.queue = excavator.queue.filter((id) => waitingIds.has(id));
  for (const t of waiting) {
    if (!excavator.queue.includes(t.id)) excavator.queue.push(t.id);
  }
  const nextId = excavator.queue.shift();
  const next = waiting.find((t) => t.id === nextId);
  if (next) {
    next.state = 'loading';
    excavator.loadingTruckId = next.id;
    excavator.passProgress = 0;
  }
}

/** Seconds per bucket pass: fixed swing time plus bucket fill time. */
export function passSeconds(excavator: ExcavatorRuntime): number {
  const rate = Math.max(0.01, excavator.spec.loadingSpeed * excavator.efficiencyModifier);
  return balance.passSwingSeconds + excavator.spec.bucketCapacity / rate;
}

/** Number of bucket passes to fill a truck: ceil(capacity / bucket). */
export function passesForTruck(capacity: number, bucketCapacity: number): number {
  return Math.ceil(capacity / Math.max(0.01, bucketCapacity) - 1e-9);
}