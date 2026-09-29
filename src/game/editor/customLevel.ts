/**
 * Level editor model — a player/trainer-made layout ("draft") and its
 * compilation into a regular LevelConfig the simulation can run.
 * Nodes sit on a 10-unit grid; roads join two nodes; haul routes are
 * generated from the road graph, so a draft only describes the site.
 */

import type {
  ExcavatorSpec,
  LevelConfig,
  MapConfig,
  MapNode,
  MaterialTypeId,
  NamedRoute,
  Road,
  TruckClass,
  TruckSpec,
} from '@/types/game';
import { EXCAVATOR_CLASSES, TRUCK_CLASSES } from '../config/equipment';
import { MATERIALS } from '../config/materials';
import { pathLength, shortestPath } from '../engine/routeEngine';

export const CUSTOM_PREFIX = 'custom-';
export const GRID_STEP = 10;
export const GRID_MIN = 10;
export const GRID_MAX = 90;
export const MAX_NODES = 16;
export const MAX_ROADS = 30;
export const MAX_TRUCKS = 8;
export const TIME_OPTIONS = [180, 240, 300, 360, 480, 600] as const;

export type DraftNodeType = 'parking' | 'excavator' | 'dump' | 'fuel' | 'junction';

export interface DraftNode {
  id: string;
  type: DraftNodeType;
  x: number;
  y: number;
  /** Excavators dig it, dumps accept it. */
  materialId?: MaterialTypeId;
}

export interface DraftRoad {
  id: string;
  from: string;
  to: string;
  oneWay?: boolean;
  narrow?: boolean;
  mud?: boolean;
}

export interface LevelDraft {
  id: string;
  name: string;
  nodes: DraftNode[];
  roads: DraftRoad[];
  trucks: TruckClass[];
  targetTons: number;
  timeLimit: number;
  updatedAt: number;
}

export type CompileIssue =
  | { code: 'no-parking' }
  | { code: 'many-parking' }
  | { code: 'no-excavator' }
  | { code: 'no-dump' }
  | { code: 'no-trucks' }
  | { code: 'excavator-no-dump'; nodeId: string }
  | { code: 'parking-unreachable'; nodeId: string }
  | { code: 'bad-target' };

export type CompileResult = { ok: true; level: LevelConfig } | { ok: false; issues: CompileIssue[] };

export const isCustomLevelId = (id: string): boolean => id.startsWith(CUSTOM_PREFIX);

/** A fresh draft with just the standby yard, one pit and one stockpile joined by a road. */
export function createDraft(id: string, now: number): LevelDraft {
  return {
    id,
    name: 'My Pit',
    nodes: [
      { id: 'park', type: 'parking', x: 50, y: 90 },
      { id: 'ex1', type: 'excavator', x: 20, y: 20, materialId: 'ore' },
      { id: 'dump1', type: 'dump', x: 80, y: 20, materialId: 'ore' },
      { id: 'j1', type: 'junction', x: 50, y: 50 },
    ],
    roads: [
      { id: 'r1', from: 'ex1', to: 'j1' },
      { id: 'r2', from: 'j1', to: 'dump1' },
      { id: 'r3', from: 'park', to: 'j1' },
    ],
    trucks: ['Standard', 'Standard'],
    targetTons: 120,
    timeLimit: 300,
    updatedAt: now,
  };
}

export const snapToGrid = (v: number): number =>
  Math.min(GRID_MAX, Math.max(GRID_MIN, Math.round(v / GRID_STEP) * GRID_STEP));

/* ------------------------------------------------------------------ */
/* Pure edit operations (return a new draft; no-ops return the same)  */
/* ------------------------------------------------------------------ */

const nodeAt = (d: LevelDraft, x: number, y: number) => d.nodes.find((n) => n.x === x && n.y === y);

function nextId(prefix: string, taken: readonly string[]): string {
  let i = 1;
  while (taken.includes(`${prefix}${i}`)) i += 1;
  return `${prefix}${i}`;
}

export function addNode(d: LevelDraft, type: Exclude<DraftNodeType, 'parking'>, x: number, y: number, materialId: MaterialTypeId = 'ore'): LevelDraft {
  const gx = snapToGrid(x);
  const gy = snapToGrid(y);
  if (nodeAt(d, gx, gy) || d.nodes.length >= MAX_NODES) return d;
  if (type === 'fuel' && d.nodes.some((n) => n.type === 'fuel')) return d;
  const prefix = type === 'excavator' ? 'ex' : type === 'dump' ? 'dump' : type === 'fuel' ? 'fuel' : 'j';
  const node: DraftNode = {
    id: nextId(prefix, d.nodes.map((n) => n.id)),
    type,
    x: gx,
    y: gy,
    ...(type === 'excavator' || type === 'dump' ? { materialId } : {}),
  };
  return { ...d, nodes: [...d.nodes, node] };
}

