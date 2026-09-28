/**
 * Site HQ — facilities built with coins between levels. Bonuses apply to
 * rewards and hints only, never to the simulation, so runs stay replayable.
 */

export type FacilityId = 'workshop' | 'canteen' | 'weighbridge';

export interface Facility {
  id: FacilityId;
  name: string;
  description: string;
  /** Coin cost of each level (length = max level). */
  costs: readonly number[];
}

export const HQ_FACILITIES: readonly Facility[] = [
  { id: 'workshop', name: 'Workshop', description: 'Mechanics on call: +1 hint per mission per level.', costs: [200, 450, 800] },
  { id: 'canteen', name: 'Crew Canteen', description: 'Well-fed crews learn faster: +5% XP per level.', costs: [150, 350, 700] },
  { id: 'weighbridge', name: 'Weighbridge', description: 'Certified loads pay better: +5% coins per level.', costs: [250, 500, 900] },
];

export type HqState = Partial<Record<FacilityId, number>>;

export const facilityLevel = (hq: HqState, id: FacilityId): number => hq[id] ?? 0;

/** Cost of the next level, or null when maxed. */
export function nextFacilityCost(hq: HqState, facility: Facility): number | null {
  return facility.costs[facilityLevel(hq, facility.id)] ?? null;
}

export const hqExtraHints = (hq: HqState): number => facilityLevel(hq, 'workshop');
export const hqXpMultiplier = (hq: HqState): number => 1 + 0.05 * facilityLevel(hq, 'canteen');
export const hqCoinMultiplier = (hq: HqState): number => 1 + 0.05 * facilityLevel(hq, 'weighbridge');

export function migrateHq(data: unknown): HqState {
  const out: HqState = {};
  if (typeof data !== 'object' || data === null) return out;
  for (const f of HQ_FACILITIES) {
    const v = (data as Record<string, unknown>)[f.id];
    if (typeof v === 'number' && Number.isInteger(v) && v > 0) out[f.id] = Math.min(v, f.costs.length);
  }
  return out;
}
