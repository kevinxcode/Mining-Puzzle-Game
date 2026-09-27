/**
 * MINING FLOW — compact level seed table (60 levels / 6 regions).
 * Seeds are expanded into full LevelConfig objects by the level factory.
 * Tuning values (time, target, fleet) live here so balancing stays data-driven.
 */

import type { MaterialTypeId, ObjectiveKind, StarThresholds } from '@/types/game';
import type { MapTemplateId } from './maps';

export type SeedEventType = 'rain' | 'target' | 'closure' | 'breakdown' | 'outage';

export interface SeedObjective {
  kind: ObjectiveKind;
  target?: number;
  materialId?: MaterialTypeId;
  bonus?: boolean;
}

export interface LevelSeed {
  template: MapTemplateId;
  /** Mission time limit in seconds. */
  time: number;
  /** Production target in tons. */
  target: number;
  /** Fleet string, e.g. 'H1a,S2c' — Heavy truck on excavator 1 route a, Standard on excavator 2 route c. */
  fleet: string;
  materials?: MaterialTypeId[];
  events?: SeedEventType[];
  objectives?: SeedObjective[];
  stars?: Partial<StarThresholds>;
  tutorial?: boolean;
}

export const LEVEL_SEEDS: LevelSeed[] = [
  // Region 1 — Training Pit (1-10): teach assign, load, haul, return.
  { template: 'loop', time: 240, target: 64, fleet: 'S1a', tutorial: true },
  { template: 'loop', time: 260, target: 90, fleet: 'S1b' },
  { template: 'loop', time: 280, target: 120, fleet: 'S1a' },
  { template: 'loop', time: 340, target: 100, fleet: 'C1a' },
  { template: 'loop', time: 280, target: 200, fleet: 'S1a,S1b' },
  { template: 'loop', time: 320, target: 210, fleet: 'S1a,C1b' },
  { template: 'loop', time: 300, target: 240, fleet: 'S1b,S1a' },
  { template: 'loop', time: 340, target: 240, fleet: 'C1a,S1b' },
  { template: 'loop', time: 300, target: 260, fleet: 'S1a,S1b,C1a' },
  { template: 'loop', time: 320, target: 280, fleet: 'S1a,S1b,C1a' },
  // Region 2 — Ridge Mine (11-20): two excavators, capacities, route choices, intersections.
  { template: 'twin', time: 340, target: 160, fleet: 'S1a' },
  { template: 'twin', time: 340, target: 160, fleet: 'S2c' },
  { template: 'twin', time: 340, target: 280, fleet: 'S1a,S2c' },
  { template: 'twin', time: 340, target: 300, fleet: 'H1a,S2c' },
  { template: 'twin', time: 360, target: 320, fleet: 'H1b,S2d' },
  { template: 'twin', time: 340, target: 340, fleet: 'S1a,S1b,S2c' },
  { template: 'twin', time: 340, target: 360, fleet: 'H1a,H2c,S1b' },
  { template: 'twin', time: 340, target: 380, fleet: 'H1a,S2c,S2d' },
  { template: 'twin', time: 320, target: 400, fleet: 'H1a,H1b,S2c,S2d' },
  { template: 'twin', time: 320, target: 420, fleet: 'H1a,H2c,S1a,S2d' },
  // Region 3 — Canyon Site (21-30): fuel usage, refueling station, efficiency.
  { template: 'fuel', time: 380, target: 300, fleet: 'S1a,S2d' },
  { template: 'fuel', time: 380, target: 320, fleet: 'H1a,S2d' },
  { template: 'fuel', time: 360, target: 360, fleet: 'H1a,H2d', events: ['rain'] },
  { template: 'fuel', time: 360, target: 360, fleet: 'S1a,H1b,S2d' },
  { template: 'fuel', time: 380, target: 400, fleet: 'H1a,H2d,S1b' },
  { template: 'fuel', time: 420, target: 400, fleet: 'H1a,H2d', events: ['target'] },
  { template: 'fuel', time: 340, target: 440, fleet: 'H1b,H2d,S1a,S2c' },
  { template: 'fuel', time: 380, target: 460, fleet: 'H1a,H1b,H2d', events: ['rain'] },
  { template: 'fuel', time: 380, target: 480, fleet: 'H1a,H2d,S1a,S2c' },
  { template: 'fuel', time: 400, target: 500, fleet: 'H1a,H1b,H2d,S2c', events: ['rain', 'target', 'outage'] },
  // Region 4 — Dust Valley (31-40): closures, mud zones, narrow roads, breakdowns.
  { template: 'basin', time: 480, target: 340, fleet: 'S1a,S2c' },
  { template: 'basin', time: 470, target: 360, fleet: 'H1a,S2d' },
  { template: 'basin', time: 400, target: 380, fleet: 'S1a,S2c,S3e', events: ['breakdown'] },
  { template: 'basin', time: 440, target: 360, fleet: 'H1b,H2d', events: ['closure'] },
  { template: 'basin', time: 400, target: 420, fleet: 'H1a,S2c,S3f', events: ['breakdown'] },
  { template: 'basin', time: 420, target: 420, fleet: 'H1a,H2c,S3e', events: ['rain', 'closure'] },
  { template: 'basin', time: 400, target: 460, fleet: 'H1a,H1b,S2d,S3e', events: ['closure', 'breakdown'] },
  { template: 'basin', time: 400, target: 460, fleet: 'H1a,H2d,S3e,S3f', events: ['rain'] },
  { template: 'basin', time: 420, target: 500, fleet: 'H1a,H2c,H3e,S1a', events: ['closure', 'breakdown'] },
  { template: 'basin', time: 420, target: 520, fleet: 'H1a,H2d,H3f,S1b', events: ['rain', 'closure', 'breakdown'] },
  // Region 5 — Deep Basin (41-50): multiple materials, quotas, dynamic objectives.
  { template: 'basin', time: 480, target: 360, fleet: 'H1a,S2c' },
  { template: 'basin', time: 420, target: 380, fleet: 'H1a,H3e' },
  { template: 'basin', time: 400, target: 420, fleet: 'H1a,H2c,S3f', events: ['target'] },
  { template: 'basin', time: 400, target: 440, fleet: 'H1a,H2d,S3e' },
  { template: 'basin', time: 400, target: 480, fleet: 'H1a,H2c,H3f', events: ['rain'] },
  { template: 'basin', time: 420, target: 480, fleet: 'H1b,H2d,S3e', events: ['target'] },
  { template: 'basin', time: 400, target: 520, fleet: 'H1a,H2c,H3e,S1b' },
  { template: 'basin', time: 400, target: 520, fleet: 'H1a,H2d,H3f,S1a', events: ['rain'] },
  { template: 'basin', time: 420, target: 560, fleet: 'H1a,H1b,H2c,H3e', events: ['target', 'rain'] },
  { template: 'basin', time: 440, target: 580, fleet: 'H1a,H2d,H3e,S1a,S2c' },
  // Region 6 — Iron Frontier (51-60): everything combined, hardest challenges.
  { template: 'basin', time: 460, target: 460, fleet: 'H1a,H3e', events: ['rain', 'closure'] },
  { template: 'basin', time: 460, target: 480, fleet: 'H1a,H2c,S3f', events: ['breakdown'] },
  { template: 'basin', time: 460, target: 500, fleet: 'H1b,H2d,H3e', events: ['rain', 'target'] },
  { template: 'basin', time: 440, target: 500, fleet: 'H1a,H2c,H3f,S1a', events: ['closure'] },
  { template: 'basin', time: 460, target: 540, fleet: 'H1a,H2d,H3e,S1b', events: ['rain', 'closure', 'breakdown'] },
  { template: 'basin', time: 460, target: 540, fleet: 'H1b,H2c,H3f,S1a', events: ['target', 'outage'] },
  { template: 'basin', time: 460, target: 580, fleet: 'H1a,H2c,H3e,S1a,S2c', events: ['rain'] },
  { template: 'basin', time: 460, target: 580, fleet: 'H1a,H2d,H3f,S1b,S3e', events: ['closure', 'breakdown', 'outage'] },
  { template: 'basin', time: 480, target: 620, fleet: 'H1a,H1b,H2c,H3e,S2d', events: ['rain', 'target'] },
  { template: 'basin', time: 480, target: 640, fleet: 'H1a,H2d,H3e,S1a,S2c,S3f', events: ['rain', 'closure', 'breakdown', 'target'] },
];