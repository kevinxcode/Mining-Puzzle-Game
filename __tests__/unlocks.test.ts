import { EQUIPMENT_CATALOG, isEquipmentUnlocked, unlockedTruckClasses } from '@/game/config/equipment';

const entry = (id: string) => EQUIPMENT_CATALOG.find((e) => e.id === id)!;

describe('equipment unlocks (readme §20, by campaign levels completed)', () => {
  test('starter equipment is available from the first level', () => {
    expect(isEquipmentUnlocked(entry('truck:Standard'), 0)).toBe(true);
    expect(isEquipmentUnlocked(entry('truck:Compact'), 0)).toBe(true);
  });

  test.each([
    ['truck:Heavy', 10],
    ['excavator:Heavy', 20],
    ['truck:Ultra', 40],
    ['excavator:Ultra', 50],
  ])('%s unlocks after %i campaign levels', (id, levels) => {
    expect(isEquipmentUnlocked(entry(id), levels - 1)).toBe(false);
    expect(isEquipmentUnlocked(entry(id), levels)).toBe(true);
  });

  test('unlockedTruckClasses lists only classes the player has earned', () => {
    expect(unlockedTruckClasses(0)).toEqual(['Compact', 'Standard']);
    expect(unlockedTruckClasses(60)).toEqual(['Compact', 'Standard', 'Heavy', 'Ultra']);
  });
});
