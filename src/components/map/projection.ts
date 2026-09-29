/**
 * Map projections: map space is a 0..MAP_SIZE square; screen space is the map
 * view in points. "top" is the classic top-down view; "iso" rotates the map
 * 45° and squashes it vertically (2.5D, Clash-of-Clans style). Both fit the
 * whole map inside the view with `pad` points of margin and are invertible,
 * so hit-testing and drag targets work the same in either view.
 */

import type { Point } from '@/types/game';

export type MapView = 'top' | 'iso';

/** Vertical squash of the iso diamond (0.5 = classic 2:1 dimetric). */
export const ISO_SQUASH = 0.58;
const COS45 = Math.SQRT1_2;

export interface Projection {
  view: MapView;
  /** Points per map unit along the map axes (used to size units and strokes). */
  scale: number;
  toScreen: (p: Point) => Point;
  toMap: (p: Point) => Point;
  /** Screen depth for back-to-front sorting (larger = nearer the viewer). */
  depth: (p: Point) => number;
}

/**
 * `fit` (iso only): map points that must stay visible — the diamond is then
 * sized to those points instead of the whole square, so on a portrait phone
 * the site fills the view and the empty diamond tips are cropped.
 */
export function makeProjection(
  view: MapView,
  width: number,
  height: number,
  mapSize: number,
  pad: number,
  fit?: readonly Point[],
): Projection {
  const w = Math.max(0.01, width - pad * 2);
  const h = Math.max(0.01, height - pad * 2);
  const half = mapSize / 2;
  const cx = width / 2;
  const cy = height / 2;

  if (view === 'top') {
    const scale = Math.min(w, h) / mapSize;
    return {
      view,
      scale,
      toScreen: (p) => ({ x: cx + (p.x - half) * scale, y: cy + (p.y - half) * scale }),
      toMap: (s) => ({ x: half + (s.x - cx) / scale, y: half + (s.y - cy) / scale }),
      depth: (p) => p.y,
    };
  }

  // Unit-scale iso coordinates relative to the map centre.
  const isoU = (p: Point) => ((p.x - half) - (p.y - half)) * COS45;
  const isoV = (p: Point) => ((p.x - half) + (p.y - half)) * COS45 * ISO_SQUASH;
  const bounds = fit && fit.length > 0 ? fit : [{ x: 0, y: 0 }, { x: mapSize, y: 0 }, { x: 0, y: mapSize }, { x: mapSize, y: mapSize }];
  const us = bounds.map(isoU);
  const vs = bounds.map(isoV);
  const minU = Math.min(...us);
  const maxU = Math.max(...us);
  const minV = Math.min(...vs);
  const maxV = Math.max(...vs);
  const k = Math.min(w / Math.max(1e-6, maxU - minU), h / Math.max(1e-6, maxV - minV));
  // Centre the fitted box in the view.
  const offU = (minU + maxU) / 2;
  const offV = (minV + maxV) / 2;
  return {
    view,
    // Length of one map unit along a map axis on screen (sizes sprites and strokes).
    scale: k * COS45 * Math.sqrt(1 + ISO_SQUASH * ISO_SQUASH),
    toScreen: (p) => ({ x: cx + (isoU(p) - offU) * k, y: cy + (isoV(p) - offV) * k }),
    toMap: (s) => {
      const u = ((s.x - cx) / k + offU) / COS45;
      const v = ((s.y - cy) / k + offV) / (COS45 * ISO_SQUASH);
      return { x: half + (u + v) / 2, y: half + (v - u) / 2 };
    },
    depth: (p) => p.x + p.y,
  };
}

/** SVG path of an ellipse lying flat on the ground (map units), projected to the screen. */
export function groundEllipsePath(toScreen: (p: Point) => Point, cx: number, cy: number, rx: number, ry: number, steps = 40): string {
  let d = '';
  for (let i = 0; i < steps; i += 1) {
    const a = (i / steps) * Math.PI * 2;
    const s = toScreen({ x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry });
    d += `${i === 0 ? 'M' : 'L'}${s.x.toFixed(2)} ${s.y.toFixed(2)} `;
  }
  return `${d}Z`;
}

/** SVG path of a polygon lying flat on the ground (map units), projected to the screen. */
export function groundPolygonPath(toScreen: (p: Point) => Point, points: readonly Point[]): string {
  return `${points
    .map((p, i) => {
      const s = toScreen(p);
      return `${i === 0 ? 'M' : 'L'}${s.x.toFixed(2)} ${s.y.toFixed(2)}`;
    })
    .join(' ')} Z`;
}
