/**
 * Cosmetic truck liveries — paint schemes bought with coins or earned with stars.
 * Purely visual: the simulation never reads them.
 */

export interface Livery {
  id: string;
  name: string;
  /** Cab paint. */
  cab: string;
  /** Dump-bed paint. */
  bed: string;
  /** Window glass. */
  glass: string;
  /** Coin price (0 = free). */
  cost: number;
  /** Alternatively unlocked by this many 3-star campaign levels. */
  unlockThreeStars?: number;
}

export const DEFAULT_LIVERY_ID = 'standard';

export const LIVERIES: readonly Livery[] = [
  { id: 'standard', name: 'Standard', cab: '#FFFFFF', bed: '#5B5F66', glass: '#4C8DD6', cost: 0 },
  { id: 'haul-yellow', name: 'Haul Yellow', cab: '#F5B82E', bed: '#6B5A3A', glass: '#3A4A5C', cost: 150 },
  { id: 'safety-orange', name: 'Safety Orange', cab: '#F27A1A', bed: '#4A4E55', glass: '#A9D4F5', cost: 250 },
  { id: 'night-shift', name: 'Night Shift', cab: '#2B3140', bed: '#161A22', glass: '#7DE0FF', cost: 400 },
  { id: 'rainforest', name: 'Rainforest', cab: '#2F8F5B', bed: '#3D4A3F', glass: '#CFEFDF', cost: 400 },
  { id: 'gold-crew', name: 'Gold Crew', cab: '#E3B341', bed: '#8A6A1F', glass: '#FFF4CC', cost: 0, unlockThreeStars: 30 },
];

export function liveryById(id: string | null | undefined): Livery {
  return LIVERIES.find((l) => l.id === id) ?? LIVERIES[0];
}

export interface CosmeticsState {
  /** Livery ids bought with coins (free / star liveries don't need an entry). */
  owned: string[];
  livery: string;
}

export function createDefaultCosmetics(): CosmeticsState {
  return { owned: [], livery: DEFAULT_LIVERY_ID };
}

export function migrateCosmetics(data: Partial<CosmeticsState> | undefined): CosmeticsState {
  const owned = Array.isArray(data?.owned)
    ? data!.owned.filter((id): id is string => typeof id === 'string' && LIVERIES.some((l) => l.id === id))
    : [];
  const livery = typeof data?.livery === 'string' && LIVERIES.some((l) => l.id === data.livery) ? data.livery : DEFAULT_LIVERY_ID;
  return { owned: [...new Set(owned)], livery };
}

/** True when the player may paint trucks with this livery. */
export function isLiveryOwned(cosmetics: CosmeticsState, livery: Livery, threeStarLevels: number): boolean {
  if (livery.unlockThreeStars !== undefined) return threeStarLevels >= livery.unlockThreeStars;
  return livery.cost === 0 || cosmetics.owned.includes(livery.id);
}
