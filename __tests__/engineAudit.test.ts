/**
 * MINING FLOW — regression tests for engine audit fixes.
 */

import { balance } from '@/game/config/balance';
import { passSeconds, passesForTruck } from '@/game/engine/excavatorEngine';
import { roadBetween } from '@/game/engine/routeEngine';
import {
  createSimState,
  liveLevel,
  setTruckRoute,
  startOperation,
  tick,
} from '@/game/engine/simulationEngine';
import { getLevelByNumber } from '@/game/levels/levelFactory';

describe('engine audit fixes', () => {
  test('road closures in sim state affect routing (live road list)', () => {
    const level = getLevelByNumber(1);
    const state = createSimState(level);
    startOperation(state, level);
    const truck = state.trucks[0];
    const from = truck.nodePath[0];
    const to = truck.nodePath[1];
    const road = roadBetween(level.map, from, to)!;
    state.roads.find((r) => r.id === road.id)!.closed = true;
    expect(liveLevel(state, level).map.roads).toBe(state.roads);
    for (let i = 0; i < 50; i += 1) tick(state, level, 0.1);
    // The truck never advances along the closed segment.
    const onClosed =
      truck.nodePath[truck.pathIndex] === from && truck.nodePath[truck.pathIndex + 1] === to;
    if (onClosed) expect(truck.segmentProgress).toBe(0);
    expect(level.map.roads.find((r) => r.id === road.id)!.closed).toBeFalsy();
  });

  test('truck driving fuel is counted in fuelUsed', () => {
    const level = getLevelByNumber(1);
    const state = createSimState(level);
    startOperation(state, level);
    tick(state, level, 0.1);
    expect(state.trucks[0].state).toBe('driving-to-loader');
    expect(state.stats.fuelUsed).toBeGreaterThan(0);
  });

  test('tanks do not drain on maps without a fuel station (no forced breakdowns)', () => {
    const level = getLevelByNumber(4);
    expect(level.map.nodes.some((n) => n.type === 'fuel')).toBe(false);
    const state = createSimState(level);
    startOperation(state, level);
    while (state.status === 'running') tick(state, level, 0.1);
    expect(state.stats.breakdowns).toBe(0);
    expect(state.trucks[0].fuel).toBe(state.trucks[0].fuelCapacity);
  });

  test('loading uses ceil(capacity / bucket) passes', () => {
    expect(passesForTruck(40, 10)).toBe(4);
    expect(passesForTruck(32, 18)).toBe(2);
    const level = getLevelByNumber(1);
    const state = createSimState(level);
    startOperation(state, level);
    const truck = state.trucks[0];
    const excavator = state.excavators.find((e) => e.id === truck.assignedExcavatorId)!;
    let guard = 0;
    while (truck.state !== 'loading' && guard++ < 5000) tick(state, level, 0.1);
    const loads = new Set<number>();
    let loadTicks = 0;
    while (truck.state === 'loading' && guard++ < 10000) {
      tick(state, level, 0.1);
      loadTicks += 1;
      if (truck.state === 'loading') loads.add(truck.load);
    }
    const passes = passesForTruck(truck.spec.capacity, excavator.spec.bucketCapacity);
    // Load only changes in whole bucket steps.
    for (const l of loads) {
      expect(Math.abs(l / excavator.spec.bucketCapacity - Math.round(l / excavator.spec.bucketCapacity))).toBeLessThan(1e-6);
    }
    expect(loadTicks * 0.1).toBeCloseTo(passes * passSeconds(excavator), 0);
    expect(balance.passSwingSeconds).toBeGreaterThan(0);
  });

  test('excavator never loads a truck that is still en route to it', () => {
    const level = getLevelByNumber(1);
    const state = createSimState(level);
    startOperation(state, level);
    const truck = state.trucks[0];
    // Simulate a truck blocked mid-path (queueing on the road).
    truck.state = 'queueing';
    tick(state, level, 0.1);
    expect(truck.state).not.toBe('loading');
    expect(state.excavators[0].loadingTruckId).toBeNull();
  });

  test('waiting at the loader counts as queue time, not a traffic jam', () => {
    const level = getLevelByNumber(1);
    const state = createSimState(level);
    startOperation(state, level);
    const truck = state.trucks[0];
    let guard = 0;
    while (truck.state !== 'loading' && guard++ < 5000) tick(state, level, 0.1);
    // Detach from the excavator so it waits indefinitely at the loader node.
    state.excavators[0].loadingTruckId = null;
    truck.state = 'queueing';
    truck.assignedExcavatorId = 'none';
    for (let i = 0; i < 200; i += 1) tick(state, level, 0.1);
    expect(truck.queueTime).toBeGreaterThan(balance.jamQueueSeconds);
    expect(state.stats.jamCount).toBe(0);
  });

  test('setTruckRoute validates against the excavator loading node, not its id', () => {
    const base = getLevelByNumber(1);
    const exNode = base.excavators[0].nodeId;
    const level = {
      ...base,
      excavators: base.excavators.map((e) => ({ ...e, id: 'digger-1' })),
      trucks: base.trucks.map((t) => ({ ...t, assignedExcavatorId: 'digger-1' })),
    };
    const state = createSimState(level);
    const route = level.map.routes.find((r) => r.nodePath[0] === exNode && r.id !== state.trucks[0].routeId);
    expect(route).toBeDefined();
    if (!route) return;
    expect(setTruckRoute(state, level, state.trucks[0].id, route.id)).toBe(true);
  });
});

describe('fuel station outage event', () => {
  test('refueling pauses while the fuel station is unavailable, then resumes', () => {
    const base = getLevelByNumber(21);
    expect(base.map.nodes.some((n) => n.type === 'fuel')).toBe(true);
    const level = {
      ...base,
      events: [
        {
          id: 'outage',
          timeSeconds: 0,
          type: 'fuel-outage' as const,
          durationSeconds: 30,
          message: 'Fuel station unavailable for 30s.',
        },
      ],
    };
    const state = createSimState(level);
    startOperation(state, level);
    const truck = state.trucks[0];
    truck.state = 'refueling';
    truck.fuel = 10;
    for (let i = 0; i < 100; i += 1) tick(state, level, 0.1);
    expect(truck.state).toBe('refueling');
    expect(truck.fuel).toBe(10);
    for (let i = 0; i < 250; i += 1) tick(state, level, 0.1);
    expect(truck.fuel).toBeGreaterThan(10);
  });
});
