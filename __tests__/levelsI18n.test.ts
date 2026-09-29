import { ID_CONTENT } from '@/i18n/idContent';
import { LEVELS, REGIONS } from '@/game/levels/levelFactory';
import { buildDailyLevel, buildEndlessLevel, buildWeeklyLevel } from '@/game/levels/modeLevels';
import {
  eventMessage,
  levelDescription,
  levelDisplayName,
  objectiveText,
} from '@/game/levels/levelText';
import { MATERIAL_LIST } from '@/game/config/materials';
import type { LevelConfig } from '@/types/game';

const hasId = (text: string) => typeof ID_CONTENT[text] === 'string' && ID_CONTENT[text].length > 0;

const sample: LevelConfig[] = [
  ...LEVELS,
  buildDailyLevel('2026-09-28'),
  buildDailyLevel('2026-10-03'),
  buildWeeklyLevel('2026-W40'),
  buildEndlessLevel(1),
  buildEndlessLevel(12),
];

describe('level text i18n', () => {
  it('has 60 campaign levels', () => expect(LEVELS).toHaveLength(60));

  it('translates every static display string', () => {
    const missing = new Set<string>();
    const check = (s: string) => {
      if (!hasId(s)) missing.add(s);
    };
    REGIONS.forEach((r) => {
      check(r.name);
      check(r.tagline);
    });
    MATERIAL_LIST.forEach((m) => check(m.name));
    for (const level of LEVELS) check(level.name);
    for (const level of sample) {
      check(level.regionName);
      level.map.nodes.forEach((n) => check(n.name));
      level.map.routes.forEach((r) => check(r.name));
      level.map.materials.forEach((m) => check(m.name));
      level.tutorialSteps?.forEach(check);
    }
    expect([...missing]).toEqual([]);
  });

  it('helpers reproduce the English data exactly and translate to Indonesian', () => {
    const { setLanguageNow } = require('@/i18n/core');
    for (const level of sample) {
      const texts: [string, () => string][] = [
        [level.name, () => levelDisplayName(level)],
        [level.description, () => levelDescription(level)],
        ...level.objectives.map((o) => [o.description, () => objectiveText(o)] as [string, () => string]),
        ...level.events.map((e) => [e.message, () => eventMessage(e, level.map)] as [string, () => string]),
      ];
      for (const [english, fn] of texts) {
        setLanguageNow('en');
        expect(fn()).toBe(english);
        setLanguageNow('id');
        expect(fn()).not.toBe(english);
      }
    }
    setLanguageNow('en');
  });
});
