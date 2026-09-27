/**
 * MINING FLOW — event engine.
 * Applies scripted events at their simulation time. Fully deterministic.
 */

import type { GameEvent, LevelConfig, SimState, TruckRuntime } from '@/types/game';
import { balance } from '../config/balance';
import { pushFeed } from './feed';

export function processEvents(state: SimState, level: LevelConfig): void {
  for (const event of level.events) {
    if (state.eventsFired.includes(event.id)) continue;
    if (event.timeSeconds > state.elapsed) continue;
    applyEvent(state, event);
    state.eventsFired.push(event.id);
  }
}

function applyEvent(state: SimState, event: GameEvent): void {
  switch (event.type) {
    case 'road-closure':
    case 'road-open':
    case 'shortcut-open': {
      const road = state.roads.find((r) => r.id === event.target);
      if (road) {
        road.closed = event.type === 'road-closure';
        pushFeed(state, event.message);
      }
      break;
    }
    case 'breakdown': {
      const truck = pickBreakdownTruck(state, event.target);
      if (truck) {
        truck.state = 'breakdown';
        truck.breakdownUntil =
          state.elapsed + (event.durationSeconds ?? balance.breakdownRecoverySeconds);
        state.stats.breakdowns += 1;
        pushFeed(state, event.message);
      }
      break;
    }
    case 'rain':
      // Speed effect is resolved via activeRainUntil during movement.
    case 'fuel-outage':
      // Refueling pause is resolved via fuelStationOpen in the truck engine.
      pushFeed(state, event.message);
      break;
    case 'target-increase':
      state.targetTons += event.amount ?? 0;
      pushFeed(state, event.message);
      break;
    case 'efficiency-drop': {
      const excavator = state.excavators.find((e) => e.id === event.target) ?? state.excavators[0];
      if (excavator) {
        excavator.efficiencyModifier = dropMagnitude(excavator);
        excavator.modifierUntil = state.elapsed + (event.durationSeconds ?? 30);
        pushFeed(state, event.message);
      }
      break;
    }
  }
}

/** Ends (seconds) of the most recent active rain event, 0 when dry. */
export function activeRainUntil(state: SimState, level: LevelConfig): number {
  let until = 0;
  for (const event of level.events) {
    if (event.type !== 'rain') continue;
    if (!state.eventsFired.includes(event.id)) continue;
    until = Math.max(until, event.timeSeconds + (event.durationSeconds ?? 0));
  }
  return until;
}

/** False while a fired fuel-outage event is still in effect. */
export function fuelStationOpen(state: SimState, level: LevelConfig): boolean {
  return !level.events.some(
    (event) =>
      event.type === 'fuel-outage' &&
      state.eventsFired.includes(event.id) &&
      state.elapsed < event.timeSeconds + (event.durationSeconds ?? 0),
  );
}

function pickBreakdownTruck(state: SimState, targetId?: string): TruckRuntime | undefined {
  if (targetId) {
    const truck = state.trucks.find((t) => t.id === targetId);
    return truck && truck.state !== 'breakdown' ? truck : undefined;
  }
  return state.trucks.find((t) => t.state !== 'breakdown');
}

/** Efficiency drop magnitude, softened by the excavator's condition stat. */
function dropMagnitude(excavator: { spec: { condition: number } }): number {
  return Math.max(
    0.5,
    1 - balance.efficiencyDropMagnitude * (100 / Math.max(1, excavator.spec.condition)),
  );
}