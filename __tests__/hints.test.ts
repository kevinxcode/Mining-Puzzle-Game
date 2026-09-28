import { computeHint, HINTS_PER_RUN } from '@/game/engine/hintEngine';
import { createSimState, startOperation } from '@/game/engine/simulationEngine';
import { getLevelByNumber } from '@/game/levels/levelFactory';

describe('hint engine', () => {
  test('suggests refuelling a truck running low when a fuel station exists', () => {
    const level = getLevelByNumber(21);
    const state = createSimState(level);
    startOperation(state, level);
    const truck = state.trucks[0];
    truck.fuel = truck.fuelCapacity * 0.1;
    const hint = computeHint(state, level);
    expect(hint.action).toEqual({ kind: 'fuel', truckId: truck.id });
    expect(hint.message).toContain(truck.spec.name);
  });

  test('never suggests refuelling on maps without a fuel station', () => {
    const level = getLevelByNumber(1);
    const state = createSimState(level);
    startOperation(state, level);
    state.trucks[0].fuel = 1;
    expect(computeHint(state, level).action?.kind).not.toBe('fuel');
  });

  test('moves a queued truck from a crowded excavator to an idle one', () => {
    const level = getLevelByNumber(20);
    expect(level.excavators.length).toBeGreaterThan(1);
    const state = createSimState(level);
    startOperation(state, level);
    const [busy, idle] = state.excavators;
    for (const t of state.trucks) {
      t.assignedExcavatorId = busy.id;
      t.state = 'queueing';
    }
    busy.queue = state.trucks.map((t) => t.id);
    const hint = computeHint(state, level);
    expect(hint.action).toMatchObject({ kind: 'assign', excavatorId: idle.id });
    expect(busy.queue).toContain((hint.action as { truckId: string }).truckId);
  });

  test('suggests a clearly faster route for the same excavator', () => {
    const level = getLevelByNumber(11);
    const state = createSimState(level);
    startOperation(state, level);
    const hint = computeHint(state, level);
    if (hint.action?.kind === 'route') {
      const route = level.map.routes.find((r) => r.id === (hint.action as { routeId: string }).routeId)!;
      const truck = state.trucks.find((t) => t.id === (hint.action as { truckId: string }).truckId)!;
      expect(route.nodePath[0]).toBe(level.excavators.find((e) => e.id === truck.assignedExcavatorId)!.nodeId);
      expect(route.id).not.toBe(truck.routeId);
    }
    expect(hint.message.length).toBeGreaterThan(0);
  });

  test('level 1 tip: the default narrow road is slower than Ridge Express', () => {
    const level = getLevelByNumber(1);
    const state = createSimState(level);
    startOperation(state, level);
    expect(computeHint(state, level).action).toEqual({ kind: 'route', truckId: 'truck-1', routeId: 'route-b' });
  });

  test('falls back to a general tip with no action when nothing is wrong', () => {
    const level = getLevelByNumber(1);
    const state = createSimState(level);
    startOperation(state, level);
    state.trucks[0].routeId = 'route-b';
    const hint = computeHint(state, level);
    expect(hint.action).toBeUndefined();
    expect(hint.message.length).toBeGreaterThan(0);
  });

  test('offers a small, fixed number of hints per run', () => {
    expect(HINTS_PER_RUN).toBe(3);
  });
});

describe('hint fallback wording', () => {
  test('before START the plan tip does not call planned trucks "idle"', () => {
    const level = getLevelByNumber(1);
    const state = createSimState(level);
    state.trucks[0].routeId = 'route-b';
    const hint = computeHint(state, level);
    expect(hint.action).toBeUndefined();
    expect(hint.message).toMatch(/START/);
    expect(hint.message).not.toMatch(/idle/i);
  });
});
