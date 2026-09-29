import { MAX_CRASH_ENTRIES, addCrashEntry, buildCrashEntry, formatCrashReport } from '@/services/crashLogCore';

describe('offline crash log', () => {
  const now = Date.UTC(2026, 8, 29, 7, 30);

  it('records message, trimmed stack, route and version', () => {
    const error = new Error('boom');
    error.stack = Array.from({ length: 40 }, (_, i) => `at frame${i}`).join('\n');
    const entry = buildCrashEntry(error, '/game/3', now, '1.0.0');
    expect(entry.message).toBe('boom');
    expect(entry.route).toBe('/game/3');
    expect(entry.version).toBe('1.0.0');
    expect(entry.stack.split('\n')).toHaveLength(12);
    expect(entry.at).toBe('2026-09-29T07:30:00.000Z');
  });

  it('handles non-Error throws', () => {
    expect(buildCrashEntry('plain string', '/', now, '1.0.0').message).toBe('plain string');
    expect(buildCrashEntry(undefined, '/', now, '1.0.0').message).toBe('Unknown error');
  });

  it('keeps only the newest entries', () => {
    let log = [] as ReturnType<typeof addCrashEntry>;
    for (let i = 0; i < MAX_CRASH_ENTRIES + 5; i += 1) {
      log = addCrashEntry(log, buildCrashEntry(new Error(`e${i}`), '/', now + i, '1.0.0'));
    }
    expect(log).toHaveLength(MAX_CRASH_ENTRIES);
    expect(log[0].message).toBe(`e${MAX_CRASH_ENTRIES + 4}`);
  });

  it('formats a readable report with no personal fields', () => {
    const text = formatCrashReport([buildCrashEntry(new Error('boom'), '/hq', now, '1.0.0')], 'android 16');
    expect(text).toContain('Mining Puzzle Game error report');
    expect(text).toContain('boom');
    expect(text).toContain('/hq');
    expect(text).toContain('android 16');
  });
});
