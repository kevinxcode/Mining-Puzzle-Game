import { SimController } from '@/game/simController';
import { getLevelByNumber } from '@/game/levels/levelFactory';

describe('undo player moves', () => {
  test('undo restores the previous excavator and route', () => {
    const level = getLevelByNumber(20);
    const sim = new SimController(level);
    const truck = sim.state.trucks[0];
    const before = { ex: truck.assignedExcavatorId, route: truck.routeId };
    const other = level.excavators.find((e) => e.id !== before.ex)!;

    expect(sim.canUndo).toBe(false);
    expect(sim.assignTruck(truck.id, other.id)).toBe(true);
    expect(sim.canUndo).toBe(true);
    expect(sim.undo()).toBe(true);

    expect(truck.assignedExcavatorId).toBe(before.ex);
    expect(truck.routeId).toBe(before.route);
    expect(sim.canUndo).toBe(false);
    sim.dispose();
  });

  test('undo reverts a reroute', () => {
    const level = getLevelByNumber(1);
    const sim = new SimController(level);
    const truck = sim.state.trucks[0];
    const before = truck.routeId;
    const alt = level.map.routes.find((r) => r.id !== before && r.nodePath[0] === level.excavators[0].nodeId)!;
    expect(sim.setTruckRoute(truck.id, alt.id)).toBe(true);
    expect(sim.undo()).toBe(true);
    expect(truck.routeId).toBe(before);
    sim.dispose();
  });

  test('failed moves are not recorded and undo with no history does nothing', () => {
    const level = getLevelByNumber(1);
    const sim = new SimController(level);
    expect(sim.assignTruck(sim.state.trucks[0].id, 'nope')).toBe(false);
    expect(sim.canUndo).toBe(false);
    expect(sim.undo()).toBe(false);
    sim.dispose();
  });

  test('keeps at most five steps of history', () => {
    const level = getLevelByNumber(1);
    const sim = new SimController(level);
    const truck = sim.state.trucks[0];
    const routes = level.map.routes.filter((r) => r.nodePath[0] === level.excavators[0].nodeId);
    for (let i = 0; i < 8; i += 1) sim.setTruckRoute(truck.id, routes[(i + 1) % routes.length].id);
    let undone = 0;
    while (sim.undo()) undone += 1;
    expect(undone).toBe(5);
    sim.dispose();
  });
});
