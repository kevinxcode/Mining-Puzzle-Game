import { PRESTART_SCENARIOS, correctDecision, scorePrestart } from '@/game/induction/prestart';
import { applyPrestartRun, createDefaultSave, migrateSave } from '@/state/save';

describe('pre-start scenario data', () => {
  test('three trucks with 8 unique checklist items each', () => {
    expect(PRESTART_SCENARIOS.length).toBe(3);
    for (const s of PRESTART_SCENARIOS) {
      expect(s.items.length).toBe(8);
      expect(new Set(s.items.map((i) => i.id)).size).toBe(8);
      for (const item of s.items) {
        expect(item.observation.length).toBeGreaterThan(10);
        expect(item.explanation.length).toBeGreaterThan(20);
        if (item.critical) expect(item.defect).toBe(true);
      }
    }
  });

  test('scenarios cover both outcomes: at least one safe truck and one tag-out', () => {
    const decisions = PRESTART_SCENARIOS.map(correctDecision);
    expect(decisions).toContain('operate');
    expect(decisions).toContain('tag-out');
  });
});

describe('scoring', () => {
  const scenario = PRESTART_SCENARIOS.find((s) => correctDecision(s) === 'tag-out')!;
  const perfect = Object.fromEntries(scenario.items.map((i) => [i.id, i.defect]));

  test('a perfect inspection passes', () => {
    const r = scorePrestart(scenario, perfect, 'tag-out');
    expect(r).toMatchObject({ correctItems: 8, missedCritical: 0, decisionCorrect: true, passed: true });
  });

  test('missing a critical defect fails even with the right decision', () => {
    const critical = scenario.items.find((i) => i.critical)!;
    const r = scorePrestart(scenario, { ...perfect, [critical.id]: false }, 'tag-out');
    expect(r.missedCritical).toBe(1);
    expect(r.passed).toBe(false);
  });

  test('the wrong final decision fails', () => {
    expect(scorePrestart(scenario, perfect, 'operate').passed).toBe(false);
  });

  test('one non-critical mistake is allowed, two are not', () => {
    const minor = scenario.items.filter((i) => !i.critical);
    const one = { ...perfect, [minor[0].id]: !minor[0].defect };
    expect(scorePrestart(scenario, one, 'tag-out').passed).toBe(true);
    const two = { ...one, [minor[1].id]: !minor[1].defect };
    expect(scorePrestart(scenario, two, 'tag-out').passed).toBe(false);
  });

  test('unanswered items count as wrong', () => {
    expect(scorePrestart(scenario, {}, 'tag-out').correctItems).toBe(0);
  });
});

describe('pre-start progress in the save', () => {
  test('keeps best score and first pass', () => {
    let save = createDefaultSave();
    save = applyPrestartRun(save, 'truck-a', { correct: 6, total: 8, passed: false }, 100);
    save = applyPrestartRun(save, 'truck-a', { correct: 8, total: 8, passed: true }, 200);
    save = applyPrestartRun(save, 'truck-a', { correct: 5, total: 8, passed: false }, 300);
    expect(save.induction.prestart['truck-a']).toEqual({ bestCorrect: 8, total: 8, attempts: 3, passedAt: 200 });
  });

  test('older saves load with empty pre-start progress', () => {
    expect(migrateSave({} as never).induction.prestart).toEqual({});
  });
});