export function moveNode(d: LevelDraft, nodeId: string, x: number, y: number): LevelDraft {
  const gx = snapToGrid(x);
  const gy = snapToGrid(y);
  const other = nodeAt(d, gx, gy);
  if (other && other.id !== nodeId) return d;
  return { ...d, nodes: d.nodes.map((n) => (n.id === nodeId ? { ...n, x: gx, y: gy } : n)) };
}

/** Removes a node and its roads. The standby yard cannot be removed. */
export function removeNode(d: LevelDraft, nodeId: string): LevelDraft {
  const node = d.nodes.find((n) => n.id === nodeId);
  if (!node || node.type === 'parking') return d;
  return {
    ...d,
    nodes: d.nodes.filter((n) => n.id !== nodeId),
    roads: d.roads.filter((r) => r.from !== nodeId && r.to !== nodeId),
  };
}

export function setNodeMaterial(d: LevelDraft, nodeId: string, materialId: MaterialTypeId): LevelDraft {
  return {
    ...d,
    nodes: d.nodes.map((n) => (n.id === nodeId && (n.type === 'excavator' || n.type === 'dump') ? { ...n, materialId } : n)),
  };
}

/** Joins two nodes; tapping an existing road's ends again removes it. */
export function toggleRoad(d: LevelDraft, a: string, b: string): LevelDraft {
  if (a === b || !d.nodes.some((n) => n.id === a) || !d.nodes.some((n) => n.id === b)) return d;
  const existing = d.roads.find((r) => (r.from === a && r.to === b) || (r.from === b && r.to === a));
  if (existing) return { ...d, roads: d.roads.filter((r) => r !== existing) };
  if (d.roads.length >= MAX_ROADS) return d;
  return { ...d, roads: [...d.roads, { id: nextId('r', d.roads.map((r) => r.id)), from: a, to: b }] };
}

/** Cycles a road through normal → narrow → mud → one-way (a→b) → normal. */
export function cycleRoadKind(d: LevelDraft, roadId: string): LevelDraft {
  return {
    ...d,
    roads: d.roads.map((r) => {
      if (r.id !== roadId) return r;
      const base = { id: r.id, from: r.from, to: r.to };
      if (r.oneWay) return base;
      if (r.mud) return { ...base, oneWay: true };
      if (r.narrow) return { ...base, mud: true };
      return { ...base, narrow: true };
    }),
  };
}

export function roadKind(r: DraftRoad): 'normal' | 'narrow' | 'mud' | 'one-way' {
  return r.oneWay ? 'one-way' : r.mud ? 'mud' : r.narrow ? 'narrow' : 'normal';
}

/* ------------------------------------------------------------------ */
/* Compilation                                                         */
/* ------------------------------------------------------------------ */

/** Road length in sim units: the templates use ~0.75 × straight-line distance. */
const roadLength = (a: DraftNode, b: DraftNode) => Math.max(6, Math.round(Math.hypot(a.x - b.x, a.y - b.y) * 0.75));

const NODE_NAMES: Record<DraftNodeType, string> = {
  parking: 'Standby Yard',
  excavator: 'Pit Face',
  dump: 'Stockpile',
  fuel: 'Fuel Station',
  junction: 'Junction',
};

/** Display names: "Pit Face 1", "Stockpile A", … (translated at display with tx on the base name). */
export function nodeDisplayName(d: LevelDraft, node: DraftNode): string {
  const same = d.nodes.filter((n) => n.type === node.type);
  const index = same.indexOf(node);
  if (node.type === 'parking' || node.type === 'fuel') return NODE_NAMES[node.type];
  if (node.type === 'dump') return `${NODE_NAMES.dump} ${String.fromCharCode(65 + index)}`;
  return `${NODE_NAMES[node.type]} ${index + 1}`;
}

