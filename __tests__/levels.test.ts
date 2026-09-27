import { LEVELS, REGIONS, TOTAL_LEVELS, getLevelById } from '@/game/levels/levelFactory';
import { roadBetween } from '@/game/engine/routeEngine';

describe('level data', () => {
  test('has 60 levels across 6 regions', () => {
    expect(TOTAL_LEVELS).toBe(60);
    expect(REGIONS).toHaveLength(6);
    for (const region of REGIONS) {
      const count = LEVELS.filter((l) => l.regionId === region.id).length;
      expect(count).toBe(10);
    }
  });

  test('level ids are unique and sequential', () => {
    const ids = LEVELS.map((l) => l.id);
    expect(new Set(ids).size).toBe(60);
    ids.forEach((id, i) => expect(id).toBe(String(i + 1)));
  });

  test('every route exists in the map and starts at its excavator node', () => {
    for (const level of LEVELS) {
      for (const truck of level.trucks) {
        const route = level.map.routes.find((r) => r.id === truck.routeId);
        expect(route).toBeDefined();
        expect(route!.nodePath[0]).toBe(truck.assignedExcavatorId);
        for (let i = 0; i < route!.nodePath.length - 1; i += 1) {
          const road = roadBetween(level.map, route!.nodePath[i], route!.nodePath[i + 1]);
          expect(road).not.toBeNull();
        }
      }
    }
  });

  test('every excavator has a node and a matching dump for its material', () => {
    for (const level of LEVELS) {
      for (const excavator of level.excavators) {
        const node = level.map.nodes.find((n) => n.id === excavator.nodeId);
        expect(node).toBeDefined();
        expect(node!.materialId).toBeDefined();
        const dump = level.map.nodes.find(
          (n) => n.type === 'dump' && n.materialId === node!.materialId,
        );
        expect(dump).toBeDefined();
      }
    }
  });

  test('every level has objectives, star thresholds and resolves by id', () => {
    for (const level of LEVELS) {
      expect(level.objectives.length).toBeGreaterThanOrEqual(1);
      expect(level.objectives[0].kind).toBe('tons');
      expect(level.timeLimit).toBeGreaterThan(0);
      expect(level.starThresholds.star2TimeSeconds).toBeDefined();
      expect(getLevelById(level.id)).toBe(level);
    }
  });

  test('every truck spec has a full fuel tank and the parking yard is connected', () => {
    for (const level of LEVELS) {
      const park = level.map.nodes.find((n) => n.type === 'parking');
      expect(park).toBeDefined();
      // Trucks must be able to leave the standby yard.
      const connected = level.map.roads.some((r) => r.from === park!.id || r.to === park!.id);
      expect(connected).toBe(true);
      for (const truck of level.trucks) {
        expect(truck.fuelCapacity).toBeGreaterThan(0);
        expect(truck.speed).toBeGreaterThan(0);
        expect(truck.capacity).toBeGreaterThan(0);
      }
    }
  });
});