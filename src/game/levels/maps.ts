/**
 * MINING FLOW — stylized map templates.
 * Data-driven builders producing nodes, roads and named routes per template.
 * Coordinate space: x/y in 0..100, scaled to screen by GameMap.
 */

import type { MapConfig, MapNode, MaterialTypeId, NamedRoute, Road } from '@/types/game';
import { MATERIALS } from '../config/materials';

export type MapTemplateId = 'loop' | 'twin' | 'fuel' | 'basin';

export interface TemplateBuildOptions {
  materials: MaterialTypeId[];
}

/** Default material per template slot, overridable by level seeds. */
export const TEMPLATE_DEFAULT_MATERIALS: Record<MapTemplateId, MaterialTypeId[]> = {
  loop: ['ore'],
  twin: ['ore', 'gravel'],
  fuel: ['ore', 'overburden'],
  basin: ['coal', 'gravel', 'overburden'],
};

/** Roads scripted closure events may target, per template. */
export const TEMPLATE_CLOSURE_CANDIDATES: Record<MapTemplateId, string[]> = {
  loop: [],
  twin: ['ex1-jC', 'ex2-jC'],
  fuel: ['ex1-jC', 'ex2-jC'],
  basin: ['jN-jW', 'jN-jE', 'jW-jE'],
};

function makeNode(
  id: string,
  type: MapNode['type'],
  name: string,
  x: number,
  y: number,
  materialId?: MaterialTypeId,
): MapNode {
  return { id, type, name, position: { x, y }, materialId };
}

function makeRoad(
  id: string,
  from: string,
  to: string,
  length: number,
  speedLimit: number,
  extra: Partial<Pick<Road, 'oneWay' | 'narrow' | 'mud'>> = {},
): Road {
  return { id, from, to, length, speedLimit, ...extra };
}

function makeRoute(id: string, name: string, nodePath: string[]): NamedRoute {
  return { id, name, nodePath };
}

function collectMaterials(nodes: MapNode[]) {
  const usedIds = Array.from(
    new Set(nodes.map((n) => n.materialId).filter((id): id is MaterialTypeId => Boolean(id))),
  );
  return usedIds.map((id) => MATERIALS[id]);
}

export function buildMap(template: MapTemplateId, opts: TemplateBuildOptions): MapConfig {
  switch (template) {
    case 'loop':
      return buildLoopMap(opts);
    case 'twin':
      return buildTwinMap(opts);
    case 'fuel':
      return buildFuelMap(opts);
    case 'basin':
      return buildBasinMap(opts);
  }
}

/** Single loader with two route choices — teaches route + queue basics. */
function buildLoopMap(opts: TemplateBuildOptions): MapConfig {
  const [m1] = opts.materials;
  const nodes: MapNode[] = [
    makeNode('park', 'parking', 'Standby Yard', 50, 88),
    makeNode('ex1', 'excavator', 'Pit Face', 20, 18, m1),
    makeNode('dump1', 'dump', 'Stockpile A', 80, 82, m1),
    makeNode('jA', 'junction', 'Junction A', 20, 50),
    makeNode('jB', 'junction', 'Junction B', 50, 50),
    makeNode('jC', 'junction', 'Junction C', 80, 50),
  ];
  const roads: Road[] = [
    makeRoad('ex1-jA', 'ex1', 'jA', 24, 1.0),
    makeRoad('jA-jB', 'jA', 'jB', 20, 0.75, { narrow: true }),
    makeRoad('jB-jC', 'jB', 'jC', 20, 0.75, { narrow: true }),
    makeRoad('jA-jC', 'jA', 'jC', 40, 1.3),
    makeRoad('jC-dump1', 'jC', 'dump1', 24, 1.0),
    makeRoad('park-jB', 'park', 'jB', 26, 1.0),
  ];
  const routes: NamedRoute[] = [
    makeRoute('route-a', 'Valley Run', ['ex1', 'jA', 'jB', 'jC', 'dump1']),
    makeRoute('route-b', 'Ridge Express', ['ex1', 'jA', 'jC', 'dump1']),
  ];
  return { nodes, roads, routes, materials: collectMaterials(nodes) };
}

