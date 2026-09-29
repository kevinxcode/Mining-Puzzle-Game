/**
 * Offline crash log (pure part). Errors are kept on the device only; the
 * player can choose to share a report. Entries hold the error, route and app
 * version — never trainee details or progress.
 */

export const MAX_CRASH_ENTRIES = 10;
const MAX_STACK_LINES = 12;
const MAX_MESSAGE = 500;

export interface CrashEntry {
  at: string;
  message: string;
  stack: string;
  route: string;
  version: string;
}

export function buildCrashEntry(error: unknown, route: string, now: number, version: string): CrashEntry {
  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : error == null ? '' : String(error);
  const stack = error instanceof Error && error.stack ? error.stack : '';
  return {
    at: new Date(now).toISOString(),
    message: (message || 'Unknown error').slice(0, MAX_MESSAGE),
    stack: stack.split('\n').slice(0, MAX_STACK_LINES).join('\n'),
    route,
    version,
  };
}

/** Newest first, capped. */
export function addCrashEntry(log: readonly CrashEntry[], entry: CrashEntry): CrashEntry[] {
  return [entry, ...log].slice(0, MAX_CRASH_ENTRIES);
}

export function formatCrashReport(log: readonly CrashEntry[], platform: string): string {
  const lines = ['Mining Puzzle Game error report', `Device: ${platform}`, ''];
  for (const e of log) {
    lines.push(`[${e.at}] v${e.version} on ${e.route}`, e.message, e.stack, '');
  }
  return lines.join('\n');
}
