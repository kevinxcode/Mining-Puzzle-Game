/**
 * MINING FLOW — level factory.
 * Expands compact level seeds into full, data-driven LevelConfig objects.
 * Adding level 61 later only requires a new seed entry — no logic changes.
 */

import type {
  ExcavatorSpec,
  GameEvent,
  LevelConfig,
  LevelObjective,
  MapConfig,
  MaterialTypeId,
  ObjectiveKind,
  StarThresholds,
  TruckClass,
  TruckSpec,
} from '@/types/game';
import { colors } from '@/theme/tokens';
import { formatClock } from '@/utils/format';
import { EXCAVATOR_CLASSES, TRUCK_CLASSES, type ExcavatorClass } from '../config/equipment';
import { MATERIALS } from '../config/materials';
import { balance } from '../config/balance';
import { pathLength, shortestPath } from '../engine/routeEngine';
import {
  TEMPLATE_CLOSURE_CANDIDATES,
  buildMap,
  type MapTemplateId,
} from './maps';
import { LEVEL_SEEDS, type LevelSeed } from './levelTable';

export interface RegionDef {
  id: number;
  name: string;
  accent: string;
  startLevel: number;
  endLevel: number;
  tagline: string;
}

export const REGIONS: RegionDef[] = [
  { id: 1, name: 'Training Pit', accent: colors.success, startLevel: 1, endLevel: 10, tagline: 'Learn the haul cycle' },
  { id: 2, name: 'Ridge Mine', accent: colors.secondary, startLevel: 11, endLevel: 20, tagline: 'Two faces, cross traffic' },
  { id: 3, name: 'Canyon Site', accent: colors.info, startLevel: 21, endLevel: 30, tagline: 'Fuel discipline begins' },
  { id: 4, name: 'Dust Valley', accent: colors.warning, startLevel: 31, endLevel: 40, tagline: 'Mud, closures, breakdowns' },
  { id: 5, name: 'Deep Basin', accent: colors.ore, startLevel: 41, endLevel: 50, tagline: 'Mixed cargo and quotas' },
  { id: 6, name: 'Iron Frontier', accent: colors.primary, startLevel: 51, endLevel: 60, tagline: 'The master shift' },
];

const LEVEL_NAMES: string[][] = [
  ['First Shift', 'Warmup Run', 'Loose Gravel', 'Pit Start', 'Dusty Miles', 'Steady Hands', 'Full Buckets', 'Longer Loops', 'Traffic Sense', 'Shift Boss'],
  ['Ridge Line', 'Twin Faces', 'Split Loads', 'Heavy Metal', 'Center Cut', 'Cross Traffic', 'Passing Lanes', 'Queue Discipline', 'Four Trucks', 'Ridge Master'],
  ['Fuel Drop', 'Long Haul', 'Rain Check', 'Efficiency First', 'Canyon Run', 'Target Creep', 'Four Wheels', 'Storm Shift', 'Full Tanks', 'Canyon Boss'],
  ['Mud Season', 'Closed Road', 'Breakdown', 'Detour Duty', 'Valley Traffic', 'Storm Warning', 'Narrow Pass', 'Priority Lane', 'Valley Boss', 'Dust Master'],
  ['Mixed Cargo', 'Split Quotas', 'Deep Haul', 'Basin Traffic', 'Rain Again', 'Target Shift', 'Five Trucks', 'Basin Run', 'Quota Keeper', 'Basin Master'],
  ['Iron Rules', 'Long Shift', 'Frontier Traffic', 'Final Quotas', 'Iron Rain', 'Breakdown Alley', 'Six Trucks', 'Frontier Run', 'Master Shift', 'Frontier Boss'],
];

/** Excavator class used by each region's levels. */
const REGION_EXCAVATOR_CLASS: Record<number, ExcavatorClass> = {
  1: 'Standard',
  2: 'Standard',
  3: 'Standard',
  4: 'Heavy',
  5: 'Heavy',
  6: 'Ultra',
};

