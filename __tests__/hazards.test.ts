import { HAZARD_SCENES, HAZARD_MAX_MISSES, SCENE_WIDTH, SCENE_HEIGHT, evaluateTap, hazardRunPassed } from '@/game/induction/hazards';
import { applyHazardRun, createDefaultSave, migrateSave } from '@/state/save';

describe('hazard scene data', () => {
  test('three scenes, each with 4 hazards inside the scene bounds', () => {
    expect(HAZARD_SCENES.length).toBe(3);
    for (const scene of HAZARD_SCENES) {
      expect(scene.hazards.length).toBe(4);
      for (const h of scene.hazards) {
        expect(h.x - h.r).toBeGreaterThanOrEqual(0);
        expect(h.x + h.r).toBeLessThanOrEqual(SCENE_WIDTH);
        expect(h.y - h.r).toBeGreaterThanOrEqual(0);
        expect(h.y + h.r).toBeLessThanOrEqual(SCENE_HEIGHT);
        expect(h.title.length).toBeGreaterThan(0);
        expect(h.explanation.length).toBeGreaterThan(20);
      }
    }
  });

  test('ids are unique and hotspots in a scene never overlap', () => {
    const ids = HAZARD_SCENES.flatMap((s) => [s.id, ...s.hazards.map((h) => `${s.id}/${h.id}`)]);
    expect(new Set(ids).size).toBe(ids.length);
    for (const scene of HAZARD_SCENES) {
      scene.hazards.forEach((a, i) =>
        scene.hazards.slice(i + 1).forEach((b) => {
          expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(a.r + b.r);
        }),
      );
    }
  });
});

describe('tapping', () => {
  const scene = HAZARD_SCENES[0];
  const h = scene.hazards[0];

  test('a tap inside a hotspot finds that hazard', () => {
    expect(evaluateTap(scene, [], { x: h.x + h.r * 0.5, y: h.y })).toEqual({ kind: 'found', hazardId: h.id });
  });

  test('tapping an already found hazard is neither a find nor a miss', () => {
    expect(evaluateTap(scene, [h.id], { x: h.x, y: h.y })).toEqual({ kind: 'repeat', hazardId: h.id });
  });

  test('a tap on empty ground is a miss', () => {
    expect(evaluateTap(scene, [], { x: -50, y: -50 })).toEqual({ kind: 'miss' });
  });

  test('passing needs every hazard and at most the allowed misses', () => {
    expect(hazardRunPassed(scene, 4, HAZARD_MAX_MISSES)).toBe(true);
    expect(hazardRunPassed(scene, 4, HAZARD_MAX_MISSES + 1)).toBe(false);
    expect(hazardRunPassed(scene, 3, 0)).toBe(false);
  });
});

describe('hazard progress in the save', () => {
  test('keeps the best result, counts attempts, stamps the first pass once', () => {
    let save = createDefaultSave();
    save = applyHazardRun(save, 'loading-area', { found: 3, total: 4, misses: 1 }, 1000);
    expect(save.induction.hazards['loading-area']).toEqual({ bestFound: 3, total: 4, attempts: 1, passedAt: null });
    save = applyHazardRun(save, 'loading-area', { found: 4, total: 4, misses: 2 }, 2000);
    save = applyHazardRun(save, 'loading-area', { found: 2, total: 4, misses: 9 }, 3000);
    expect(save.induction.hazards['loading-area']).toEqual({ bestFound: 4, total: 4, attempts: 3, passedAt: 2000 });
  });

  test('older saves load with empty hazard progress', () => {
    const migrated = migrateSave({ induction: { modules: {}, traineeName: 'A', certifiedAt: null } } as never);
    expect(migrated.induction.hazards).toEqual({});
    expect(migrated.induction.traineeName).toBe('A');
  });
});
