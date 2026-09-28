import { DEFAULT_CONTENT_PACK, parseContentPack, contentPackJson, type ContentPack } from '@/game/induction/contentPack';
import { buildCertificateHtml } from '@/game/induction/certificate';
import { buildTrainingReportCsv, BOM } from '@/game/induction/report';
import { certificateStatus, createDefaultInduction, applyInductionQuiz, createDefaultSave } from '@/state/save';

const clone = (): ContentPack => JSON.parse(JSON.stringify(DEFAULT_CONTENT_PACK));

describe('default content pack', () => {
  test('is built from the bundled content and passes validation', () => {
    expect(DEFAULT_CONTENT_PACK.modules.length).toBe(6);
    expect(DEFAULT_CONTENT_PACK.prestart.length).toBe(3);
    const result = parseContentPack(contentPackJson(DEFAULT_CONTENT_PACK));
    expect(result.ok).toBe(true);
  });
});

describe('validation', () => {
  const errorsFor = (mutate: (p: ContentPack) => void) => {
    const pack = clone();
    mutate(pack);
    const r = parseContentPack(JSON.stringify(pack));
    return r.ok ? [] : r.errors;
  };

  test('rejects invalid JSON with a readable message', () => {
    const r = parseContentPack('{ not json');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]).toMatch(/JSON/);
  });

  test('requires a name, a version and at least one module', () => {
    expect(errorsFor((p) => { p.name = ''; })).toContainEqual(expect.stringMatching(/name/));
    expect(errorsFor((p) => { (p as { version: unknown }).version = ''; })).toContainEqual(expect.stringMatching(/version/));
    expect(errorsFor((p) => { p.modules = []; })).toContainEqual(expect.stringMatching(/at least one module/));
  });

  test('each question needs exactly one correct option', () => {
    const errs = errorsFor((p) => { p.modules[0].questions[0].options.forEach((o) => { o.correct = true; }); });
    expect(errs.join('\n')).toMatch(/exactly one correct/);
  });

  test('module ids must be unique and practice levels must exist', () => {
    expect(errorsFor((p) => { p.modules[1].id = p.modules[0].id; }).join('\n')).toMatch(/duplicate module id/);
    expect(errorsFor((p) => { p.modules[0].practiceLevelId = '99'; }).join('\n')).toMatch(/practice level/);
  });

  test('pre-start: critical items must be defects; ids unique', () => {
    expect(errorsFor((p) => { p.prestart[0].items[0].critical = true; p.prestart[0].items[0].defect = false; }).join('\n')).toMatch(/critical/);
    expect(errorsFor((p) => { p.prestart[0].items[1].id = p.prestart[0].items[0].id; }).join('\n')).toMatch(/duplicate item id/);
  });

  test('rejects packs that are too large to be sensible', () => {
    const r = parseContentPack('x'.repeat(600_000));
    expect(r.ok).toBe(false);
  });
});

describe('custom packs drive certificate, report and certification', () => {
  const pack = clone();
  pack.name = 'North Pit Induction';
  pack.version = '2026.2';
  pack.modules = pack.modules.slice(0, 2);
  pack.modules[0].title = 'North Pit Traffic Rules';

  test('certificate and report list only the pack modules and show the pack', () => {
    const induction = createDefaultInduction();
    for (const m of pack.modules) induction.modules[m.id] = { bestScore: 3, total: 3, completedAt: 1, attempts: 1 };
    induction.certifiedAt = Date.UTC(2026, 8, 28);
    induction.certifiedContentVersion = pack.version;
    const html = buildCertificateHtml(induction, pack);
    expect(html).toContain('North Pit Traffic Rules');
    expect(html).toContain('North Pit Induction v2026.2');
    expect(html).toContain('all 2 Site Induction modules');
    const rows = buildTrainingReportCsv(induction, Date.now(), pack).replace(BOM, '').trim().split('\n');
    expect(rows.filter((r) => r.includes(',Module,')).length).toBe(2);
  });

  test('certification records the content version; a new version makes it outdated', () => {
    let save = createDefaultSave();
    const ids = pack.modules.map((m) => m.id);
    for (const id of ids) save = applyInductionQuiz(save, id, { correct: 3, total: 3, passed: true }, ids, 1000, pack.version);
    expect(save.induction.certifiedContentVersion).toBe('2026.2');
    expect(certificateStatus(save.induction, 2000, '2026.2')).toBe('valid');
    expect(certificateStatus(save.induction, 2000, '2026.3')).toBe('outdated');
  });
});