/** Materials per region, overridable per seed. */
const REGION_MATERIALS: Record<number, MaterialTypeId[]> = {
  1: ['ore'],
  2: ['ore', 'gravel'],
  3: ['ore', 'overburden'],
  4: ['coal', 'gravel', 'overburden'],
  5: ['ore', 'coal', 'gravel'],
  6: ['ore', 'coal', 'overburden'],
};

const TUTORIAL_STEPS_LEVEL_1 = [
  'Tap a truck to open its card.',
  'Assign it to an excavator.',
  'Choose a haul route.',
  'Press Start Operation.',
  'Watch it load, haul and dump.',
];

const TUTORIAL_STEPS_LEVEL_2 = [
  'Watch the queue at the loader.',
  'Use the speed control to run faster.',
  'Keep every truck hauling to hit the target.',
];

function objectiveText(
  kind: ObjectiveKind,
  target?: number,
  materialId?: MaterialTypeId,
): string {
  const materialName = materialId ? MATERIALS[materialId].name : '';
  switch (kind) {
    case 'tons':
      return `Move ${target} tons in total`;
    case 'time':
      return `Complete under ${formatClock(target ?? 0)}`;
    case 'idle':
      return `Keep truck idle time below ${target}%`;
    case 'fuel':
      return `Use less than ${target} L fuel`;
    case 'queue':
      return `Keep max queue time under ${target} sec`;
    case 'deliver':
      return `Deliver ${target} tons of ${materialName}`;
    case 'no-jam':
      return 'Complete without a traffic jam';
    case 'trucks':
      return `Complete using only ${target} trucks`;
  }
}

interface FleetEntry {
  truckClass: TruckClass;
  excavatorIndex: number;
  routeLetter: string;
}

function parseFleet(fleet: string): FleetEntry[] {
  const classMap: Record<string, TruckClass> = {
    C: 'Compact',
    S: 'Standard',
    H: 'Heavy',
    U: 'Ultra',
  };
  return fleet.split(',').map((part) => {
    const match = part.trim().match(/^([CSHU])(\d)([a-z])$/);
    if (!match) throw new Error(`Invalid fleet entry: "${part}"`);
    return {
      truckClass: classMap[match[1]],
      excavatorIndex: Number(match[2]),
      routeLetter: match[3],
    };
  });
}

