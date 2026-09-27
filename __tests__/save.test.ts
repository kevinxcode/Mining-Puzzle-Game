import {
  SAVE_VERSION,
  SaveCorruptError,
  applyLevelResult,
  createDefaultSave,
  deserializeSave,
  playerLevelFromXp,
  serializeSave,
  xpProgress,
} from '@/state/save';

describe('save system', () => {
  test('round-trips through serialize/deserialize', () => {
    const save = createDefaultSave();
    save.xp = 450;
    save.coins = 120;
    save.levels['1'] = { stars: 3, bestTimeSeconds: 120, bestScore: 500 };
    save.upgrades['truck:speed'] = 2;
    save.achievements['first-load'] = 1;
    const restored = deserializeSave(serializeSave(save));
    expect(restored).toEqual(save);
  });

  test('throws on corrupted JSON', () => {
    expect(() => deserializeSave('not-json{')).toThrow(SaveCorruptError);
  });

  test('throws on invalid shape', () => {
    expect(() => deserializeSave('{"xp": "many"}')).toThrow(SaveCorruptError);
  });

  test('migrates older/partial saves to the current version', () => {
    const restored = deserializeSave('{"xp": 100}');
    expect(restored.version).toBe(SAVE_VERSION);
    expect(restored.coins).toBe(0);
    expect(restored.settings.sfx).toBe(true);
    expect(restored.statistics.levelsCompleted).toBe(0);
  });

  test('level rewards are only granted once for the same record', () => {
    let save = createDefaultSave();
    const result = {
      success: true,
      stars: 2,
      elapsedSeconds: 200,
      score: 400,
      tonsMoved: 120,
      trips: 4,
      fuelUsed: 30,
      efficiency: 80,
      breakdowns: 0,
      productionRate: 200,
      playtimeSeconds: 200,
      xpGain: 100,
      coinsGain: 60,
    };

    const first = applyLevelResult(save, '1', result);
    expect(first.rewarded).toBe(true);
    save = first.save;
    expect(save.xp).toBe(100);
    expect(save.coins).toBe(60);

    // Same-or-worse replay: no new rewards.
    const second = applyLevelResult(save, '1', { ...result, stars: 2, score: 300 });
    expect(second.rewarded).toBe(false);
    expect(second.save.xp).toBe(100);
    expect(second.save.coins).toBe(60);

    // Higher score, same stars: still no new rewards (no replay farming).
    const higherScore = applyLevelResult(save, '1', { ...result, score: 900 });
    expect(higherScore.rewarded).toBe(false);
    expect(higherScore.save.xp).toBe(100);
    expect(higherScore.save.coins).toBe(60);

    // More stars: only the difference over what was already paid is granted.
    const third = applyLevelResult(save, '1', { ...result, stars: 3, score: 500, xpGain: 150, coinsGain: 80 });
    expect(third.rewarded).toBe(true);
    expect(third.xpGranted).toBe(50);
    expect(third.coinsGranted).toBe(20);
    expect(third.save.xp).toBe(150);
    expect(third.save.coins).toBe(80);

    // Replaying the 3-star run again pays nothing.
    const fourth = applyLevelResult(third.save, '1', { ...result, stars: 3, score: 500, xpGain: 150, coinsGain: 80 });
    expect(fourth.rewarded).toBe(false);
    expect(fourth.save.xp).toBe(150);
  });

  test('old saves without earned totals are not paid twice for the same stars', () => {
    const save = createDefaultSave();
    save.levels['1'] = { stars: 2, bestTimeSeconds: 200, bestScore: 400 };
    const replay = applyLevelResult(save, '1', {
      success: true, stars: 2, elapsedSeconds: 190, score: 450, tonsMoved: 0, trips: 0,
      fuelUsed: 0, efficiency: 80, breakdowns: 0, productionRate: 0, playtimeSeconds: 0,
      xpGain: 100, coinsGain: 60,
    });
    expect(replay.rewarded).toBe(false);
    expect(replay.save.xp).toBe(0);
  });

  test('player level derives from XP', () => {
    expect(playerLevelFromXp(0)).toBe(1);
    // Level 2 requires 100 * 1 * 2 / 2 = 100 XP.
    expect(playerLevelFromXp(99)).toBe(1);
    expect(playerLevelFromXp(100)).toBe(2);
    const progress = xpProgress(150);
    expect(progress.level).toBe(2);
    expect(progress.currentLevelXp).toBe(100);
    expect(progress.nextLevelXp).toBe(300);
  });
});