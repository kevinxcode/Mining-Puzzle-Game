import { DEFAULT_CONTENT_PACK, contentPackJson, parseContentPack } from '@/game/induction/contentPack';
import { DEFAULT_CONTENT_PACK_ID } from '@/game/induction/contentPackId';
import { HAZARD_SCENES } from '@/game/induction/hazards';
import { buildCertificateHtml } from '@/game/induction/certificate';
import { BOM, buildTrainingReportCsv } from '@/game/induction/report';
import { setLanguageNow, tx } from '@/i18n/core';
import { createDefaultInduction } from '@/state/save';

/** Text fields that are translated; everything else must match the English pack exactly. */
const TEXT_KEYS = new Set([
  'name', 'title', 'summary', 'practiceNote', 'body', 'keyPoint', 'prompt', 'text', 'explanation',
  'term', 'definition', 'brief', 'label', 'observation',
]);

/** Replaces every translated string with a marker, keeping ids, numbers, flags and array shapes. */
function skeleton(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(skeleton);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, TEXT_KEYS.has(k) ? `<${typeof v}>` : skeleton(v)]),
    );
  }
  return value;
}

function texts(value: unknown, out: string[] = []): string[] {
  if (Array.isArray(value)) value.forEach((v) => texts(v, out));
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (TEXT_KEYS.has(k) && typeof v === 'string') out.push(v);
      else texts(v, out);
    }
  }
  return out;
}

describe('Indonesian built-in content pack', () => {
  afterEach(() => setLanguageNow('en'));

  test('has exactly the same structure, ids, answers and flags as the English pack', () => {
    expect(skeleton(DEFAULT_CONTENT_PACK_ID)).toEqual(skeleton(DEFAULT_CONTENT_PACK));
    expect(DEFAULT_CONTENT_PACK_ID.version).toBe(DEFAULT_CONTENT_PACK.version);
    expect(DEFAULT_CONTENT_PACK_ID.format).toBe(DEFAULT_CONTENT_PACK.format);
  });

  test('passes content-pack validation', () => {
    const result = parseContentPack(contentPackJson(DEFAULT_CONTENT_PACK_ID));
    expect(result.ok).toBe(true);
  });

  test('every text is filled in and none is left in English', () => {
    const en = texts(DEFAULT_CONTENT_PACK);
    const id = texts(DEFAULT_CONTENT_PACK_ID);
    expect(id.length).toBe(en.length);
    const english = new Set(en);
    // Terms kept as the industry loan word on Indonesian sites.
    const allowed = new Set(['Spotting']);
    for (const s of id) {
      expect(s.trim().length).toBeGreaterThan(0);
      if (!allowed.has(s)) expect([s, english.has(s)]).toEqual([s, false]);
    }
  });

  test('every hazard scene text has an Indonesian translation', () => {
    for (const scene of HAZARD_SCENES) {
      for (const s of [scene.title, scene.brief, ...scene.hazards.flatMap((h) => [h.title, h.explanation])]) {
        expect([s, tx(s, 'id') !== s]).toEqual([s, true]);
      }
    }
  });

  test('validation errors are translated in Indonesian and unchanged in English', () => {
    const bad = JSON.stringify({ format: 'x', name: 'A', version: '1', modules: [{}] });
    const en = parseContentPack(bad);
    expect(en.ok).toBe(false);
    if (!en.ok) expect(en.errors).toContain('Module 1: missing "id".');
    setLanguageNow('id');
    const id = parseContentPack(bad);
    if (!id.ok) expect(id.errors).toContain('Modul 1: "id" tidak ada.');
    expect(parseContentPack('{')).toEqual({ ok: false, errors: ['File bukan JSON yang valid.'] });
  });

  test('report and certificate use Indonesian labels and dates, same CSV column order', () => {
    const T = Date.UTC(2026, 8, 27);
    const s = createDefaultInduction();
    for (const m of DEFAULT_CONTENT_PACK_ID.modules) s.modules[m.id] = { bestScore: 3, total: 3, completedAt: T, attempts: 1 };
    s.certifiedAt = T;
    setLanguageNow('id');
    const csv = buildTrainingReportCsv(s, T, DEFAULT_CONTENT_PACK_ID).replace(BOM, '');
    const [header, first] = csv.split('\n');
    expect(header.split(',')).toHaveLength(12);
    expect(header.startsWith('Peserta,Nomor Induk Karyawan,Site,Perusahaan,Jenis kegiatan')).toBe(true);
    expect(first).toBe(`Peserta,,,,Modul,${DEFAULT_CONTENT_PACK_ID.modules[0].title},Lulus,3/3,1,2026-09-27,2027-09-27,2026-09-27`);
    const html = buildCertificateHtml(s, DEFAULT_CONTENT_PACK_ID);
    expect(html).toContain('Sertifikat Induksi');
    expect(html).toContain('27 September 2026');
    expect(html).toContain(tx(HAZARD_SCENES[0].title, 'id'));
  });
});
