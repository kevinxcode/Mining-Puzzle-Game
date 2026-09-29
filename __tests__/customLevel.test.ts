import {
  addNode,
  compileDraft,
  createDraft,
  cycleRoadKind,
  moveNode,
  removeNode,
  roadKind,
  snapToGrid,
  toggleRoad,
  type LevelDraft,
} from '@/game/editor/customLevel';
import { SimController } from '@/game/simController';

const fresh = (): LevelDraft => createDraft('custom-test', 0);

function playHeadless(draft: LevelDraft) {
  const compiled = compileDraft(draft);
  if (!compiled.ok) throw new Error(JSON.stringify(compiled.issues));
  const ctrl = new SimController(compiled.level);
  ctrl.start();
  ctrl.dispose();
  for (let i = 0; i < 200_000 && ctrl.state.status === 'running'; i += 1) ctrl.stepOnce();
  return ctrl.state;
}

describe('level editor model', () => {
  it('the starter draft compiles and is winnable', () => {
    const state = playHeadless(fresh());
    expect(state.status).toBe('success');
  });

  it('snaps to the grid and refuses stacked nodes', () => {
    expect(snapToGrid(47)).toBe(50);
    expect(snapToGrid(-5)).toBe(10);
    expect(snapToGrid(99)).toBe(90);
    const d = fresh();
    expect(addNode(d, 'junction', 51, 49)).toBe(d); // (50,50) is taken
    const moved = moveNode(d, 'ex1', 80, 20); // onto dump1
    expect(moved).toBe(d);
  });

  it('allows only one fuel station and never removes the standby yard', () => {
    const d = addNode(fresh(), 'fuel', 30, 70);
    expect(addNode(d, 'fuel', 70, 70)).toBe(d);
    expect(removeNode(d, 'park')).toBe(d);
  });

  it('removing a node removes its roads', () => {
    const d = removeNode(fresh(), 'j1');
    expect(d.roads).toHaveLength(0);
  });

  it('toggles roads and cycles their kind', () => {
    let d = toggleRoad(fresh(), 'ex1', 'dump1');
    expect(d.roads).toHaveLength(4);
    const id = d.roads[3].id;
    const kinds = [];
    for (let i = 0; i < 4; i += 1) {
      d = cycleRoadKind(d, id);
      kinds.push(roadKind(d.roads.find((r) => r.id === id)!));
    }
    expect(kinds).toEqual(['narrow', 'mud', 'one-way', 'normal']);
    d = toggleRoad(d, 'dump1', 'ex1');
    expect(d.roads).toHaveLength(3);
  });

  it('offers an alternative route when the map has one', () => {
    const d = toggleRoad(fresh(), 'ex1', 'dump1');
    const compiled = compileDraft(d);
    expect(compiled.ok).toBe(true);
    if (compiled.ok) expect(compiled.level.map.routes.map((r) => r.nodePath.join('>'))).toEqual(['ex1>dump1', 'ex1>j1>dump1']);
  });

  it('reports why a layout cannot be played', () => {
    const noRoads = { ...fresh(), roads: [] };
    const r = compileDraft(noRoads);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.map((i) => i.code).sort()).toEqual(['excavator-no-dump', 'parking-unreachable']);

    const wrongMaterial = { ...fresh(), nodes: fresh().nodes.map((n) => (n.id === 'dump1' ? { ...n, materialId: 'coal' as const } : n)) };
    const w = compileDraft(wrongMaterial);
    expect(w.ok).toBe(false);

    const noTrucks = compileDraft({ ...fresh(), trucks: [] });
    expect(noTrucks.ok).toBe(false);
  });

  it('respects one-way roads when routing', () => {
    // Make ex1→j1 one-way the wrong way (j1→ex1): no route out of the pit.
    let d = fresh();
    d = { ...d, roads: d.roads.map((r) => (r.id === 'r1' ? { ...r, from: 'j1', to: 'ex1', oneWay: true } : r)) };
    expect(compileDraft(d).ok).toBe(false);
  });
});

describe('custom levels in the level resolver', () => {
  const { registerCustomLevelResolver, resolveLevel, nextRouteAfter } = jest.requireActual('@/game/levels/modeLevels');
  it('resolves custom ids through the registered resolver only', () => {
    const compiled = compileDraft(createDraft('custom-abc123', 0));
    if (!compiled.ok) throw new Error('starter draft should compile');
    registerCustomLevelResolver((id: string) => (id === 'custom-abc123' ? compiled.level : undefined));
    expect(resolveLevel('custom-abc123')?.id).toBe('custom-abc123');
    expect(resolveLevel('custom-missing')).toBeUndefined();
    expect(resolveLevel('3')?.id).toBe('3');
    expect(nextRouteAfter('custom-abc123', 60)).toBe('/editor');
  });
});