export function compileDraft(d: LevelDraft): CompileResult {
  const issues: CompileIssue[] = [];
  const parking = d.nodes.filter((n) => n.type === 'parking');
  const excavatorNodes = d.nodes.filter((n) => n.type === 'excavator');
  const dumpNodes = d.nodes.filter((n) => n.type === 'dump');
  if (parking.length === 0) issues.push({ code: 'no-parking' });
  if (parking.length > 1) issues.push({ code: 'many-parking' });
  if (excavatorNodes.length === 0) issues.push({ code: 'no-excavator' });
  if (dumpNodes.length === 0) issues.push({ code: 'no-dump' });
  if (d.trucks.length === 0) issues.push({ code: 'no-trucks' });
  if (!Number.isFinite(d.targetTons) || d.targetTons < 20 || d.targetTons > 2000) issues.push({ code: 'bad-target' });

  const byId = new Map(d.nodes.map((n) => [n.id, n]));
  const nodes: MapNode[] = d.nodes.map((n) => ({
    id: n.id,
    type: n.type,
    name: nodeDisplayName(d, n),
    position: { x: n.x, y: n.y },
    materialId: n.materialId,
  }));
  const roads: Road[] = d.roads
    .filter((r) => byId.has(r.from) && byId.has(r.to))
    .map((r) => ({
      id: r.id,
      from: r.from,
      to: r.to,
      length: roadLength(byId.get(r.from)!, byId.get(r.to)!),
      speedLimit: r.narrow ? 0.75 : 1,
      oneWay: r.oneWay || undefined,
      narrow: r.narrow || undefined,
      mud: r.mud || undefined,
    }));
  const materialIds = [...new Set(d.nodes.map((n) => n.materialId).filter((m): m is MaterialTypeId => Boolean(m)))];
  const graph: MapConfig = { nodes, roads, routes: [], materials: materialIds.map((m) => MATERIALS[m]) };

  // Up to two haul routes per excavator: the fastest one, and the fastest
  // alternative that avoids the first route's first road.
  const routes: NamedRoute[] = [];
  const routesByExcavator = new Map<string, NamedRoute[]>();
  for (const ex of excavatorNodes) {
    const candidates: string[][] = [];
    for (const dump of dumpNodes.filter((n) => n.materialId === ex.materialId)) {
      const path = shortestPath(graph, ex.id, dump.id);
      if (path) candidates.push(path);
    }
    candidates.sort((a, b) => pathLength(graph, a) - pathLength(graph, b));
    const own: NamedRoute[] = [];
    const best = candidates[0];
    if (best) {
      own.push({ id: `route-${ex.id}-a`, name: 'Route A', nodePath: best });
      if (best.length >= 2) {
        const [from, to] = best;
        const blocked: MapConfig = {
          ...graph,
          roads: graph.roads.filter((r) => !((r.from === from && r.to === to) || (r.from === to && r.to === from))),
        };
        const alt = shortestPath(blocked, ex.id, best[best.length - 1]);
        if (alt && alt.join('>') !== best.join('>')) own.push({ id: `route-${ex.id}-b`, name: 'Route B', nodePath: alt });
      }
    } else {
      issues.push({ code: 'excavator-no-dump', nodeId: ex.id });
    }
    routesByExcavator.set(ex.id, own);
    routes.push(...own);
  }

  const park = parking[0];
  if (park) {
    for (const ex of excavatorNodes) {
      if (!shortestPath(graph, park.id, ex.id)) issues.push({ code: 'parking-unreachable', nodeId: ex.id });
    }
  }
  if (issues.length > 0) return { ok: false, issues };

  const map: MapConfig = { ...graph, routes };
  const excavators: ExcavatorSpec[] = excavatorNodes.map((n, i) => {
    const cls = EXCAVATOR_CLASSES.Standard;
    return {
      id: n.id,
      name: `EX-${String(i + 1).padStart(2, '0')}`,
      nodeId: n.id,
      bucketCapacity: cls.bucketCapacity,
      loadingSpeed: cls.loadingSpeed,
      fuelEfficiency: cls.fuelBurn,
      condition: 100,
    };
  });
  const trucks: TruckSpec[] = d.trucks.slice(0, MAX_TRUCKS).map((truckClass, i) => {
    const ex = excavatorNodes[i % excavatorNodes.length];
    const route = routesByExcavator.get(ex.id)![0];
    const cls = TRUCK_CLASSES[truckClass];
    const haul = pathLength(map, route.nodePath);
    const back = shortestPath(map, route.nodePath[route.nodePath.length - 1], route.nodePath[0]);
    const returnLen = back ? pathLength(map, back) : haul;
    return {
      id: `truck-${i + 1}`,
      name: `DT-${String(i + 1).padStart(2, '0')}`,
      truckClass,
      capacity: cls.capacity,
      speed: cls.speed,
      fuelEfficiency: cls.fuelEfficiency,
      condition: 100,
      fuelCapacity: Math.max(20, Math.ceil(((haul + returnLen) * cls.fuelEfficiency * 2.5) / 5) * 5),
      assignedExcavatorId: ex.id,
      routeId: route.id,
      startNodeId: park.id,
    };
  });

  const target = Math.round(d.targetTons);
  const level: LevelConfig = {
    id: d.id,
    name: d.name.trim() || 'Custom Pit',
    regionId: 0,
    regionName: 'Custom Site',
    difficulty: 1,
    description: `Move ${target} tons before the shift ends.`,
    timeLimit: d.timeLimit,
    targetTons: target,
    objectives: [{ id: 'obj-tons', kind: 'tons', target, description: `Move ${target} tons in total` }],
    starThresholds: { star2TimeSeconds: Math.round(d.timeLimit * 0.75), star3IdlePercent: 25 },
    map,
    excavators,
    trucks,
    events: [],
    unlockCoins: 0,
  };
  return { ok: true, level };
}
