import {
  createSimState,
  evaluateObjectives,
  setTruckRoute,
  startOperation,
  tick,
} from '@/game/engine/simulationEngine';
import { getLevelByNumber } from '@/game/levels/levelFactory';

type SimStateForTests = ReturnType<typeof createSimState>;
type LevelForTests = ReturnType<typeof getLevelByNumber>;

function runUntil(
  state: SimStateForTests,
  level: LevelForTests,
  condition: (s: SimStateForTests) => boolean,
  maxSeconds = 600,
): number {
  let elapsed = 0;
  while (!condition(state) && elapsed < maxSeconds) {
    tick(state, level, 0.1);
    elapsed += 0.1;
  }
  return elapsed;
}

describe('simulation engine', () => {
  test('truck completes a full load-haul-dump-return cycle', () => {
    const level = getLevelByNumber(1);
    const state = createSimState(level);
    expect(state.status).toBe('ready');
    startOperation(state, level);
    expect(state.status).toBe('running');
    expect(state.trucks[0].state).toBe('driving-to-loader');

    runUntil(state, level, (s) => s.trucks[0].state === 'loading');
    expect(state.trucks[0].state).toBe('loading');

    runUntil(state, level, (s) => s.trucks[0].state === 'hauling');
    expect(state.trucks[0].load).toBeGreaterThan(0);

    runUntil(state, level, (s) => s.stats.tonsMoved > 0);
    expect(state.stats.tonsMoved).toBeGreaterThan(0);
    expect(state.trucks[0].trips).toBe(1);
    expect(state.stats.trips).toBe(1);

    // The cycle continues — the truck heads back toward the loader.
    runUntil(state, level, (s) => s.trucks[0].state === 'queueing');
    expect(['queueing', 'driving-to-loader', 'loading']).toContain(state.trucks[0].state);
  });

  test('production reaches the target and the mission completes', () => {
    const level = getLevelByNumber(1);
    const state = createSimState(level);
    startOperation(state, level);
    runUntil(state, level, (s) => s.status !== 'running', 600);
    expect(state.status).toBe('success');
    expect(state.stats.tonsMoved).toBeGreaterThanOrEqual(state.targetTons);
    expect(state.elapsed).toBeLessThan(level.timeLimit);
  });

  test('fuel decreases during hauling and trucks refuel when low', () => {
    const level = getLevelByNumber(21);
    const state = createSimState(level);
    startOperation(state, level);
    const fuelAtStart = state.trucks[0].fuel;
    runUntil(state, level, (s) => s.trucks[0].state === 'hauling');
    expect(state.trucks[0].fuel).toBeLessThan(fuelAtStart);

    runUntil(
      state,
      level,
      (s) => s.trucks.some((t) => t.state === 'to-fuel' || t.state === 'refueling'),
      900,
    );
    expect(state.trucks.some((t) => t.state === 'to-fuel' || t.state === 'refueling')).toBe(true);
  });

  test('multiple trucks queue at a single excavator', () => {
    const level = getLevelByNumber(9);
    const state = createSimState(level);
    startOperation(state, level);
    runUntil(state, level, (s) => s.trucks.some((t) => t.state === 'queueing'), 400);
    expect(state.trucks.some((t) => t.state === 'queueing')).toBe(true);
  });

  test('excavator cannot load two trucks simultaneously', () => {
    const level = getLevelByNumber(9);
    const state = createSimState(level);
    startOperation(state, level);
    runUntil(state, level, (s) => s.excavators[0].loadingTruckId !== null, 400);
    tick(state, level, 0.5);
    const loadingTrucks = state.trucks.filter((t) => t.state === 'loading');
    expect(loadingTrucks.length).toBeLessThanOrEqual(1);
  });

  test('a truck cannot use a route that belongs to another excavator', () => {
    const level = getLevelByNumber(13);
    const state = createSimState(level);
    startOperation(state, level);
    const ok = setTruckRoute(state, level, 'truck-1', 'route-c');
    expect(ok).toBe(false);
    expect(state.trucks[0].routeId).toBe('route-a');
  });

  test('mission failure is detected when the target is unreachable', () => {
    const level = getLevelByNumber(1);
    const state = createSimState(level);
    state.targetTons = 999999;
    startOperation(state, level);
    let elapsed = 0;
    while (state.status === 'running' && elapsed < level.timeLimit + 60) {
      tick(state, level, 0.5);
      elapsed += 0.5;
    }
    expect(state.status).toBe('failed');
    expect(state.stats.tonsMoved).toBeLessThan(state.targetTons);
    // Objective gating: a fresh state that has not reached the target must
    // fail evaluation (the raised target above is a time-limit scenario).
    const fresh = createSimState(level);
    expect(evaluateObjectives(fresh, level).success).toBe(false);
  });

  test('road closure events close roads and reopen them', () => {
    const level = getLevelByNumber(34);
    const state = createSimState(level);
    startOperation(state, level);
    const closure = level.events.find((e) => e.type === 'road-closure');
    expect(closure).toBeDefined();
    let elapsed = 0;
    while (state.elapsed < (closure?.timeSeconds ?? 0) + 5 && elapsed < 2000) {
      tick(state, level, 0.1);
      elapsed += 0.1;
    }
    const road = state.roads.find((r) => r.id === closure?.target);
    expect(road?.closed).toBe(true);

    const reopen = level.events.find(
      (e) => e.type === 'road-open' && e.target === closure?.target,
    );
    if (reopen) {
      while (state.elapsed < reopen.timeSeconds + 5 && elapsed < 4000) {
        tick(state, level, 0.1);
        elapsed += 0.1;
      }
      expect(road?.closed).toBe(false);
    }
  });

  test('breakdown events stop a truck and count breakdowns', () => {
    const level = getLevelByNumber(33);
    const state = createSimState(level);
    startOperation(state, level);
    const event = level.events.find((e) => e.type === 'breakdown');
    expect(event).toBeDefined();
    let elapsed = 0;
    while (state.elapsed < (event?.timeSeconds ?? 0) + 2 && elapsed < 2000) {
      tick(state, level, 0.1);
      elapsed += 0.1;
    }
    expect(state.stats.breakdowns).toBeGreaterThanOrEqual(1);
    expect(state.trucks.some((t) => t.state === 'breakdown')).toBe(true);
  });

  test('simulation speed never changes the outcome', () => {
    const level = getLevelByNumber(1);
    const normal = createSimState(level);
    const fast = createSimState(level);
    startOperation(normal, level);
    startOperation(fast, level);

    let normalTicks = 0;
    while (normal.status === 'running' && normalTicks < 6000) {
      tick(normal, level, 0.1);
      normalTicks += 1;
    }

    // "3x" runs three identical 0.1s sub-ticks per frame — the same tick
    // sequence, only faster in wall time. The completion check happens every
    // 3 ticks, so the count may overshoot by up to 2 no-op ticks.
    let fastTicks = 0;
    while (fast.status === 'running' && fastTicks < 6000) {
      tick(fast, level, 0.1);
      tick(fast, level, 0.1);
      tick(fast, level, 0.1);
      fastTicks += 3;
    }

    expect(fastTicks).toBe(Math.ceil(normalTicks / 3) * 3);
    expect(fast.status).toBe('success');
    expect(fast.stats.tonsMoved).toBe(normal.stats.tonsMoved);
    expect(fast.stats.fuelUsed).toBe(normal.stats.fuelUsed);
    expect(fast.stats.trips).toBe(normal.stats.trips);
    expect(fast.trucks.map((t) => t.trips)).toEqual(normal.trucks.map((t) => t.trips));
  });
});