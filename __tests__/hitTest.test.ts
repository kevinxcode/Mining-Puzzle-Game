import { distanceToSegment, nearestWithin } from '@/components/map/hitTest';

describe('map hit testing', () => {
  const points = [
    { id: 'ex1', x: 10, y: 10 },
    { id: 'ex2', x: 100, y: 10 },
  ];

  test('picks the nearest candidate inside the radius', () => {
    expect(nearestWithin({ x: 14, y: 12 }, points, 20)).toBe('ex1');
    expect(nearestWithin({ x: 90, y: 14 }, points, 20)).toBe('ex2');
  });

  test('returns null when nothing is inside the radius', () => {
    expect(nearestWithin({ x: 55, y: 60 }, points, 20)).toBeNull();
  });

  test('distance to a segment clamps to the endpoints', () => {
    expect(distanceToSegment({ x: 5, y: 5 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBeCloseTo(5);
    expect(distanceToSegment({ x: -3, y: 4 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBeCloseTo(5);
  });
});
