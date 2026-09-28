/**
 * Map camera math (pinch-zoom + pan). Pure worklets: they run on the UI thread
 * inside gesture callbacks and in jest as plain functions.
 * The map layer is transformed as translate(x, y) · scale(scale) from its top-left.
 */

import type { Point } from '@/types/game';

export interface Camera {
  scale: number;
  x: number;
  y: number;
}

export interface Viewport {
  width: number;
  height: number;
}

export const CAMERA_MIN_SCALE = 1;
export const CAMERA_MAX_SCALE = 3;
/** Zoom level used by double-tap. */
export const CAMERA_TAP_SCALE = 2;

/** Keeps the zoom in range and the map covering the whole viewport. */
export function clampCamera(cam: Camera, view: Viewport): Camera {
  'worklet';
  const scale = Math.min(CAMERA_MAX_SCALE, Math.max(CAMERA_MIN_SCALE, cam.scale));
  const minX = view.width - view.width * scale;
  const minY = view.height - view.height * scale;
  return {
    scale,
    x: Math.min(0, Math.max(minX, cam.x)) + 0,
    y: Math.min(0, Math.max(minY, cam.y)) + 0,
  };
}

/** New camera at `scale` that keeps the content under `focal` (screen point) fixed. */
export function zoomAround(cam: Camera, focal: Point, scale: number): Camera {
  'worklet';
  const ratio = scale / cam.scale;
  return {
    scale,
    x: focal.x - (focal.x - cam.x) * ratio,
    y: focal.y - (focal.y - cam.y) * ratio,
  };
}

/** Screen point (inside the map view) → unzoomed map-layer coordinates. */
export function toContent(point: Point, cam: Camera): Point {
  'worklet';
  return { x: (point.x - cam.x) / cam.scale, y: (point.y - cam.y) / cam.scale };
}
