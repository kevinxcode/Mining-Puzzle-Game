import { createSimState, startOperation, tick } from '@/game/engine/simulationEngine';
import {
  buildDailyLevel,
  buildEndlessLevel,
  dailyLevelId,
  endlessLevelId,
  nextRouteAfter,
  parseModeLevelId,
  resolveLevel,
} from '@/game/levels/modeLevels';
import type { LevelConfig } from '@/types/game';

function playDefault(level: LevelConfig): string {
  const state = createSimState(level);
  startOperation(state, level);
  let ticks = 0;
  while (state.status === 'running' && ticks < 9000) {
    tick(state, level, 0.1);
    ticks += 1;
  }
  return state.status;
}

function isoDay(offset: number): string {
  return new Date(Date.UTC(2026, 8, 28) + offset * 86_400_000).toISOString().slice(0, 10);
}

describe('daily challenge levels', () => {
  test('the same date always builds the same level', () => {
    expect(buildDailyLevel('2026-09-28')).toEqual(buildDailyLevel('2026-09-28'));
  });

  test('different dates build different levels', () => {
    const configs = new Set(
      Array.from({ length: 7 }, (_, i) => {
        const l = buildDailyLevel(isoDay(i));
        return `${l.regionId}|${l.targetTons}|${l.events.map((e) => e.type).join()}`;
      }),
    );
    expect(configs.size).toBeGreaterThan(3);
  });

  test('daily ids resolve through getLevelById', () => {
    const id = dailyLevelId('2026-09-28');
    expect(id).toBe('daily-2026-09-28');
    expect(resolveLevel(id)?.id).toBe(id);
  });

  test('three months of dailies is completable with the default strategy', () => {
    const failed = Array.from({ length: 90 }, (_, i) => isoDay(i)).filter(
      (d) => playDefault(buildDailyLevel(d)) !== 'success',
    );
    expect(failed).toEqual([]);
  });
});

describe('endless shift levels', () => {
  test('each shift demands more production than the last', () => {
    for (let n = 1; n < 10; n += 1) {
      expect(buildEndlessLevel(n + 1).targetTons).toBeGreaterThan(buildEndlessLevel(n).targetTons);
    }
  });

  test('the first five shifts are completable with the default strategy', () => {
    for (let n = 1; n <= 5; n += 1) {
      expect(`${n}:${playDefault(buildEndlessLevel(n))}`).toBe(`${n}:success`);
    }
  });

  test('endless ids resolve through getLevelById', () => {
    expect(resolveLevel(endlessLevelId(3))?.targetTons).toBe(buildEndlessLevel(3).targetTons);
  });
});

describe('mode fleet choice', () => {
  test('an @ suffix swaps every truck to the chosen class', () => {
    const level = resolveLevel(`${dailyLevelId('2026-09-28')}@H`)!;
    expect(level.trucks.every((t) => t.truckClass === 'Heavy')).toBe(true);
  });

  test('parses mode ids and rejects campaign or malformed ids', () => {
    expect(parseModeLevelId('endless-4@U')).toEqual({ mode: 'endless', shift: 4, fleetClass: 'Ultra' });
    expect(parseModeLevelId('daily-2026-09-28')).toEqual({ mode: 'daily', date: '2026-09-28', fleetClass: undefined });
    expect(parseModeLevelId('12')).toBeNull();
    expect(parseModeLevelId('daily-nope')).toBeNull();
    expect(parseModeLevelId('endless-0')).toBeNull();
    expect(resolveLevel('daily-2026-09-28@Z')).toBeUndefined();
  });
});

describe('next destination after a run', () => {
  test('campaign goes to the next level briefing, capped at the last level', () => {
    expect(nextRouteAfter('4', 60)).toBe('/level/5');
    expect(nextRouteAfter('60', 60)).toBe('/level/60');
  });
  test('endless continues with the next shift and keeps the fleet choice', () => {
    expect(nextRouteAfter('endless-3@H', 60)).toBe('/level/endless-4@H');
  });
  test('daily returns to the modes screen', () => {
    expect(nextRouteAfter('daily-2026-09-28', 60)).toBe('/modes');
  });
});
