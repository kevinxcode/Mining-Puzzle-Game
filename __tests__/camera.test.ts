import { CAMERA_MAX_SCALE, clampCamera, toContent, zoomAround } from '@/components/map/camera';

const view = { width: 400, height: 600 };

describe('map camera', () => {
  test('clamps zoom between 1x and the max', () => {
    expect(clampCamera({ scale: 0.4, x: 0, y: 0 }, view).scale).toBe(1);
    expect(clampCamera({ scale: 99, x: 0, y: 0 }, view).scale).toBe(CAMERA_MAX_SCALE);
  });

  test('never lets the map leave the viewport', () => {
    // At 1x there is nothing to pan.
    expect(clampCamera({ scale: 1, x: 50, y: -40 }, view)).toEqual({ scale: 1, x: 0, y: 0 });
    // At 2x the content is 800x1200: x ∈ [-400, 0], y ∈ [-600, 0].
    expect(clampCamera({ scale: 2, x: 30, y: -900 }, view)).toEqual({ scale: 2, x: 0, y: -600 });
  });

  test('zooming keeps the focal point under the fingers', () => {
    const cam = zoomAround({ scale: 1, x: 0, y: 0 }, { x: 100, y: 200 }, 2);
    const before = toContent({ x: 100, y: 200 }, { scale: 1, x: 0, y: 0 });
    const after = toContent({ x: 100, y: 200 }, cam);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });

  test('toContent converts screen touches into unzoomed map coordinates', () => {
    expect(toContent({ x: 50, y: 50 }, { scale: 2, x: -100, y: -40 })).toEqual({ x: 75, y: 45 });
  });
});
