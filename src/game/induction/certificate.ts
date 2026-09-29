/**
 * Induction certificate — printable HTML (rendered to PDF by expo-print).
 * Pure so it can be tested without native modules.
 */

import { certificateExpiresAt, type InductionState } from '@/state/save';
import { HAZARD_SCENES } from './hazards';
import { DEFAULT_CONTENT_PACK, type ContentPack } from './contentPack';
import { getLanguage, t, tx, type Lang } from '@/i18n/core';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const ID_MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

/**
 * Certificate date in UTC so it reads the same everywhere: ISO (YYYY-MM-DD) in
 * English, "27 September 2026" in Indonesian.
 */
export function certificateDate(timestamp: number, lang: Lang = getLanguage()): string {
  const d = new Date(timestamp);
  if (lang === 'id') return `${d.getUTCDate()} ${ID_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  return d.toISOString().slice(0, 10);
}

export function buildCertificateHtml(induction: InductionState, pack: ContentPack = DEFAULT_CONTENT_PACK): string {
  const INDUCTION_MODULES = pack.modules;
  const PRESTART_SCENARIOS = pack.prestart;
  if (induction.certifiedAt === null) {
    throw new Error(t('induction.pdf.notReady'));
  }
  const name = escapeHtml(induction.traineeName.trim() || t('induction.trainee'));
  const identity = [
    induction.employeeId.trim() && t('induction.pdf.employeeId', { value: escapeHtml(induction.employeeId.trim()) }),
    induction.site.trim() && t('induction.pdf.site', { value: escapeHtml(induction.site.trim()) }),
    induction.company.trim() && t('induction.pdf.company', { value: escapeHtml(induction.company.trim()) }),
  ].filter(Boolean);
  const identityLine = identity.length ? `<p class="identity">${identity.join(' · ')}</p>` : '';
  const rows = INDUCTION_MODULES.map((module, index) => {
    const record = induction.modules[module.id];
    const score = record ? `${record.bestScore}/${record.total}` : '—';
    return `<tr><td>${index + 1}</td><td>${escapeHtml(module.title)}</td><td class="score">${score}</td></tr>`;
  }).join('');
  const practical = (label: string, entries: { title: string; best: string; passed: boolean }[]) =>
    `<h2>${escapeHtml(label)}</h2><table>${entries
      .map(
        (e) =>
          `<tr><td>${escapeHtml(e.title)}</td><td class="score">${e.best}</td><td class="status">${e.passed ? t('induction.pdf.passed') : e.best === '—' ? t('induction.pdf.notAttempted') : t('induction.pdf.inProgress')}</td></tr>`,
      )
      .join('')}</table>`;
  const hazardRows = practical(
    t('induction.pdf.hazards'),
    HAZARD_SCENES.map((s) => {
      const r = induction.hazards[s.id];
      return { title: tx(s.title), best: r ? `${r.bestFound}/${r.total}` : '—', passed: Boolean(r?.passedAt) };
    }),
  );
  const prestartRows = practical(
    t('induction.pdf.prestart'),
    PRESTART_SCENARIOS.map((s) => {
      const r = induction.prestart[s.id];
      return { title: s.title, best: r ? `${r.bestCorrect}/${r.total}` : '—', passed: Boolean(r?.passedAt) };
    }),
  );

  return `<!doctype html>
<html lang="${getLanguage()}"><head><meta charset="utf-8" />
<style>
  @page { size: A4; margin: 24mm; }
  body { font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif; color: #22262B; }
  .frame { border: 6px solid #FF7A1A; border-radius: 16px; padding: 32px; }
  .eyebrow { color: #E05E00; letter-spacing: 3px; font-weight: 700; font-size: 12px; }
  h1 { margin: 8px 0 24px; font-size: 32px; }
  .name { font-size: 28px; font-weight: 800; border-bottom: 2px solid #FFC93C; padding-bottom: 6px; display: inline-block; }
  table { width: 100%; border-collapse: collapse; margin-top: 24px; }
  td { padding: 8px 6px; border-bottom: 1px solid #EAE6E3; font-size: 14px; }
  .score { text-align: right; font-weight: 700; }
  .status { text-align: right; color: #555; width: 110px; }
  h2 { font-size: 15px; margin: 22px 0 0; color: #E05E00; letter-spacing: 1px; }
  .pack { margin: 4px 0 0; font-size: 12px; color: #8A8F98; }
  .identity { margin: 8px 0 0; font-size: 13px; color: #555; }
  .meta { margin-top: 24px; font-size: 13px; color: #555; }
  .note { margin-top: 24px; font-size: 11px; color: #8A8F98; }
</style></head>
<body><div class="frame">
  <div class="eyebrow">${escapeHtml(t('induction.pdf.eyebrow'))}</div>
  <p class="pack">${escapeHtml(pack.name)} v${escapeHtml(pack.version)}</p>
  <h1>${escapeHtml(t('induction.cert.title'))}</h1>
  <p>${escapeHtml(t('induction.pdf.certifies'))}</p>
  <div class="name">${name}</div>
  ${identityLine}
  <p>${escapeHtml(t('induction.pdf.completed', { count: INDUCTION_MODULES.length }))}</p>
  <table>${rows}</table>
  ${hazardRows}
  ${prestartRows}
  <p class="meta">${escapeHtml(t('induction.pdf.dates', { issued: certificateDate(induction.certifiedAt), until: certificateDate(certificateExpiresAt(induction)!) }))}</p>
  <p class="note">${escapeHtml(t('induction.pdf.note'))}</p>
</div></body></html>`;
}
