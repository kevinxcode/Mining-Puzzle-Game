/**
 * Training report for supervisors / HSE: one CSV row per induction activity.
 * Pure so it can be tested; the screen writes it to a file and shares it.
 */

import type { InductionState } from '@/state/save';
import { HAZARD_SCENES } from './hazards';
import { INDUCTION_MODULES } from './modules';
import { PRESTART_SCENARIOS } from './prestart';

const HEADER = ['Trainee', 'Activity type', 'Activity', 'Status', 'Best score', 'Attempts', 'Passed on', 'Report date'];

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const isoDate = (t: number | null | undefined): string => (t ? new Date(t).toISOString().slice(0, 10) : '');

interface Row {
  type: string;
  title: string;
  passedAt: number | null;
  best: string;
  attempts: number;
  started: boolean;
}

export function buildTrainingReportCsv(induction: InductionState, now: number): string {
  const trainee = induction.traineeName.trim() || 'Trainee';
  const rows: Row[] = [
    ...INDUCTION_MODULES.map((m) => {
      const r = induction.modules[m.id];
      return { type: 'Module', title: m.title, passedAt: r?.completedAt ?? null, best: r ? `${r.bestScore}/${r.total}` : '', attempts: r?.attempts ?? 0, started: Boolean(r) };
    }),
    ...HAZARD_SCENES.map((s) => {
      const r = induction.hazards[s.id];
      return { type: 'Hazard spotting', title: s.title, passedAt: r?.passedAt ?? null, best: r ? `${r.bestFound}/${r.total}` : '', attempts: r?.attempts ?? 0, started: Boolean(r) };
    }),
    ...PRESTART_SCENARIOS.map((s) => {
      const r = induction.prestart[s.id];
      return { type: 'Pre-start check', title: s.title, passedAt: r?.passedAt ?? null, best: r ? `${r.bestCorrect}/${r.total}` : '', attempts: r?.attempts ?? 0, started: Boolean(r) };
    }),
  ];
  const reportDate = isoDate(now);
  const lines = [HEADER.join(',')];
  for (const row of rows) {
    const status = row.passedAt ? 'Passed' : row.started ? 'In progress' : 'Not started';
    lines.push(
      [trainee, row.type, row.title, status, row.best, row.attempts, isoDate(row.passedAt), reportDate].map(csvCell).join(','),
    );
  }
  // BOM: Excel otherwise opens UTF-8 CSV files with the wrong encoding.
  return `﻿${lines.join('\n')}\n`;
}
