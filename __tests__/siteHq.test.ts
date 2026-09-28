import { HQ_FACILITIES, hqCoinMultiplier, hqExtraHints, hqXpMultiplier, migrateHq, nextFacilityCost } from '@/game/config/siteHq';
import { applyHqBuild, applyLevelResult, createDefaultSave, migrateSave } from '@/state/save';

const win = {
  success: true, stars: 1, elapsedSeconds: 100, score: 500, tonsMoved: 1, trips: 1, fuelUsed: 1,
  efficiency: 1, breakdowns: 0, productionRate: 1, playtimeSeconds: 100, xpGain: 100, coinsGain: 100,
};

describe('Site HQ', () => {
  it('builds levels in order, paying each cost, up to max', () => {
    let save = { ...createDefaultSave(), coins: 5000 };
    const workshop = HQ_FACILITIES.find((f) => f.id === 'workshop')!;
    for (const cost of workshop.costs) {
      const before = save.coins;
      const r = applyHqBuild(save, 'workshop');
      expect(r.ok).toBe(true);
      expect(before - r.save.coins).toBe(cost);
      save = r.save;
    }
    expect(nextFacilityCost(save.hq, workshop)).toBeNull();
    expect(applyHqBuild(save, 'workshop').ok).toBe(false);
    expect(hqExtraHints(save.hq)).toBe(3);
  });

  it('refuses builds without enough coins', () => {
    expect(applyHqBuild(createDefaultSave(), 'canteen').ok).toBe(false);
  });

  it('boosts campaign XP and coins', () => {
    const save = { ...createDefaultSave(), hq: { canteen: 2, weighbridge: 1 } };
    expect(hqXpMultiplier(save.hq)).toBeCloseTo(1.1);
    expect(hqCoinMultiplier(save.hq)).toBeCloseTo(1.05);
    const r = applyLevelResult(save, '1', win);
    expect(r.xpGranted).toBe(110);
    expect(r.coinsGranted).toBe(105);
  });

  it('migrates bad data', () => {
    expect(migrateSave({}).hq).toEqual({});
    expect(migrateHq({ workshop: 9, canteen: -1, bogus: 2 })).toEqual({ workshop: 3 });
  });
});
