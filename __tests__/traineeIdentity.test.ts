import {
  CERTIFICATE_VALIDITY_DAYS,
  certificateExpiresAt,
  certificateStatus,
  createDefaultSave,
  migrateSave,
  renewInduction,
  setTraineeField,
} from '@/state/save';
import { buildCertificateHtml } from '@/game/induction/certificate';
import { BOM, buildTrainingReportCsv } from '@/game/induction/report';
import { INDUCTION_MODULES } from '@/game/induction/modules';

const DAY = 86_400_000;
const T = Date.UTC(2026, 8, 28);

function certified() {
  let save = createDefaultSave();
  for (const m of INDUCTION_MODULES) save.induction.modules[m.id] = { bestScore: 3, total: 3, completedAt: T, attempts: 1 };
  save.induction.hazards['loading-area'] = { bestFound: 4, total: 4, attempts: 1, passedAt: T };
  save.induction.certifiedAt = T;
  save = setTraineeField(save, 'traineeName', 'Budi Santoso');
  save = setTraineeField(save, 'employeeId', 'KE-1042');
  save = setTraineeField(save, 'site', 'North Pit');
  save = setTraineeField(save, 'company', 'Contractor A');
  return save;
}

describe('trainee identity', () => {
  test('fields are trimmed of repeated spaces and length-limited', () => {
    const save = setTraineeField(createDefaultSave(), 'employeeId', '  KE   1042' + 'x'.repeat(60));
    expect(save.induction.employeeId.startsWith('KE 1042')).toBe(true);
    expect(save.induction.employeeId.length).toBeLessThanOrEqual(40);
  });

  test('older saves load with empty identity fields', () => {
    const m = migrateSave({ induction: { modules: {}, traineeName: 'A', certifiedAt: null } } as never);
    expect(m.induction).toMatchObject({ traineeName: 'A', employeeId: '', site: '', company: '' });
  });

  test('certificate and CSV show employee ID, site, company and expiry', () => {
    const save = certified();
    const html = buildCertificateHtml(save.induction);
    for (const text of ['KE-1042', 'North Pit', 'Contractor A', 'Valid until: 2027-09-28']) expect(html).toContain(text);
    const csv = buildTrainingReportCsv(save.induction, T).replace(BOM, '');
    const [header, first] = csv.split('\n');
    expect(header).toBe(
      'Trainee,Employee ID,Site,Company,Activity type,Activity,Status,Best score,Attempts,Passed on,Certificate valid until,Report date',
    );
    expect(first.startsWith('Budi Santoso,KE-1042,North Pit,Contractor A,Module,')).toBe(true);
    expect(first).toContain(',2027-09-28,2026-09-28');
  });
});

describe('certificate validity', () => {
  test('valid for the configured number of days, then expired', () => {
    const { induction } = certified();
    expect(CERTIFICATE_VALIDITY_DAYS).toBe(365);
    expect(certificateExpiresAt(induction)).toBe(T + 365 * DAY);
    expect(certificateStatus(induction, T + 364 * DAY)).toBe('valid');
    expect(certificateStatus(induction, T + 366 * DAY)).toBe('expired');
    expect(certificateStatus(createDefaultSave().induction, T)).toBe('none');
  });

  test('renewing clears passes and the certificate but keeps identity and attempts', () => {
    const renewed = renewInduction(certified());
    const i = renewed.induction;
    expect(i.certifiedAt).toBeNull();
    expect(Object.values(i.modules).every((r) => r.completedAt === null && r.attempts === 1)).toBe(true);
    expect(i.hazards['loading-area'].passedAt).toBeNull();
    expect(i.employeeId).toBe('KE-1042');
    expect(i.traineeName).toBe('Budi Santoso');
  });
});
