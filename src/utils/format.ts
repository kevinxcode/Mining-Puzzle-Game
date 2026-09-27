/**
 * MINING FLOW — display formatting helpers.
 */

export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function formatTons(tons: number): string {
  return `${Math.round(tons)} t`;
}

export function formatPercent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

export function formatNumber(value: number): string {
  return Math.round(value).toLocaleString('en-US');
}

export function formatRate(tonsPerHour: number): string {
  return `${Math.max(0, Math.round(tonsPerHour))} t/h`;
}

export function formatFuel(liters: number): string {
  return `${Math.round(liters)} L`;
}