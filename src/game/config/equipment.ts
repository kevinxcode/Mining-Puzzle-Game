/**
 * MINING FLOW — equipment catalog and upgrade definitions.
 * Base specs per truck/excavator class, unlock gates and upgrade tracks.
 * All equipment is unlockable through gameplay — no pay-to-win.
 */

import type { TruckClass } from '@/types/game';
import { balance } from './balance';
import { t } from '@/i18n/core';

export interface TruckClassSpec {
  truckClass: TruckClass;
  name: string;
  capacity: number;
  /** Road units per second at speed limit 1. */
  speed: number;
  /** Liters burned per road unit traveled. */
  fuelEfficiency: number;
  condition: number;
  /** Campaign levels the player must complete before this class unlocks (readme §20). */
  unlockAfterLevels: number;
}

export const TRUCK_CLASSES: Record<TruckClass, TruckClassSpec> = {
  Compact: {
    truckClass: 'Compact',
    name: 'Compact Hauler',
    capacity: 20,
    speed: 4.2,
    fuelEfficiency: 0.09,
    condition: 100,
    unlockAfterLevels: 0,
  },
  Standard: {
    truckClass: 'Standard',
    name: 'Standard Hauler',
    capacity: 32,
    speed: 3.6,
    fuelEfficiency: 0.11,
    condition: 100,
    unlockAfterLevels: 0,
  },
  Heavy: {
    truckClass: 'Heavy',
    name: 'Heavy Hauler',
    capacity: 45,
    speed: 3.2,
    fuelEfficiency: 0.14,
    condition: 100,
    unlockAfterLevels: 10,
  },
  Ultra: {
    truckClass: 'Ultra',
    name: 'Ultra Hauler',
    capacity: 60,
    speed: 3.0,
    fuelEfficiency: 0.16,
    condition: 100,
    unlockAfterLevels: 40,
  },
};

export type ExcavatorClass = 'Compact' | 'Standard' | 'Heavy' | 'Ultra';

export interface ExcavatorClassSpec {
  name: string;
  bucketCapacity: number;
  /** Tons per second while loading. */
  loadingSpeed: number;
  /** Liters burned per second while loading. */
  fuelBurn: number;
  /** Campaign levels the player must complete before this class unlocks (readme §20). */
  unlockAfterLevels: number;
}

export const EXCAVATOR_CLASSES: Record<ExcavatorClass, ExcavatorClassSpec> = {
  Compact: {
    name: 'Compact Excavator',
    bucketCapacity: 8,
    loadingSpeed: 3.4,
    fuelBurn: 0.5,
    unlockAfterLevels: 0,
  },
  Standard: {
    name: 'Standard Excavator',
    bucketCapacity: 12,
    loadingSpeed: 4.6,
    fuelBurn: 0.7,
    unlockAfterLevels: 0,
  },
  Heavy: {
    name: 'Heavy Excavator',
    bucketCapacity: 18,
    loadingSpeed: 6.4,
    fuelBurn: 1.0,
    unlockAfterLevels: 20,
  },
  Ultra: {
    name: 'Ultra Excavator',
    bucketCapacity: 25,
    loadingSpeed: 8.4,
    fuelBurn: 1.3,
    unlockAfterLevels: 50,
  },
};

export type UpgradeTarget = 'excavator' | 'truck';

export type UpgradeStat =
  | 'loadingSpeed'
  | 'bucketCapacity'
  | 'fuelEfficiency'
  | 'reliability'
  | 'capacity'
  | 'speed'
  | 'durability';

export interface UpgradeDef {
  id: string;
  target: UpgradeTarget;
  stat: UpgradeStat;
  name: string;
  description: string;
  costPerLevel: number;
  /** Effect strength per level (0.08 = +8% per level). */
  effectPerLevel: number;
  /** true when the stat measures consumption or downtime (lower is better). */
  reduces: boolean;
}

export const UPGRADES: UpgradeDef[] = [
  {
    id: 'excavator:loadingSpeed',
    target: 'excavator',
    stat: 'loadingSpeed',
    name: 'Loading Speed',
    description: 'Load trucks faster at every excavator.',
    costPerLevel: 120,
    effectPerLevel: 0.08,
    reduces: false,
  },
  {
    id: 'excavator:bucketCapacity',
    target: 'excavator',
    stat: 'bucketCapacity',
    name: 'Bucket Capacity',
    description: 'Bigger buckets mean fewer passes per truck.',
    costPerLevel: 150,
    effectPerLevel: 0.1,
    reduces: false,
  },
  {
    id: 'excavator:fuelEfficiency',
    target: 'excavator',
    stat: 'fuelEfficiency',
    name: 'Engine Tuning',
    description: 'Excavators burn less fuel while loading.',
    costPerLevel: 110,
    effectPerLevel: 0.06,
    reduces: true,
  },
  {
    id: 'excavator:reliability',
    target: 'excavator',
    stat: 'reliability',
    name: 'Reliability',
    description: 'Softens efficiency drop events on site.',
    costPerLevel: 130,
    effectPerLevel: 0.1,
    reduces: true,
  },
  {
    id: 'truck:capacity',
    target: 'truck',
    stat: 'capacity',
    name: 'Cargo Capacity',
    description: 'Every truck carries more tons per trip.',
    costPerLevel: 160,
    effectPerLevel: 0.06,
    reduces: false,
  },
  {
    id: 'truck:speed',
    target: 'truck',
    stat: 'speed',
    name: 'Top Speed',
    description: 'Trucks travel haul roads faster.',
    costPerLevel: 140,
    effectPerLevel: 0.06,
    reduces: false,
  },
  {
    id: 'truck:fuelEfficiency',
    target: 'truck',
    stat: 'fuelEfficiency',
    name: 'Fuel Efficiency',
    description: 'Trucks burn less fuel on every road.',
    costPerLevel: 120,
    effectPerLevel: 0.07,
    reduces: true,
  },
  {
    id: 'truck:durability',
    target: 'truck',
    stat: 'durability',
    name: 'Durability',
    description: 'Shorter breakdown recovery after failures.',
    costPerLevel: 130,
    effectPerLevel: 0.1,
    reduces: true,
  },
];

