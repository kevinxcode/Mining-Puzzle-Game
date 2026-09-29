/**
 * Training report for supervisors / HSE: one CSV row per induction activity.
 * Pure so it can be tested; the screen writes it to a file and shares it.
 */

import { certificateExpiresAt, type InductionState } from '@/state/save';
import { HAZARD_SCENES } from './hazards';
import { DEFAULT_CONTENT_PACK, type ContentPack } from './contentPack';
import { t, tx, type MessageKey } from '@/i18n/core';

/** UTF-8 byte-order mark; Excel needs it to detect the encoding. */
export const BOM = String.fromCharCode(0xfeff);

const HEADER_KEYS = [
  'induction.csv.trainee',
  'induction.csv.employeeId',
  'induction.csv.site',
  'induction.csv.company',
  'induction.csv.activityType',
  'induction.csv.activity',
  'induction.csv.status',
  'induction.csv.best',
  'induction.csv.attempts',
  'induction.csv.passedOn',
  'induction.csv.validUntil',
  'induction.csv.reportDate',
] as const satisfies readonly MessageKey[];

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Dates stay ISO (YYYY-MM-DD) in every language so spreadsheets sort and parse them. */
const isoDate = (t: number | null | undefined): string => (t ? new Date(t).toISOString().slice(0, 10) : '');

interface Row {
  type: string;
  title: string;
  passedAt: number | null;
  best: string;
  attempts: number;
  started: boolean;
}

export function buildTrainingReportCsv(
  induction: InductionState,
  now: number,
  pack: ContentPack = DEFAULT_CONTENT_PACK,
): string {
  const INDUCTION_MODULES = pack.modules;
  const PRESTART_SCENARIOS = pack.prestart;
  const trainee = induction.traineeName.trim() || t('induction.trainee');
  const rows: Row[] = [
    ...INDUCTION_MODULES.map((m) => {
      const r = induction.modules[m.id];
      return { type: t('induction.csv.module'), title: m.title, passedAt: r?.completedAt ?? null, best: r ? `${r.bestScore}/${r.total}` : '', attempts: r?.attempts ?? 0, started: Boolean(r) };
    }),
    ...HAZARD_SCENES.map((s) => {
      const r = induction.hazards[s.id];
      return { type: t('induction.csv.hazard'), title: tx(s.title), passedAt: r?.passedAt ?? null, best: r ? `${r.bestFound}/${r.total}` : '', attempts: r?.attempts ?? 0, started: Boolean(r) };
    }),
    ...PRESTART_SCENARIOS.map((s) => {
      const r = induction.prestart[s.id];
      return { type: t('induction.csv.prestart'), title: s.title, passedAt: r?.passedAt ?? null, best: r ? `${r.bestCorrect}/${r.total}` : '', attempts: r?.attempts ?? 0, started: Boolean(r) };
    }),
  ];
  const reportDate = isoDate(now);
  const validUntil = isoDate(certificateExpiresAt(induction));
  const identity = [trainee, induction.employeeId.trim(), induction.site.trim(), induction.company.trim()];
  const lines = [HEADER_KEYS.map((k) => csvCell(t(k))).join(',')];
  for (const row of rows) {
    const status = row.passedAt ? t('induction.csv.passed') : row.started ? t('induction.csv.inProgress') : t('induction.csv.notStarted');
    lines.push(
      [...identity, row.type, row.title, status, row.best, row.attempts, isoDate(row.passedAt), validUntil, reportDate]
        .map(csvCell)
        .join(','),
    );
  }
  // BOM: Excel otherwise opens UTF-8 CSV files with the wrong encoding.
  return `${BOM}${lines.join('\n')}\n`;
}
