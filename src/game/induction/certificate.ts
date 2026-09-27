/**
 * Induction certificate — printable HTML (rendered to PDF by expo-print).
 * Pure so it can be tested without native modules.
 */

import type { InductionState } from '@/state/save';
import { INDUCTION_MODULES } from './modules';

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

export function buildCertificateHtml(induction: InductionState): string {
  if (induction.certifiedAt === null) {
    throw new Error('Certificate is only available once every module is passed.');
  }
  const name = escapeHtml(induction.traineeName.trim() || 'Trainee');
  const rows = INDUCTION_MODULES.map((module, index) => {
    const record = induction.modules[module.id];
    const score = record ? `${record.bestScore}/${record.total}` : '—';
    return `<tr><td>${index + 1}</td><td>${escapeHtml(module.title)}</td><td class="score">${score}</td></tr>`;
  }).join('');

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
  .meta { margin-top: 24px; font-size: 13px; color: #555; }
  .note { margin-top: 24px; font-size: 11px; color: #8A8F98; }
</style></head>
<body><div class="frame">
  <div class="eyebrow">MINING PUZZLE GAME · SITE INDUCTION</div>
  <h1>Induction Certificate</h1>
  <p>This certifies that</p>
  <div class="name">${name}</div>
  <p>has completed all ${INDUCTION_MODULES.length} Site Induction modules and passed each knowledge check.</p>
  <table>${rows}</table>
  <p class="meta">Issued: ${isoDate(induction.certifiedAt)}</p>
  <p class="note">Game-based training record generated on the trainee's device. It is not an official site induction and does not replace your site's required safety training.</p>
</div></body></html>`;
}
