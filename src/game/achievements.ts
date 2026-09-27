/**
 * MINING FLOW — achievements.
 * Checks are pure functions over the save data and per-level result flags.
 */

import type { ResultFlags } from '@/game/scoring';
import type { SaveData } from '@/state/save';
import { TOTAL_LEVELS } from '@/game/levels/levelFactory';
import { balance } from '@/game/config/balance';

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-load', name: 'First Load', description: 'Complete Level 1' },
  { id: 'smooth-operator', name: 'Smooth Operator', description: 'Finish a level without a traffic jam' },
  { id: 'fuel-saver', name: 'Fuel Saver', description: 'Complete using 20% less fuel than budgeted' },
  { id: 'zero-idle', name: 'Zero Idle', description: 'Keep idle time below 5%' },
  { id: 'perfect-shift', name: 'Perfect Shift', description: 'Earn 3 stars on any level' },
  { id: 'heavy-hauler', name: 'Heavy Hauler', description: `Move ${balance.achievementTons} tons in total` },
  { id: 'logistics-master', name: 'Logistics Master', description: `Complete all ${TOTAL_LEVELS} levels` },
];

/** Returns achievement ids unlocked by the latest result (not yet in the save). */
export function evaluateAchievements(save: SaveData, flags: ResultFlags): string[] {
  const unlocked: string[] = [];
  const check = (id: string, condition: boolean) => {
    if (condition && !save.achievements[id]) unlocked.push(id);
  };
  const completed = Object.keys(save.levels).length;
  check('first-load', Boolean(save.levels['1']));
  check('smooth-operator', flags.noJam);
  check('fuel-saver', flags.fuelSaver);
  check('zero-idle', flags.lowIdle);
  check('perfect-shift', flags.perfect);
  check('heavy-hauler', save.statistics.totalTonsMoved >= balance.achievementTons);
  check('logistics-master', completed >= TOTAL_LEVELS);
  return unlocked;
}