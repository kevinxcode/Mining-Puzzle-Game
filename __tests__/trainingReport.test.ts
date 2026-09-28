import { BOM, buildTrainingReportCsv } from '@/game/induction/report';
import { buildCertificateHtml } from '@/game/induction/certificate';
import { INDUCTION_MODULES } from '@/game/induction/modules';
import { HAZARD_SCENES } from '@/game/induction/hazards';
import { PRESTART_SCENARIOS } from '@/game/induction/prestart';
import { createDefaultInduction, type InductionState } from '@/state/save';

const T = Date.UTC(2026, 8, 28, 10, 0);

function sample(): InductionState {
  const s = createDefaultInduction();
  s.traineeName = 'Budi, "BS" Santoso';
  s.modules[INDUCTION_MODULES[0].id] = { bestScore: 3, total: 3, completedAt: T, attempts: 2 };
  s.hazards[HAZARD_SCENES[0].id] = { bestFound: 4, total: 4, attempts: 1, passedAt: T };
  s.prestart[PRESTART_SCENARIOS[2].id] = { bestCorrect: 7, total: 8, attempts: 3, passedAt: null };
  return s;
}

describe('training report CSV', () => {
  const csv = buildTrainingReportCsv(sample(), T);
  const lines = csv.replace(BOM, '').trim().split('\n');

  test('starts with a UTF-8 BOM so Excel shows "·" and other symbols correctly', () => {
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  test('has a header and one row per module, hazard scene and pre-start check', () => {
    expect(lines[0]).toBe(
      'Trainee,Employee ID,Site,Company,Activity type,Activity,Status,Best score,Attempts,Passed on,Certificate valid until,Report date',
    );
    expect(lines.length - 1).toBe(INDUCTION_MODULES.length + HAZARD_SCENES.length + PRESTART_SCENARIOS.length);
  });

  test('escapes commas and quotes in the trainee name', () => {
    expect(lines[1].startsWith('"Budi, ""BS"" Santoso",,,,Module,')).toBe(true);
  });

  test('reports passed, in-progress and not-started rows', () => {
    expect(csv).toContain(`Module,${INDUCTION_MODULES[0].title},Passed,3/3,2,2026-09-28,,2026-09-28`);
    expect(csv).toContain(`Hazard spotting,${HAZARD_SCENES[0].title},Passed,4/4,1,2026-09-28`);
    expect(csv).toContain(`Pre-start check,${PRESTART_SCENARIOS[2].title},In progress,7/8,3,,`);
    expect(csv).toContain(`Module,${INDUCTION_MODULES[1].title},Not started,,0,,`);
  });

  test('falls back to "Trainee" without a name', () => {
    const s = createDefaultInduction();
    expect(buildTrainingReportCsv(s, T).replace(BOM, '').split('\n')[1].startsWith('Trainee,,,,Module,')).toBe(true);
  });
});

describe('certificate includes practical assessments', () => {
  test('lists hazard spotting and pre-start results', () => {
    const s = sample();
    for (const m of INDUCTION_MODULES) s.modules[m.id] = { bestScore: 3, total: 3, completedAt: T, attempts: 1 };
    s.certifiedAt = T;
    const html = buildCertificateHtml(s);
    expect(html).toContain('Hazard spotting');
    expect(html).toContain(HAZARD_SCENES[0].title);
    expect(html).toContain('Pre-start check');
    expect(html).toContain(PRESTART_SCENARIOS[2].title.replace(/&/g, '&amp;'));
    expect(html).toContain('4/4');
    expect(html).toContain('7/8');
  });
});