export const TRUCK_UPGRADES = UPGRADES.filter((u) => u.target === 'truck');
export const EXCAVATOR_UPGRADES = UPGRADES.filter((u) => u.target === 'excavator');

export function upgradeLevelOf(upgrades: Record<string, number>, id: string): number {
  return Math.min(balance.maxUpgradeLevel, upgrades[id] ?? 0);
}

export function upgradeCost(upgrades: Record<string, number>, def: UpgradeDef): number {
  return def.costPerLevel * (upgradeLevelOf(upgrades, def.id) + 1);
}

/** Multiplier applied to a base stat for the given upgrade state. */
export function upgradeStatMultiplier(upgrades: Record<string, number>, def: UpgradeDef): number {
  const level = upgradeLevelOf(upgrades, def.id);
  return def.reduces ? 1 - def.effectPerLevel * level : 1 + def.effectPerLevel * level;
}

/** Catalog entry describing one unlockable equipment class. */
export interface EquipmentCatalogEntry {
  id: string;
  kind: 'truck' | 'excavator';
  name: string;
  className: string;
  details: string;
  unlockAfterLevels: number;
}

export const EQUIPMENT_CATALOG: EquipmentCatalogEntry[] = [
  ...Object.values(TRUCK_CLASSES).map((spec) => ({
    id: `truck:${spec.truckClass}`,
    kind: 'truck' as const,
    name: spec.name,
    className: spec.truckClass,
    details: `${spec.capacity} t · speed ${spec.speed.toFixed(2)} · ${spec.fuelEfficiency.toFixed(2)} L/unit`,
    unlockAfterLevels: spec.unlockAfterLevels,
  })),
  ...(Object.entries(EXCAVATOR_CLASSES) as [ExcavatorClass, ExcavatorClassSpec][]).map(([key, spec]) => ({
    id: `excavator:${key}`,
    kind: 'excavator' as const,
    name: spec.name,
    className: spec.name,
    details: `${spec.bucketCapacity} t bucket · ${spec.loadingSpeed.toFixed(1)} t/s loading`,
    unlockAfterLevels: spec.unlockAfterLevels,
  })),
];
/** Catalog details line in the current language. */
export function equipmentDetailsLabel(entry: EquipmentCatalogEntry): string {
  const [, key] = entry.id.split(':');
  if (entry.kind === 'truck') {
    const spec = TRUCK_CLASSES[key as TruckClass];
    return t('shell.equip.truckDetails', { capacity: spec.capacity, speed: spec.speed.toFixed(2), fuel: spec.fuelEfficiency.toFixed(2) });
  }
  const spec = EXCAVATOR_CLASSES[key as ExcavatorClass];
  return t('shell.equip.excavatorDetails', { bucket: spec.bucketCapacity, speed: spec.loadingSpeed.toFixed(1) });
}

export function isEquipmentUnlocked(entry: EquipmentCatalogEntry, levelsCompleted: number): boolean {
  return levelsCompleted >= entry.unlockAfterLevels;
}

/** Truck classes the player can pick for a mode fleet, weakest first. */
export function unlockedTruckClasses(levelsCompleted: number): TruckClass[] {
  return (Object.keys(TRUCK_CLASSES) as TruckClass[]).filter(
    (c) => levelsCompleted >= TRUCK_CLASSES[c].unlockAfterLevels,
  );
}

/** "Now +12% · Next +18%" (or "Max +18%") for the equipment screen. */
export function upgradeEffectLabel(def: UpgradeDef, level: number): string {
  const pct = (lvl: number) => `${def.reduces ? '−' : '+'}${Math.round(def.effectPerLevel * lvl * 100)}%`;
  if (level >= balance.maxUpgradeLevel) return t('shell.equip.effectMax', { pct: pct(balance.maxUpgradeLevel) });
  return t('shell.equip.effectNext', { now: pct(level), next: pct(level + 1) });
}
