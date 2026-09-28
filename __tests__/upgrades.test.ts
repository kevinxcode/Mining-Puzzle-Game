import { balance } from '@/game/config/balance';
import { UPGRADES, upgradeCost, upgradeEffectLabel } from '@/game/config/equipment';
import { createSimState } from '@/game/engine/simulationEngine';
import { getLevelByNumber } from '@/game/levels/levelFactory';
import { applyUpgradePurchase, createDefaultSave } from '@/state/save';

const speed = UPGRADES.find((u) => u.id === 'truck:speed')!;

describe('upgrade purchases', () => {
  test('deducts the configured cost once and raises the level by one', () => {
    const save = { ...createDefaultSave(), coins: 1000 };
    const cost = upgradeCost(save.upgrades, speed);
    const result = applyUpgradePurchase(save, speed.id);
    expect(result.ok).toBe(true);
    expect(result.save.coins).toBe(1000 - cost);
    expect(result.save.upgrades[speed.id]).toBe(1);
  });

  test('refuses when coins are short, leaving the save untouched', () => {
    const save = { ...createDefaultSave(), coins: 10 };
    const result = applyUpgradePurchase(save, speed.id);
    expect(result.ok).toBe(false);
    expect(result.save).toBe(save);
  });

  test('refuses past the max upgrade level (no coins lost)', () => {
    const save = {
      ...createDefaultSave(),
      coins: 1_000_000,
      upgrades: { [speed.id]: balance.maxUpgradeLevel },
    };
    const result = applyUpgradePurchase(save, speed.id);
    expect(result.ok).toBe(false);
    expect(result.save.coins).toBe(1_000_000);
  });

  test('refuses unknown upgrade ids', () => {
    const save = { ...createDefaultSave(), coins: 1000 };
    expect(applyUpgradePurchase(save, 'truck:jetpack').ok).toBe(false);
  });

  test('bought upgrades change the simulated truck stats', () => {
    const level = getLevelByNumber(1);
    const base = createSimState(level, {}).trucks[0].spec.speed;
    const boosted = createSimState(level, { [speed.id]: 2 }).trucks[0].spec.speed;
    expect(boosted).toBeCloseTo(base * (1 + 2 * speed.effectPerLevel));
  });
});

describe('upgrade effect labels', () => {
  const fuel = UPGRADES.find((u) => u.id === 'truck:fuelEfficiency')!;
  test('shows current and next effect as signed percentages', () => {
    expect(upgradeEffectLabel(speed, 0)).toBe('Now +0% · Next +6%');
    expect(upgradeEffectLabel(speed, 2)).toBe('Now +12% · Next +18%');
    expect(upgradeEffectLabel(fuel, 1)).toBe('Now −7% · Next −14%');
  });
  test('shows only the current effect when maxed', () => {
    expect(upgradeEffectLabel(speed, balance.maxUpgradeLevel)).toBe('Max +18%');
  });
});