/** Two loaders with a one-way central spine — introduces intersections. */
function buildTwinMap(opts: TemplateBuildOptions): MapConfig {
  const [m1, m2] = opts.materials;
  const nodes: MapNode[] = [
    makeNode('park', 'parking', 'Standby Yard', 50, 90),
    makeNode('ex1', 'excavator', 'West Pit', 16, 20, m1),
    makeNode('ex2', 'excavator', 'East Pit', 84, 20, m2),
    makeNode('dump1', 'dump', 'West Stockpile', 16, 80, m1),
    makeNode('dump2', 'dump', 'East Stockpile', 84, 80, m2),
    makeNode('jN', 'junction', 'North Junction', 50, 36),
    makeNode('jC', 'junction', 'Center Junction', 50, 62),
  ];
  const roads: Road[] = [
    makeRoad('ex1-jN', 'ex1', 'jN', 28, 1.0),
    makeRoad('ex2-jN', 'ex2', 'jN', 28, 1.0),
    makeRoad('jN-jC', 'jN', 'jC', 24, 1.2, { oneWay: true }),
    makeRoad('jC-jN', 'jC', 'jN', 24, 0.9, { oneWay: true }),
    makeRoad('jC-dump1', 'jC', 'dump1', 28, 1.0),
    makeRoad('jC-dump2', 'jC', 'dump2', 28, 1.0),
    makeRoad('ex1-jC', 'ex1', 'jC', 32, 0.8),
    makeRoad('ex2-jC', 'ex2', 'jC', 32, 0.8),
    makeRoad('park-jC', 'park', 'jC', 28, 1.0),
  ];
  const routes: NamedRoute[] = [
    makeRoute('route-a', 'North Loop', ['ex1', 'jN', 'jC', 'dump1']),
    makeRoute('route-b', 'Center Cut', ['ex1', 'jC', 'dump1']),
    makeRoute('route-c', 'North Haul', ['ex2', 'jN', 'jC', 'dump2']),
    makeRoute('route-d', 'Center Run', ['ex2', 'jC', 'dump2']),
  ];
  return { nodes, roads, routes, materials: collectMaterials(nodes) };
}

/** Twin layout plus fuel station and workshop — introduces fuel management. */
function buildFuelMap(opts: TemplateBuildOptions): MapConfig {
  const [m1, m2] = opts.materials;
  const nodes: MapNode[] = [
    makeNode('park', 'parking', 'Standby Yard', 50, 90),
    makeNode('ex1', 'excavator', 'West Pit', 16, 20, m1),
    makeNode('ex2', 'excavator', 'East Pit', 84, 20, m2),
    makeNode('dump1', 'dump', 'West Stockpile', 16, 80, m1),
    makeNode('dump2', 'dump', 'East Stockpile', 84, 80, m2),
    makeNode('jN', 'junction', 'North Junction', 50, 36),
    makeNode('jC', 'junction', 'Center Junction', 50, 62),
    makeNode('fuel', 'fuel', 'Fuel Station', 50, 78),
    makeNode('workshop', 'workshop', 'Workshop', 8, 52),
  ];
  const roads: Road[] = [
    makeRoad('ex1-jN', 'ex1', 'jN', 28, 1.0),
    makeRoad('ex2-jN', 'ex2', 'jN', 28, 1.0),
    makeRoad('jN-jC', 'jN', 'jC', 24, 1.2, { oneWay: true }),
    makeRoad('jC-jN', 'jC', 'jN', 24, 0.9, { oneWay: true }),
    makeRoad('jC-dump1', 'jC', 'dump1', 28, 1.0),
    makeRoad('jC-dump2', 'jC', 'dump2', 28, 1.0),
    makeRoad('ex1-jC', 'ex1', 'jC', 32, 0.8),
    makeRoad('ex2-jC', 'ex2', 'jC', 32, 0.8),
    makeRoad('jC-fuel', 'jC', 'fuel', 18, 1.0),
    makeRoad('workshop-jN', 'workshop', 'jN', 44, 0.9),
    makeRoad('park-jC', 'park', 'jC', 28, 1.0),
  ];
  const routes: NamedRoute[] = [
    makeRoute('route-a', 'North Loop', ['ex1', 'jN', 'jC', 'dump1']),
    makeRoute('route-b', 'Center Cut', ['ex1', 'jC', 'dump1']),
    makeRoute('route-c', 'North Haul', ['ex2', 'jN', 'jC', 'dump2']),
    makeRoute('route-d', 'Center Run', ['ex2', 'jC', 'dump2']),
  ];
  return { nodes, roads, routes, materials: collectMaterials(nodes) };
}

