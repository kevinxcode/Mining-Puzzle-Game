import { INDUCTION_MODULES, INDUCTION_MODULE_IDS, getInductionModule } from '@/game/induction/modules';
import { GLOSSARY } from '@/game/induction/glossary';
import { correctOptionId, scoreQuiz } from '@/game/induction/quiz';
import { getLevelById } from '@/game/levels/levelFactory';
import {
  MAX_TRAINEE_NAME,
  SAVE_VERSION,
  applyInductionQuiz,
  createDefaultSave,
  deserializeSave,
  inductionProgress,
  serializeSave,
  setTraineeName,
} from '@/state/save';

describe('induction module data', () => {
  test('has about six modules with unique ids and sequential numbers', () => {
    expect(INDUCTION_MODULES.length).toBeGreaterThanOrEqual(5);
    expect(new Set(INDUCTION_MODULE_IDS).size).toBe(INDUCTION_MODULES.length);
    INDUCTION_MODULES.forEach((m, i) => expect(m.number).toBe(i + 1));
  });

  test.each(INDUCTION_MODULES.map((m) => [m.id, m] as const))('%s is well formed', (_id, module) => {
    expect(module.cards.length).toBeGreaterThanOrEqual(2);
    expect(module.cards.length).toBeLessThanOrEqual(4);
    expect(new Set(module.cards.map((c) => c.id)).size).toBe(module.cards.length);
    for (const card of module.cards) {
      expect(card.title.trim()).not.toBe('');
      expect(card.body.trim()).not.toBe('');
    }
    expect(module.questions.length).toBeGreaterThanOrEqual(2);
    expect(module.questions.length).toBeLessThanOrEqual(3);
    for (const q of module.questions) {
      expect(q.options.length).toBeGreaterThanOrEqual(2);
      expect(q.options.filter((o) => o.correct)).toHaveLength(1);
      expect(new Set(q.options.map((o) => o.id)).size).toBe(q.options.length);
      expect(q.explanation.trim()).not.toBe('');
    }
    expect(getLevelById(module.practiceLevelId)).toBeDefined();
  });

  test('question ids are unique across the track', () => {
    const ids = INDUCTION_MODULES.flatMap((m) => m.questions.map((q) => q.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('glossary covers core terms without duplicates', () => {
    const terms = GLOSSARY.map((g) => g.term.toLowerCase());
    expect(new Set(terms).size).toBe(terms.length);
    for (const required of ['payload', 'cycle time', 'bucket pass', 'queue time', 'utilization', 'haul road', 'dump point', 'overburden', 'ore', 'windrow', 'spotting']) {
      expect(terms).toContain(required);
    }
  });

  test('getInductionModule finds by id', () => {
    expect(getInductionModule('safety')?.title).toBeTruthy();
    expect(getInductionModule('nope')).toBeUndefined();
  });
});

describe('quiz scoring', () => {
  const module = INDUCTION_MODULES[0];
  const allCorrect = Object.fromEntries(module.questions.map((q) => [q.id, correctOptionId(q)]));
  const wrong = (qId: string) => module.questions.find((q) => q.id === qId)!.options.find((o) => !o.correct)!.id;

  test('all correct passes', () => {
    expect(scoreQuiz(module.questions, allCorrect)).toEqual({ correct: 3, total: 3, passed: true });
  });

  test('2 of 3 passes, 1 of 3 fails', () => {
    const [q1, q2] = module.questions;
    expect(scoreQuiz(module.questions, { ...allCorrect, [q1.id]: wrong(q1.id) }).passed).toBe(true);
    const oneRight = { ...allCorrect, [q1.id]: wrong(q1.id), [q2.id]: wrong(q2.id) };
    expect(scoreQuiz(module.questions, oneRight)).toEqual({ correct: 1, total: 3, passed: false });
  });

  test('two-question quiz needs both correct', () => {
    const two = INDUCTION_MODULES.find((m) => m.questions.length === 2)!;
    const answers = Object.fromEntries(two.questions.map((q) => [q.id, correctOptionId(q)]));
    expect(scoreQuiz(two.questions, answers).passed).toBe(true);
    const [q1] = two.questions;
    const bad = two.questions[0].options.find((o) => !o.correct)!.id;
    expect(scoreQuiz(two.questions, { ...answers, [q1.id]: bad }).passed).toBe(false);
  });

  test('unanswered and unknown options count as wrong', () => {
    expect(scoreQuiz(module.questions, {}).correct).toBe(0);
    expect(scoreQuiz(module.questions, { [module.questions[0].id]: 'zzz' }).correct).toBe(0);
  });
});

describe('induction progress save', () => {
  const pass = { correct: 3, total: 3, passed: true };
  const fail = { correct: 1, total: 3, passed: false };

  test('default save has empty induction', () => {
    const save = createDefaultSave();
    expect(save.induction).toEqual({ modules: {}, traineeName: '', certifiedAt: null });
  });

  test('failed attempt records score but not completion; later pass completes', () => {
    let save = applyInductionQuiz(createDefaultSave(), 'haul-cycle', fail, INDUCTION_MODULE_IDS, 100);
    expect(save.induction.modules['haul-cycle']).toEqual({ bestScore: 1, total: 3, completedAt: null, attempts: 1 });
    save = applyInductionQuiz(save, 'haul-cycle', pass, INDUCTION_MODULE_IDS, 200);
    expect(save.induction.modules['haul-cycle']).toEqual({ bestScore: 3, total: 3, completedAt: 200, attempts: 2 });
    // A worse retake keeps best score and completion.
    save = applyInductionQuiz(save, 'haul-cycle', fail, INDUCTION_MODULE_IDS, 300);
    expect(save.induction.modules['haul-cycle']).toMatchObject({ bestScore: 3, completedAt: 200, attempts: 3 });
    expect(inductionProgress(save.induction, INDUCTION_MODULE_IDS).completed).toBe(1);
  });

  test('certificate date is set once all modules pass', () => {
    let save = createDefaultSave();
    INDUCTION_MODULE_IDS.forEach((id, i) => {
      expect(save.induction.certifiedAt).toBeNull();
      save = applyInductionQuiz(save, id, pass, INDUCTION_MODULE_IDS, 1000 + i);
    });
    expect(save.induction.certifiedAt).toBe(1000 + INDUCTION_MODULE_IDS.length - 1);
    save = applyInductionQuiz(save, INDUCTION_MODULE_IDS[0], pass, INDUCTION_MODULE_IDS, 99999);
    expect(save.induction.certifiedAt).toBe(1000 + INDUCTION_MODULE_IDS.length - 1);
    expect(inductionProgress(save.induction, INDUCTION_MODULE_IDS).fraction).toBe(1);
  });

  test('trainee name is trimmed and length-limited', () => {
    const save = setTraineeName(createDefaultSave(), '   Alex   Doe');
    expect(save.induction.traineeName).toBe('Alex Doe');
    expect(setTraineeName(save, 'x'.repeat(100)).induction.traineeName).toHaveLength(MAX_TRAINEE_NAME);
  });

  test('round-trips induction through serialize/deserialize', () => {
    let save = applyInductionQuiz(createDefaultSave(), 'fuel', pass, INDUCTION_MODULE_IDS, 5);
    save = setTraineeName(save, 'Sam');
    expect(deserializeSave(serializeSave(save))).toEqual(save);
  });

  test('v1 save without induction migrates with defaults and keeps progress', () => {
    const v1 = JSON.stringify({
      version: 1,
      xp: 300,
      coins: 50,
      levels: { '1': { stars: 2, bestTimeSeconds: 100, bestScore: 200 } },
      upgrades: {},
      achievements: {},
      settings: { music: false, sfx: true, haptics: true },
      lastPlayedLevelId: '1',
    });
    const restored = deserializeSave(v1);
    expect(SAVE_VERSION).toBe(2);
    expect(restored.version).toBe(2);
    expect(restored.xp).toBe(300);
    expect(restored.levels['1'].stars).toBe(2);
    expect(restored.settings.music).toBe(false);
    expect(restored.induction).toEqual({ modules: {}, traineeName: '', certifiedAt: null });
  });

  test('malformed induction data is sanitized instead of crashing', () => {
    const restored = deserializeSave(
      JSON.stringify({ xp: 0, coins: 0, induction: { modules: { a: null, b: { bestScore: 'x', completedAt: 7 } }, traineeName: 42 } }),
    );
    expect(restored.induction.modules).toEqual({ b: { bestScore: 0, total: 0, completedAt: 7, attempts: 0 } });
    expect(restored.induction.traineeName).toBe('');
    expect(restored.induction.certifiedAt).toBeNull();
  });
});
