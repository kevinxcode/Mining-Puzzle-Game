/**
 * MINING FLOW — material catalog.
 */

import type { MaterialType, MaterialTypeId } from '@/types/game';
import { colors } from '@/theme/tokens';

const materialDefs: MaterialType[] = [
  { id: 'ore', name: 'Ore', color: colors.ore },
  { id: 'overburden', name: 'Overburden', color: colors.overburden },
  { id: 'coal', name: 'Coal', color: colors.coal },
  { id: 'gravel', name: 'Gravel', color: colors.gravel },
];

export const MATERIAL_LIST: MaterialType[] = materialDefs;

export const MATERIALS: Record<MaterialTypeId, MaterialType> = {
  ore: materialDefs[0],
  overburden: materialDefs[1],
  coal: materialDefs[2],
  gravel: materialDefs[3],
};

export function getMaterial(id: MaterialTypeId | undefined): MaterialType | undefined {
  return id ? MATERIALS[id] : undefined;
}