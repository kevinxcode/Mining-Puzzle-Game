import { applyModeResult, createDefaultSave, migrateSave, applyLevelResult, SAVE_VERSION } from '@/state/save';
import { modeRewards } from '@/game/config/rewards';

const run = (success: boolean, tons = 300, score = 400) => ({
  success, stars: success ? 2 : 0, elapsedSeconds: 200, score, tonsMoved: tons, trips: 5, fuelUsed: 40,
  efficiency: 80, breakdowns: 0, productionRate: 200, playtimeSeconds: 200, xpGain: 999, coinsGain: 999,
});

describe('daily challenge bookkeeping', () => {
  test('first win of the day pays the daily reward and starts a streak', () => {
    const r = applyModeResult(createDefaultSave(), 'daily-2026-09-28', run(true));
    expect(r.coinsGranted).toBe(modeRewards.dailyCoins + modeRewards.dailyStreakBonus);
    expect(r.save.modes.daily.streak).toBe(1);
    expect(r.save.modes.daily.lastWinDate).toBe('2026-09-28');
  });

  test('a second win on the same day pays nothing but keeps the best score', () => {
    const first = applyModeResult(createDefaultSave(), 'daily-2026-09-28', run(true, 300, 400)).save;
    const again = applyModeResult(first, 'daily-2026-09-28@H', run(true, 320, 600));
    expect(again.coinsGranted).toBe(0);
    expect(again.xpGranted).toBe(0);
    expect(again.save.coins).toBe(first.coins);
    expect(again.save.modes.daily.bestScoreToday).toBe(600);
  });

  test('consecutive days grow the streak; a missed day resets it', () => {
    let save = applyModeResult(createDefaultSave(), 'daily-2026-09-28', run(true)).save;
    save = applyModeResult(save, 'daily-2026-09-29', run(true)).save;
    expect(save.modes.daily.streak).toBe(2);
    save = applyModeResult(save, 'daily-2026-10-02', run(true)).save;
    expect(save.modes.daily.streak).toBe(1);
  });

  test('a failed daily pays nothing and does not touch the streak', () => {
    const r = applyModeResult(createDefaultSave(), 'daily-2026-09-28', run(false));
    expect(r.coinsGranted).toBe(0);
    expect(r.save.modes.daily.streak).toBe(0);
  });
});

describe('endless shift bookkeeping', () => {
  test('clearing a shift pays per-shift coins and records the best shift', () => {
    const r = applyModeResult(createDefaultSave(), 'endless-3', run(true, 420));
    expect(r.coinsGranted).toBe(modeRewards.endlessCoinsBase + 3 * modeRewards.endlessCoinsPerShift);
    expect(r.save.modes.endless.bestShift).toBe(3);
    expect(r.save.modes.endless.bestTons).toBe(420);
  });

  test('best shift never goes down and failures pay nothing', () => {
    const high = applyModeResult(createDefaultSave(), 'endless-5', run(true)).save;
    const fail = applyModeResult(high, 'endless-2', run(false));
    expect(fail.coinsGranted).toBe(0);
    expect(fail.save.modes.endless.bestShift).toBe(5);
  });
});

describe('mode runs stay out of the campaign', () => {
  test('mode results never create campaign level records or unlock progress', () => {
    const r = applyModeResult(createDefaultSave(), 'daily-2026-09-28', run(true));
    expect(r.save.levels).toEqual({});
    expect(r.save.statistics.levelsCompleted).toBe(0);
    expect(r.save.statistics.totalTonsMoved).toBe(300);
  });

  test('applyLevelResult refuses mode ids (use applyModeResult)', () => {
    expect(() => applyLevelResult(createDefaultSave(), 'endless-1', run(true))).toThrow();
  });
});

describe('save migration', () => {
  test('older saves gain empty mode progress', () => {
    const migrated = migrateSave({ version: 2, xp: 50 } as never);
    expect(migrated.version).toBe(SAVE_VERSION);
    expect(migrated.modes.daily.streak).toBe(0);
    expect(migrated.modes.endless.bestShift).toBe(0);
  });
});
