import { buildShareText } from '@/game/share';
import { buildWeeklyLevel, isoWeekKey, parseModeLevelId, resolveLevel, weeklyLevelId, nextRouteAfter } from '@/game/levels/modeLevels';
import { applyModeResult, createDefaultSave } from '@/state/save';
import { modeRewards } from '@/game/config/rewards';
import { createSimState, startOperation, tick } from '@/game/engine/simulationEngine';

describe('share result text', () => {
  const base = { levelTitle: 'Level 12 · Ridge Mine', stars: 2, tons: 320, targetTons: 300, seconds: 222, efficiency: 92 };

  test('reads like a compact result card with star emoji', () => {
    const text = buildShareText({ ...base, success: true });
    expect(text).toContain('Mining Puzzle Game');
    expect(text).toContain('Level 12 · Ridge Mine');
    expect(text).toContain('⭐⭐☆');
    expect(text).toContain('320/300 t');
    expect(text).toContain('3:42');
    expect(text).toContain('92%');
  });

  test('a missed target is shared honestly', () => {
    const text = buildShareText({ ...base, success: false, stars: 0, tons: 250 });
    expect(text).toContain('☆☆☆');
    expect(text).toMatch(/missed/i);
  });
});

describe('weekly challenge', () => {
  test('ISO week keys', () => {
    expect(isoWeekKey(new Date(2026, 8, 28))).toBe('2026-W40');
    expect(isoWeekKey(new Date(2027, 0, 1))).toBe('2026-W53');
  });

  test('same week → same level; ids resolve and parse', () => {
    expect(buildWeeklyLevel('2026-W40')).toEqual(buildWeeklyLevel('2026-W40'));
    expect(resolveLevel(weeklyLevelId('2026-W40'))?.id).toBe('weekly-2026-W40');
    expect(parseModeLevelId('weekly-2026-W40@H')).toEqual({ mode: 'weekly', week: '2026-W40', fleetClass: 'Heavy' });
    expect(parseModeLevelId('weekly-2026-W99')).toBeNull();
    expect(nextRouteAfter('weekly-2026-W40', 60)).toBe('/modes');
  });

  test('half a year of weeklies is completable with the default strategy', () => {
    const failed: string[] = [];
    for (let w = 1; w <= 26; w += 1) {
      const key = `2026-W${String(w).padStart(2, '0')}`;
      const level = buildWeeklyLevel(key);
      const state = createSimState(level);
      startOperation(state, level);
      let ticks = 0;
      while (state.status === 'running' && ticks < 9000) {
        tick(state, level, 0.1);
        ticks += 1;
      }
      if (state.status !== 'success') failed.push(key);
    }
    expect(failed).toEqual([]);
  });

  const win = {
    success: true, stars: 3, elapsedSeconds: 300, score: 700, tonsMoved: 500, trips: 9, fuelUsed: 80,
    efficiency: 88, breakdowns: 0, productionRate: 300, playtimeSeconds: 300, xpGain: 0, coinsGain: 0,
  };

  test('the weekly reward is paid once per week and the best score is kept', () => {
    const first = applyModeResult(createDefaultSave(), 'weekly-2026-W40', win);
    expect(first.coinsGranted).toBe(modeRewards.weeklyCoins);
    const again = applyModeResult(first.save, 'weekly-2026-W40', { ...win, score: 900 });
    expect(again.coinsGranted).toBe(0);
    expect(again.save.modes.weekly.bestScore).toBe(900);
    const nextWeek = applyModeResult(again.save, 'weekly-2026-W41', win);
    expect(nextWeek.coinsGranted).toBe(modeRewards.weeklyCoins);
    expect(nextWeek.save.modes.weekly.bestScore).toBe(700);
  });
});
