import { makeProjection, type MapView } from '@/components/map/projection';

const SIZE = 100;
const corners = [
  { x: 0, y: 0 },
  { x: SIZE, y: 0 },
  { x: 0, y: SIZE },
  { x: SIZE, y: SIZE },
];

describe.each<MapView>(['top', 'iso'])('%s projection', (view) => {
  const proj = makeProjection(view, 390, 520, SIZE, 20);

  it('round-trips map ↔ screen', () => {
    for (const p of [...corners, { x: 37.5, y: 81.25 }, { x: 50, y: 50 }]) {
      const back = proj.toMap(proj.toScreen(p));
      expect(back.x).toBeCloseTo(p.x, 9);
      expect(back.y).toBeCloseTo(p.y, 9);
    }
  });

  it('fits the whole map inside the padded view', () => {
    for (const c of corners) {
      const s = proj.toScreen(c);
      expect(s.x).toBeGreaterThanOrEqual(20 - 1e-9);
      expect(s.x).toBeLessThanOrEqual(390 - 20 + 1e-9);
      expect(s.y).toBeGreaterThanOrEqual(20 - 1e-9);
      expect(s.y).toBeLessThanOrEqual(520 - 20 + 1e-9);
    }
  });

  it('centres the map', () => {
    const c = proj.toScreen({ x: 50, y: 50 });
    expect(c.x).toBeCloseTo(195, 9);
    expect(c.y).toBeCloseTo(260, 9);
  });

  it('draws nearer points later (depth grows toward the viewer)', () => {
    expect(proj.depth({ x: 50, y: 90 })).toBeGreaterThan(proj.depth({ x: 50, y: 10 }));
  });
});

describe('iso diamond', () => {
  it('puts the map corners at the diamond tips', () => {
    const proj = makeProjection('iso', 400, 400, SIZE, 0);
    const top = proj.toScreen({ x: 0, y: 0 });
    const right = proj.toScreen({ x: SIZE, y: 0 });
    const left = proj.toScreen({ x: 0, y: SIZE });
    const bottom = proj.toScreen({ x: SIZE, y: SIZE });
    expect(top.x).toBeCloseTo(200, 9);
    expect(bottom.x).toBeCloseTo(200, 9);
    expect(top.y).toBeLessThan(left.y);
    expect(right.x).toBeGreaterThan(left.x);
    expect(right.y).toBeCloseTo(left.y, 9);
    // Fits the width exactly with no padding.
    expect(left.x).toBeCloseTo(0, 9);
    expect(right.x).toBeCloseTo(400, 9);
  });
});

describe('ground shapes', () => {
  const { groundEllipsePath, groundPolygonPath } = jest.requireActual('@/components/map/projection');
  it('projects flat shapes point by point', () => {
    const top = makeProjection('top', 200, 200, SIZE, 0);
    expect(groundPolygonPath(top.toScreen, [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }])).toBe('M0.00 0.00 L200.00 0.00 L200.00 200.00 Z');
    const d: string = groundEllipsePath(top.toScreen, 50, 50, 25, 25, 4);
    expect(d.startsWith('M150.00 100.00')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
  });
});

describe('iso fit to content', () => {
  const content = [
    { x: 20, y: 18 },
    { x: 80, y: 82 },
    { x: 50, y: 88 },
    { x: 20, y: 50 },
  ];
  it('keeps every content point inside the view and zooms in versus the full map', () => {
    const full = makeProjection('iso', 390, 520, SIZE, 20);
    const fit = makeProjection('iso', 390, 520, SIZE, 20, content);
    expect(fit.scale).toBeGreaterThan(full.scale);
    for (const p of content) {
      const s = fit.toScreen(p);
      expect(s.x).toBeGreaterThanOrEqual(20 - 1e-6);
      expect(s.x).toBeLessThanOrEqual(370 + 1e-6);
      expect(s.y).toBeGreaterThanOrEqual(20 - 1e-6);
      expect(s.y).toBeLessThanOrEqual(500 + 1e-6);
      const back = fit.toMap(s);
      expect(back.x).toBeCloseTo(p.x, 9);
      expect(back.y).toBeCloseTo(p.y, 9);
    }
  });
});
