import { LIVERIES, liveryById, migrateCosmetics, isLiveryOwned, createDefaultCosmetics } from '@/game/config/liveries';
import { applyLiveryPurchase, applyLiverySelect, createDefaultSave, migrateSave } from '@/state/save';

describe('liveries', () => {
  it('ids are unique and standard is free', () => {
    expect(new Set(LIVERIES.map((l) => l.id)).size).toBe(LIVERIES.length);
    expect(liveryById('nope').id).toBe('standard');
    expect(isLiveryOwned(createDefaultCosmetics(), liveryById('standard'), 0)).toBe(true);
  });

  it('buys a livery once, deducting coins, then equips it', () => {
    const save = { ...createDefaultSave(), coins: 500 };
    const bought = applyLiveryPurchase(save, 'haul-yellow');
    expect(bought.ok).toBe(true);
    expect(bought.save.coins).toBe(350);
    expect(bought.save.cosmetics.owned).toContain('haul-yellow');
    expect(bought.save.cosmetics.livery).toBe('haul-yellow');
    expect(applyLiveryPurchase(bought.save, 'haul-yellow').ok).toBe(false);
  });

  it('refuses purchases without enough coins or for star liveries', () => {
    const save = { ...createDefaultSave(), coins: 100 };
    expect(applyLiveryPurchase(save, 'night-shift').ok).toBe(false);
    expect(applyLiveryPurchase({ ...save, coins: 9999 }, 'gold-crew').ok).toBe(false);
  });

  it('only equips owned liveries', () => {
    const save = createDefaultSave();
    expect(applyLiverySelect(save, 'night-shift').ok).toBe(false);
    const stars = { ...save, statistics: { ...save.statistics, threeStarLevels: 30 } };
    expect(applyLiverySelect(stars, 'gold-crew').save.cosmetics.livery).toBe('gold-crew');
  });

  it('migrates missing or bad cosmetics to defaults', () => {
    expect(migrateSave({}).cosmetics).toEqual(createDefaultCosmetics());
    expect(migrateCosmetics({ owned: ['haul-yellow', 'x', 'haul-yellow'], livery: 'bogus' })).toEqual({
      owned: ['haul-yellow'],
      livery: 'standard',
    });
  });
});
