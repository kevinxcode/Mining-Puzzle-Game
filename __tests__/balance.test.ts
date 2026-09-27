/**
 * MINING FLOW — balance regression test.
 * Verifies every campaign level is completable by the default strategy
 * (trucks on their seeded routes) within the time limit.
 */

import { createSimState, startOperation, tick } from '@/game/engine/simulationEngine';
import { LEVELS } from '@/game/levels/levelFactory';

describe('balance', () => {
  test('all 60 levels are completable with the default strategy', () => {
    const failures: string[] = [];
    for (const level of LEVELS) {
      const state = createSimState(level);
      startOperation(state, level);
      let ticks = 0;
      while (state.status === 'running' && ticks < 8000) {
        tick(state, level, 0.1);
        ticks += 1;
      }
      if (state.status !== 'success') {
        const quotas = level.objectives
          .filter((o) => o.kind === 'deliver' && !o.bonus)
          .map(
            (o) =>
              `${o.materialId}: ${state.stats.tonsByMaterial[o.materialId ?? 'ore'].toFixed(0)}/${o.target}`,
          )
          .join(' ');
        failures.push(
          `${level.id} (${level.regionName}): ${state.status} at ${state.elapsed.toFixed(0)}s / ${level.timeLimit}s, tons ${state.stats.tonsMoved.toFixed(0)}/${level.targetTons} [${quotas}] breakdowns=${state.stats.breakdowns} jams=${state.stats.jamCount}`,
        );
      }
    }
    expect(failures).toEqual([]);
  });

  test('completions land inside the time limit with a sane margin', () => {
    for (const level of LEVELS) {
      const state = createSimState(level);
      startOperation(state, level);
      let ticks = 0;
      while (state.status === 'running' && ticks < 8000) {
        tick(state, level, 0.1);
        ticks += 1;
      }
      // A level that completes in under 40% of its limit is too easy;
      // over 100% would be a failure (covered above).
      if (state.status === 'success') {
        const used = state.elapsed / level.timeLimit;
        expect(used).toBeGreaterThan(0.35);
      }
    }
  });
});