/** Deterministic PRNG for scripted event timing (same outcome every run). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function roadDisplayName(map: MapConfig, roadId: string): string {
  const road = map.roads.find((r) => r.id === roadId);
  if (!road) return roadId;
  const nameOf = (id: string) => map.nodes.find((n) => n.id === id)?.name ?? id;
  return `${nameOf(road.from)} – ${nameOf(road.to)}`;
}

function estimateFuelBudget(
  map: MapConfig,
  excavators: ExcavatorSpec[],
  trucks: TruckSpec[],
  target: number,
): number {
  const totalCapacity = trucks.reduce((sum, t) => sum + t.capacity, 0);
  const tripsPerTruck = Math.ceil(target / Math.max(1, totalCapacity));
  let truckFuel = 0;
  let loadSeconds = 0;
  for (const truck of trucks) {
    const route = map.routes.find((r) => r.id === truck.routeId);
    if (!route) continue;
    const haul = pathLength(map, route.nodePath);
    const back = shortestPath(map, route.nodePath[route.nodePath.length - 1], route.nodePath[0]);
    const returnLen = back ? pathLength(map, back) : haul;
    const toLoader = shortestPath(map, truck.startNodeId, route.nodePath[0]);
    const startLen = toLoader ? pathLength(map, toLoader) : 0;
    truckFuel += ((haul + returnLen) * tripsPerTruck + startLen) * truck.fuelEfficiency;
    // Pass-based loading time (mirrors excavatorEngine.passSeconds).
    const ex = excavators.find((e) => e.id === truck.assignedExcavatorId);
    if (ex) {
      const passes = Math.ceil(truck.capacity / Math.max(0.01, ex.bucketCapacity) - 1e-9);
      const passTime = balance.passSwingSeconds + ex.bucketCapacity / Math.max(0.01, ex.loadingSpeed);
      loadSeconds += passes * passTime * tripsPerTruck;
    }
  }
  const avgFuelBurn =
    excavators.reduce((sum, e) => sum + e.fuelEfficiency, 0) / Math.max(1, excavators.length);
  const estimate = (truckFuel + loadSeconds * avgFuelBurn) * balance.fuelBudgetSlack;
  return Math.ceil(estimate / 5) * 5;
}

function buildEvents(
  levelNumber: number,
  seed: LevelSeed,
  map: MapConfig,
  target: number,
  timeLimit: number,
): GameEvent[] {
  const events: GameEvent[] = [];
  if (!seed.events || seed.events.length === 0) return events;
  const rand = mulberry32(levelNumber * 7919);
  const candidates = TEMPLATE_CLOSURE_CANDIDATES[seed.template] ?? [];
  let idCounter = 1;
  const nextId = () => `ev-${levelNumber}-${idCounter++}`;
  const pickTime = (minFrac: number, maxFrac: number) =>
    Math.round(timeLimit * (minFrac + rand() * (maxFrac - minFrac)));

  for (const type of seed.events) {
    if (type === 'rain') {
      events.push({
        id: nextId(),
        timeSeconds: pickTime(0.3, 0.45),
        type: 'rain',
        durationSeconds: 25 + Math.round(rand() * 20),
        message: 'Rain slows every haul road.',
      });
    } else if (type === 'target') {
      const amount = Math.max(10, Math.round((target * 0.12) / 10) * 10);
      events.push({
        id: nextId(),
        timeSeconds: pickTime(0.4, 0.6),
        type: 'target-increase',
        amount,
        message: `Production target increased by ${amount} tons.`,
      });
    } else if (type === 'closure') {
      if (candidates.length === 0) continue;
      const roadId = candidates[Math.floor(rand() * candidates.length)];
      const closeTime = pickTime(0.25, 0.4);
      const openTime = Math.min(timeLimit - 15, closeTime + 60 + Math.round(rand() * 45));
      events.push({
        id: nextId(),
        timeSeconds: closeTime,
        type: 'road-closure',
        target: roadId,
        message: `${roadDisplayName(map, roadId)} closed — find another way.`,
      });
      events.push({
        id: nextId(),
        timeSeconds: openTime,
        type: 'road-open',
        target: roadId,
        message: `${roadDisplayName(map, roadId)} reopened.`,
      });
    } else if (type === 'breakdown') {
      events.push({
        id: nextId(),
        timeSeconds: pickTime(0.35, 0.55),
        type: 'breakdown',
        durationSeconds: 10 + Math.round(rand() * 10),
        message: 'A truck has broken down on site.',
      });
    } else if (type === 'outage') {
      if (!map.nodes.some((n) => n.type === 'fuel')) continue;
      const durationSeconds = 30 + Math.round(rand() * 15);
      events.push({
        id: nextId(),
        timeSeconds: pickTime(0.3, 0.5),
        type: 'fuel-outage',
        durationSeconds,
        message: `Fuel station unavailable for ${durationSeconds}s — plan refuels around it.`,
      });
    }
  }
  return events.sort((a, b) => a.timeSeconds - b.timeSeconds);
}

function buildObjectives(
  levelNumber: number,
  seed: LevelSeed,
  fleet: FleetEntry[],
  target: number,
  fuelBudget: number,
  map: MapConfig,
  usedExIndexes: number[],
): LevelObjective[] {
  const region = regionOfLevel(levelNumber);
  const objectives: LevelObjective[] = [
    { id: 'obj-tons', kind: 'tons', target, description: `Move ${target} tons in total` },
  ];

  const push = (id: string, o: SeedObjectiveLike) => {
    objectives.push({
      id,
      kind: o.kind,
      target: o.target,
      materialId: o.materialId,
      bonus: o.bonus,
      description: objectiveText(o.kind, o.target, o.materialId),
    });
  };

  if (seed.objectives) {
    seed.objectives.forEach((o, i) => push(`obj-seed-${i + 1}`, o));
    return objectives;
  }

  const quotaTargets = (): SeedObjectiveLike[] => {
    const totalTrucks = fleet.length || 1;
    return usedExIndexes.map((idx) => {
      const node = map.nodes.find((n) => n.id === `ex${idx}`);
      const materialId = node?.materialId;
      if (!materialId) return { kind: 'deliver' as ObjectiveKind, bonus: false };
      // Quota follows the fleet distribution across excavators, with a 20%
      // safety margin (routes differ in speed, so actual delivery shares
      // drift from the truck distribution).
      const trucksOnExcavator = fleet.filter((f) => f.excavatorIndex === idx).length;
      const share = (trucksOnExcavator / totalTrucks) * 0.8;
      return {
        kind: 'deliver' as ObjectiveKind,
        target: Math.ceil((target * share) / 2) * 2,
        materialId,
        bonus: false,
      };
    });
  };

  switch (region.id) {
    case 1:
      push('obj-fuel-bonus', {
        kind: 'fuel',
        target: Math.ceil((fuelBudget * 0.85) / 5) * 5,
        bonus: true,
      });
      break;
    case 2:
      push('obj-queue', { kind: 'queue', target: 30 });
      push('obj-nojam-bonus', { kind: 'no-jam', bonus: true });
      break;
    case 3:
      push('obj-fuel', { kind: 'fuel', target: Math.ceil((fuelBudget * 0.9) / 5) * 5 });
      push('obj-idle-bonus', { kind: 'idle', target: 20, bonus: true });
      break;
    case 4:
      push('obj-nojam', { kind: 'no-jam' });
      push('obj-idle-bonus', { kind: 'idle', target: 15, bonus: true });
      break;
    case 5:
      quotaTargets().forEach((o, i) => push(`obj-deliver-${i + 1}`, o));
      push('obj-idle-bonus', { kind: 'idle', target: 15, bonus: true });
      break;
    case 6:
      push('obj-idle', { kind: 'idle', target: 12 });
      push('obj-fuel', { kind: 'fuel', target: Math.ceil((fuelBudget * 0.85) / 5) * 5 });
      quotaTargets().forEach((o, i) => push(`obj-deliver-bonus-${i + 1}`, { ...o, bonus: true }));
      break;
  }
  return objectives;
}

interface SeedObjectiveLike {
  kind: ObjectiveKind;
  target?: number;
  materialId?: MaterialTypeId;
  bonus?: boolean;
}

function buildStars(
  seed: LevelSeed,
  regionId: number,
  timeLimit: number,
  fuelBudget: number,
): StarThresholds {
  const base: StarThresholds = {
    star2TimeSeconds: Math.round(timeLimit * 0.8),
  };
  switch (regionId) {
    case 1:
      base.star3IdlePercent = 20;
      break;
    case 2:
      base.star3NoJam = true;
      break;
    case 3:
      base.star3FuelLiters = Math.ceil((fuelBudget * 0.85) / 5) * 5;
      break;
    case 4:
      base.star3NoJam = true;
      base.star3IdlePercent = 15;
      break;
    case 5:
      base.star3IdlePercent = 15;
      break;
    case 6:
      base.star3IdlePercent = 12;
      break;
  }
  return { ...base, ...seed.stars };
}

/** Overrides used by replay modes (daily / endless) that reuse campaign seeds. */
export interface BuildLevelOptions {
  id?: string;
  name?: string;
  /** PRNG seed for scripted event timing (defaults to the level number). */
  rngSeed?: number;
}

