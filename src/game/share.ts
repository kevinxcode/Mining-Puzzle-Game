/**
 * Shareable result card (plain text, Wordle-style) for the system share sheet.
 */

import { formatClock } from '@/utils/format';

export interface ShareInput {
  levelTitle: string;
  success: boolean;
  stars: number;
  tons: number;
  targetTons: number;
  seconds: number;
  efficiency: number;
}

export function buildShareText(input: ShareInput): string {
  const stars = '⭐'.repeat(Math.max(0, Math.min(3, input.stars))) + '☆'.repeat(3 - Math.max(0, Math.min(3, input.stars)));
  const outcome = input.success ? 'Shift complete' : 'Target missed';
  return [
    `⛏️ Mining Puzzle Game — ${input.levelTitle}`,
    `${stars}  ${outcome}`,
    `🚚 ${Math.round(input.tons)}/${Math.round(input.targetTons)} t · ⏱ ${formatClock(Math.round(input.seconds))} · ⚙️ ${Math.round(input.efficiency)}%`,
    'Can you run a better shift?',
  ].join('\n');
}
