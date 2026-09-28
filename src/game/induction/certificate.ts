/**
 * Induction certificate — printable HTML (rendered to PDF by expo-print).
 * Pure so it can be tested without native modules.
 */

import { certificateExpiresAt, type InductionState } from '@/state/save';
import { HAZARD_SCENES } from './hazards';
import { DEFAULT_CONTENT_PACK, type ContentPack } from './contentPack';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** ISO date (YYYY-MM-DD) in UTC so the certificate reads the same everywhere. */
function isoDate(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

export function buildCertificateHtml(induction: InductionState, pack: ContentPack = DEFAULT_CONTENT_PACK): string {
  const INDUCTION_MODULES = pack.modules;
  const PRESTART_SCENARIOS = pack.prestart;
  if (induction.certifiedAt === null) {
    throw new Error('Certificate is only available once every module is passed.');
  }
  const name = escapeHtml(induction.traineeName.trim() || 'Trainee');
  const identity = [
    induction.employeeId.trim() && `Employee ID: ${escapeHtml(induction.employeeId.trim())}`,
    induction.site.trim() && `Site: ${escapeHtml(induction.site.trim())}`,
    induction.company.trim() && `Company: ${escapeHtml(induction.company.trim())}`,
  ].filter(Boolean);
  const identityLine = identity.length ? `<p class="identity">${identity.join(' · ')}</p>` : '';
  const rows = INDUCTION_MODULES.map((module, index) => {
    const record = induction.modules[module.id];
    const score = record ? `${record.bestScore}/${record.total}` : '—';
    return `<tr><td>${index + 1}</td><td>${escapeHtml(module.title)}</td><td class="score">${score}</td></tr>`;
  }).join('');
  const practical = (label: string, entries: { title: string; best: string; passed: boolean }[]) =>
    `<h2>${label}</h2><table>${entries
      .map(
        (e) =>
          `<tr><td>${escapeHtml(e.title)}</td><td class="score">${e.best}</td><td class="status">${e.passed ? 'Passed' : e.best === '—' ? 'Not attempted' : 'In progress'}</td></tr>`,
      )
      .join('')}</table>`;
  const hazardRows = practical(
    'Hazard spotting',
    HAZARD_SCENES.map((s) => {
      const r = induction.hazards[s.id];
      return { title: s.title, best: r ? `${r.bestFound}/${r.total}` : '—', passed: Boolean(r?.passedAt) };
    }),
  );
  const prestartRows = practical(
    'Pre-start check',
    PRESTART_SCENARIOS.map((s) => {
      const r = induction.prestart[s.id];
      return { title: s.title, best: r ? `${r.bestCorrect}/${r.total}` : '—', passed: Boolean(r?.passedAt) };
    }),
  );

  return `<!doctype html>
<html><head><meta charset="utf-8" />
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
  <div class="eyebrow">MINING PUZZLE GAME · SITE INDUCTION</div>
  <p class="pack">${escapeHtml(pack.name)} v${escapeHtml(pack.version)}</p>
  <h1>Induction Certificate</h1>
  <p>This certifies that</p>
  <div class="name">${name}</div>
  ${identityLine}
  <p>has completed all ${INDUCTION_MODULES.length} Site Induction modules and passed each knowledge check.</p>
  <table>${rows}</table>
  ${hazardRows}
  ${prestartRows}
  <p class="meta">Issued: ${isoDate(induction.certifiedAt)} · Valid until: ${isoDate(certificateExpiresAt(induction)!)}</p>
  <p class="note">Game-based training record generated on the trainee's device. It is not an official site induction and does not replace your site's required safety training.</p>
</div></body></html>`;
}
