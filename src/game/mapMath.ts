/**
 * MINING FLOW — map math helpers.
 * Pure functions for truck positions on the map grid (unit-testable).
 */

import type { LevelConfig, Point, TruckRuntime } from '@/types/game';

/** Map coordinate space is 0..100 on both axes. */
export const MAP_SIZE = 100;

export function nodePosition(level: LevelConfig, nodeId: string): Point {
  return (
    level.map.nodes.find((n) => n.id === nodeId)?.position ?? {
      x: MAP_SIZE / 2,
      y: MAP_SIZE / 2,
    }
  );
}

/** Interpolated map position of a truck along its current segment. */
export function truckPosition(truck: TruckRuntime, level: LevelConfig): Point {
  const path = truck.nodePath;
  if (path.length === 0) return { x: MAP_SIZE / 2, y: MAP_SIZE / 2 };
  if (truck.pathIndex >= path.length - 1) {
    return nodePosition(level, path[path.length - 1]);
  }
  const from = nodePosition(level, path[truck.pathIndex]);
  const to = nodePosition(level, path[truck.pathIndex + 1]);
  return {
    x: from.x + (to.x - from.x) * truck.segmentProgress,
    y: from.y + (to.y - from.y) * truck.segmentProgress,
  };
}

/** Node ids of the path a truck is currently following (for highlighting). */
export function truckRoutePath(truck: TruckRuntime): string[] {
  return truck.nodePath;
}