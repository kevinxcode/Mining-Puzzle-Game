import { buildCertificateHtml } from '@/game/induction/certificate';
import { INDUCTION_MODULES } from '@/game/induction/modules';
import type { InductionState } from '@/state/save';

function certifiedState(name: string): InductionState {
  const modules: InductionState['modules'] = {};
  for (const m of INDUCTION_MODULES) {
    modules[m.id] = { bestScore: 3, total: 3, completedAt: 1, attempts: 1 };
  }
  return { modules, traineeName: name, certifiedAt: Date.UTC(2026, 8, 27), hazards: {} };
}

describe('induction certificate', () => {
  test('includes trainee name, issue date and every module with its score', () => {
    const html = buildCertificateHtml(certifiedState('Budi Santoso'));
    expect(html).toContain('Budi Santoso');
    expect(html).toContain('2026-09-27');
    for (const m of INDUCTION_MODULES) {
      expect(html).toContain(m.title.replace(/&/g, '&amp;'));
    }
    expect(html).toContain('3/3');
  });

  test('escapes the trainee name so it cannot inject markup', () => {
    const html = buildCertificateHtml(certifiedState('<script>x</script> & Co'));
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;x&lt;/script&gt; &amp; Co');
  });

  test('falls back to "Trainee" when no name was entered', () => {
    expect(buildCertificateHtml(certifiedState('   '))).toContain('Trainee');
  });

  test('refuses to build a certificate before every module is passed', () => {
    const state = certifiedState('A');
    state.certifiedAt = null;
    expect(() => buildCertificateHtml(state)).toThrow();
  });
});