/** Large network: three loaders, three stockpiles, mud zones and bypasses. */
function buildBasinMap(opts: TemplateBuildOptions): MapConfig {
  const [m1, m2, m3] = opts.materials;
  const nodes: MapNode[] = [
    makeNode('park', 'parking', 'Standby Yard', 32, 94),
    makeNode('ex1', 'excavator', 'North Pit', 14, 18, m1),
    makeNode('ex3', 'excavator', 'Summit Pit', 50, 12, m3),
    makeNode('ex2', 'excavator', 'Ridge Pit', 86, 18, m2),
    makeNode('dump1', 'dump', 'Basin Stockpile', 14, 84, m1),
    makeNode('dump3', 'dump', 'Summit Stockpile', 50, 90, m3),
    makeNode('dump2', 'dump', 'Ridge Stockpile', 86, 84, m2),
    makeNode('jN', 'junction', 'North Junction', 50, 38),
    makeNode('jW', 'junction', 'West Junction', 28, 58),
    makeNode('jE', 'junction', 'East Junction', 72, 58),
    makeNode('jS', 'junction', 'South Junction', 50, 66),
    makeNode('fuel', 'fuel', 'Fuel Station', 34, 80),
    makeNode('workshop', 'workshop', 'Workshop', 6, 46),
  ];
  const roads: Road[] = [
    makeRoad('ex1-jN', 'ex1', 'jN', 32, 1.0),
    makeRoad('ex2-jN', 'ex2', 'jN', 32, 1.0),
    makeRoad('ex3-jN', 'ex3', 'jN', 26, 1.1),
    makeRoad('jN-jS', 'jN', 'jS', 28, 1.3, { oneWay: true }),
    makeRoad('jS-jN', 'jS', 'jN', 28, 0.9, { oneWay: true }),
    makeRoad('jN-jW', 'jN', 'jW', 26, 0.9),
    makeRoad('jN-jE', 'jN', 'jE', 26, 0.9),
    makeRoad('jW-jS', 'jW', 'jS', 22, 0.8, { mud: true }),
    makeRoad('jE-jS', 'jE', 'jS', 22, 0.8, { mud: true }),
    makeRoad('jW-jE', 'jW', 'jE', 44, 1.4),
    makeRoad('jW-dump1', 'jW', 'dump1', 26, 1.0),
    makeRoad('jE-dump2', 'jE', 'dump2', 26, 1.0),
    makeRoad('jS-dump3', 'jS', 'dump3', 24, 1.0),
    makeRoad('jS-fuel', 'jS', 'fuel', 21, 1.0),
    makeRoad('workshop-jN', 'workshop', 'jN', 44, 0.9),
    makeRoad('park-jS', 'park', 'jS', 33, 1.0),
  ];
  const routes: NamedRoute[] = [
    makeRoute('route-a', 'West Run', ['ex1', 'jN', 'jW', 'dump1']),
    makeRoute('route-b', 'West Cut', ['ex1', 'jN', 'jS', 'jW', 'dump1']),
    makeRoute('route-c', 'East Run', ['ex2', 'jN', 'jE', 'dump2']),
    makeRoute('route-d', 'East Cut', ['ex2', 'jN', 'jS', 'jE', 'dump2']),
    makeRoute('route-e', 'Summit Run', ['ex3', 'jN', 'jS', 'dump3']),
    makeRoute('route-f', 'Summit Loop', ['ex3', 'jN', 'jE', 'jS', 'dump3']),
  ];
  return { nodes, roads, routes, materials: collectMaterials(nodes) };
}