export function buildLevel(levelNumber: number, seed: LevelSeed, options: BuildLevelOptions = {}): LevelConfig {
  const region = regionOfLevel(levelNumber);
  const materials = seed.materials ?? REGION_MATERIALS[region.id] ?? (['ore'] as MaterialTypeId[]);
  const map = buildMap(seed.template, { materials });
  const fleet = parseFleet(seed.fleet);

  const usedExIndexes = Array.from(new Set(fleet.map((f) => f.excavatorIndex))).sort(
    (a, b) => a - b,
  );
  const exClass = REGION_EXCAVATOR_CLASS[region.id] ?? 'Standard';

  const excavators: ExcavatorSpec[] = usedExIndexes.map((idx) => {
    const nodeId = `ex${idx}`;
    const node = map.nodes.find((n) => n.id === nodeId);
    if (!node) throw new Error(`Level ${levelNumber}: excavator node "${nodeId}" missing`);
    const cls = EXCAVATOR_CLASSES[exClass];
    return {
      id: nodeId,
      name: `EX-${String(idx).padStart(2, '0')}`,
      nodeId,
      bucketCapacity: cls.bucketCapacity,
      loadingSpeed: cls.loadingSpeed,
      fuelEfficiency: cls.fuelBurn,
      condition: 100,
    };
  });

  const trucks: TruckSpec[] = fleet.map((entry, i) => {
    const routeId = `route-${entry.routeLetter}`;
    const route = map.routes.find((r) => r.id === routeId);
    if (!route) throw new Error(`Level ${levelNumber}: route "${routeId}" missing`);
    const exId = `ex${entry.excavatorIndex}`;
    if (route.nodePath[0] !== exId) {
      throw new Error(`Level ${levelNumber}: route "${routeId}" does not start at "${exId}"`);
    }
    const cls = TRUCK_CLASSES[entry.truckClass];
    const haul = pathLength(map, route.nodePath);
    const back = shortestPath(map, route.nodePath[route.nodePath.length - 1], route.nodePath[0]);
    const returnLen = back ? pathLength(map, back) : haul;
    const fuelCapacity = Math.max(
      20,
      Math.ceil(((haul + returnLen) * cls.fuelEfficiency * 2.5) / 5) * 5,
    );
    return {
      id: `truck-${i + 1}`,
      name: `DT-${String(i + 1).padStart(2, '0')}`,
      truckClass: entry.truckClass,
      capacity: cls.capacity,
      speed: cls.speed,
      fuelEfficiency: cls.fuelEfficiency,
      condition: 100,
      fuelCapacity,
      assignedExcavatorId: exId,
      routeId,
      startNodeId: 'park',
    };
  });

  const events = buildEvents(options.rngSeed ?? levelNumber, seed, map, seed.target, seed.time);
  // Budget covers scripted target increases too.
  const finalTarget =
    seed.target + events.reduce((sum, e) => sum + (e.type === 'target-increase' ? e.amount ?? 0 : 0), 0);
  const fuelBudget = estimateFuelBudget(map, excavators, trucks, finalTarget);
  const materialNames = map.materials.map((m) => m.name).join(', ');

  return {
    id: options.id ?? String(levelNumber),
    name:
      options.name ??
      LEVEL_NAMES[region.id - 1]?.[(levelNumber - region.startLevel) % 10] ??
      `Level ${levelNumber}`,
    regionId: region.id,
    regionName: region.name,
    difficulty: levelNumber,
    description: `Move ${seed.target} tons of ${materialNames} before the shift ends.`,
    timeLimit: seed.time,
    targetTons: seed.target,
    objectives: buildObjectives(
      levelNumber,
      seed,
      fleet,
      seed.target,
      fuelBudget,
      map,
      usedExIndexes,
    ),
    starThresholds: buildStars(seed, region.id, seed.time, fuelBudget),
    map,
    excavators,
    trucks,
    events,
    unlockCoins: 40 + Math.floor((levelNumber - 1) / 2) * 10,
    tutorialSteps: seed.tutorial
      ? levelNumber === 1
        ? TUTORIAL_STEPS_LEVEL_1
        : TUTORIAL_STEPS_LEVEL_2
      : undefined,
  };
}

export function regionOfLevel(levelNumber: number): RegionDef {
  return (
    REGIONS.find((r) => levelNumber >= r.startLevel && levelNumber <= r.endLevel) ??
    REGIONS[REGIONS.length - 1]
  );
}

/** All 60 campaign levels, data-driven. */
export const LEVELS: LevelConfig[] = LEVEL_SEEDS.map((seed, i) => buildLevel(i + 1, seed));

export function getLevelById(id: string): LevelConfig | undefined {
  return LEVELS.find((l) => l.id === id);
}

export function getLevelByNumber(levelNumber: number): LevelConfig {
  const index = Math.min(LEVELS.length, Math.max(1, levelNumber)) - 1;
  return LEVELS[index];
}

export const TOTAL_LEVELS = LEVELS.length;