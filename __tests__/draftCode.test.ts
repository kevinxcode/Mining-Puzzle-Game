import { addNode, createDraft, cycleRoadKind, toggleRoad } from '@/game/editor/customLevel';
import { decodeLevelCode, encodeLevelCode, sanitizeStoredDraft } from '@/game/editor/draftCode';
import { encodeShareCode } from '@/game/shareCodec';

describe('custom level codes', () => {
  const base = () => {
    let d = createDraft('custom-a1', 5);
    d = addNode(d, 'fuel', 30, 70);
    d = toggleRoad(d, 'ex1', 'dump1');
    d = cycleRoadKind(d, d.roads[3].id); // narrow
    return { ...d, name: 'Pit Jaya ⛏' };
  };

  it('round-trips a draft (without its local id)', () => {
    const d = base();
    const parsed = decodeLevelCode(`Coba level saya:\n${encodeLevelCode(d)}\n`);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.draft).toEqual({
      name: d.name,
      nodes: d.nodes,
      roads: d.roads,
      trucks: d.trucks,
      targetTons: d.targetTons,
      timeLimit: d.timeLimit,
    });
  });

  it('rejects tampered or malformed codes', () => {
    const code = encodeLevelCode(base());
    expect(decodeLevelCode(code.slice(0, -1) + (code.endsWith('0') ? '1' : '0')).ok).toBe(false);
    expect(decodeLevelCode('MPG1.abc.00000000').ok).toBe(false);
    const bad = (payload: unknown) => decodeLevelCode(encodeShareCode('MPL1.', payload)).ok;
    const good = JSON.parse(JSON.stringify({ v: 1, n: 'x', nodes: [['park', 'parking', 50, 90, null]], roads: [], t: ['Standard'], target: 100, time: 300 }));
    expect(bad(good)).toBe(true);
    expect(bad({ ...good, nodes: [['park', 'parking', 55, 90, null]] })).toBe(false); // off grid
    expect(bad({ ...good, nodes: [['park', 'parking', 50, 90, null], ['p2', 'parking', 10, 10, null]] })).toBe(false); // two yards
    expect(bad({ ...good, nodes: [...good.nodes, ['ex1', 'excavator', 10, 10, null]] })).toBe(false); // no material
    expect(bad({ ...good, roads: [['r1', 'park', 'ghost', '']] })).toBe(false); // dangling road
    expect(bad({ ...good, t: ['Monster'] })).toBe(false);
    expect(bad({ ...good, time: 301 })).toBe(false);
    expect(bad({ ...good, target: 5 })).toBe(false);
  });

  it('sanitizes stored drafts and drops broken ones', () => {
    const d = base();
    expect(sanitizeStoredDraft(d)).toEqual(d);
    expect(sanitizeStoredDraft({ ...d, id: 'level-3' })).toBeNull();
    expect(sanitizeStoredDraft({ ...d, nodes: 'nope' })).toBeNull();
  });
});
