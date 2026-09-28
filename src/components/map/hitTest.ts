/**
 * Pure hit-testing helpers for map gestures (drag-to-assign).
 * All coordinates are screen-space points.
 */

import type { Point } from '@/types/game';

export interface HitCandidate extends Point {
  id: string;
}

/** Id of the candidate closest to `point`, or null when none is within `radius`. */
export function nearestWithin(point: Point, candidates: readonly HitCandidate[], radius: number): string | null {
  let best: string | null = null;
  let bestDist = radius;
  for (const c of candidates) {
    const d = Math.hypot(c.x - point.x, c.y - point.y);
    if (d <= bestDist) {
      best = c.id;
      bestDist = d;
    }
  }
  return best;
}

/** Shortest distance from `point` to the segment a–b. */
export function distanceToSegment(point: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSq));
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}
