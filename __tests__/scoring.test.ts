import {
  analyzeFailure,
  computeEfficiency,
  computeRewards,
  computeScore,
  computeStars,
} from '@/game/scoring';
import {
  createSimState,
  evaluateObjectives,
  startOperation,
  tick,
} from '@/game/engine/simulationEngine';
import { getLevelByNumber } from '@/game/levels/levelFactory';

function runToCompletion(
  state: ReturnType<typeof createSimState>,
  level: ReturnType<typeof getLevelByNumber>,
): void {
  startOperation(state, level);
  let ticks = 0;
  while (state.status === 'running' && ticks < 6000) {
    tick(state, level, 0.1);
    ticks += 1;
  }
}

describe('scoring', () => {
  test('stars calculated correctly on a successful run', () => {
    const level = getLevelByNumber(1);
    const state = createSimState(level);
    runToCompletion(state, level);
    expect(state.status).toBe('success');
    const stars = computeStars(state, level);
    expect(stars).toBeGreaterThanOrEqual(1);
    expect(stars).toBeLessThanOrEqual(3);
    // Level 1 completes well under its 2-star time.
    expect(stars).toBeGreaterThanOrEqual(2);
  });

  test('a slow completion caps at 1 star even when efficient', () => {
    const level = getLevelByNumber(1);
    const state = createSimState(level);
    runToCompletion(state, level);
    state.elapsed = (level.starThresholds.star2TimeSeconds ?? 0) + 10;
    expect(computeStars(state, level)).toBe(1);
  });

  test('three stars require meeting every efficiency criterion', () => {
    const level = getLevelByNumber(1);
    const state = createSimState(level);
    runToCompletion(state, level);
    // Force the idle criterion to fail → no 3 stars.
    const thresholds = level.starThresholds;
    if (thresholds.star3IdlePercent !== undefined) {
      const meetsStar2 = state.elapsed <= (thresholds.star2TimeSeconds ?? 0);
      const forced = { ...state };
      // Simulate a failing idle percent by extending idle time.
      forced.trucks = state.trucks.map((t) => ({ ...t, idleTime: t.idleTime + 9999 }));
      const stars = computeStars(forced, level);
      if (meetsStar2) expect(stars).toBeLessThan(3);
    }
  });

  test('score and rewards follow the configured formula', () => {
    const level = getLevelByNumber(1);
    const state = createSimState(level);
    runToCompletion(state, level);
    const stars = computeStars(state, level);
    const rewards = computeRewards(state, level, stars);
    expect(rewards.xp).toBeGreaterThanOrEqual(100);
    if (stars === 3) expect(rewards.xp).toBeGreaterThanOrEqual(150);
    expect(rewards.coins).toBe(level.unlockCoins + stars * 10);
    expect(computeScore(state, level)).toBeGreaterThan(0);
    expect(computeEfficiency(state)).toBeGreaterThanOrEqual(0);
    expect(computeEfficiency(state)).toBeLessThanOrEqual(100);
  });

  test('failure analysis returns a concrete issue and tip', () => {
    const level = getLevelByNumber(1);
    const state = createSimState(level);
    state.targetTons = 999999;
    runToCompletion(state, level);
    expect(state.status).toBe('failed');
    const outcome = evaluateObjectives(state, level);
    const analysis = analyzeFailure(state, level, outcome.failedObjectiveId);
    expect(analysis.issue.length).toBeGreaterThan(0);
    expect(analysis.tip.length).toBeGreaterThan(0);
  });
});