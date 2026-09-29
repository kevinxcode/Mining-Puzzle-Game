/**
 * Display helpers for templated level text. Level configs are built once in
 * English (tests and replays depend on that); these rebuild the same strings
 * in the current language. Static names go through `tx` directly.
 */

import type { GameEvent, LevelConfig, LevelObjective, MapConfig } from '@/types/game';
import { t, tx } from '@/i18n/core';
import { formatClock } from '@/utils/format';
import { MATERIALS } from '../config/materials';
import { parseModeLevelId } from './modeLevels';

/** Replaces `level.name` (handles daily/weekly/endless templates). */
export function levelDisplayName(level: Pick<LevelConfig, 'id' | 'name' | 'difficulty'>): string {
  const ref = parseModeLevelId(level.id);
  if (ref?.mode === 'daily') return t('levels.name.daily', { date: ref.date });
  if (ref?.mode === 'weekly') return t('levels.name.weekly', { week: ref.week });
  if (ref?.mode === 'endless') return t('levels.name.endless', { shift: ref.shift });
  if (level.name === `Level ${level.difficulty}`) return t('levels.name.fallback', { number: level.difficulty });
  return tx(level.name);
}

/** Replaces `level.description`. */
export function levelDescription(level: Pick<LevelConfig, 'targetTons' | 'map'>): string {
  const materials = level.map.materials.map((m) => tx(m.name)).join(', ');
  return t('levels.description', { target: level.targetTons, materials });
}

/** Replaces `objective.description`. */
export function objectiveText(o: Pick<LevelObjective, 'kind' | 'target' | 'materialId'>): string {
  const target = o.target ?? 0;
  switch (o.kind) {
    case 'tons':
      return t('levels.objective.tons', { target });
    case 'time':
      return t('levels.objective.time', { time: formatClock(target) });
    case 'idle':
      return t('levels.objective.idle', { target });
    case 'fuel':
      return t('levels.objective.fuel', { target });
    case 'queue':
      return t('levels.objective.queue', { target });
    case 'deliver':
      return t('levels.objective.deliver', {
        target,
        material: o.materialId ? tx(MATERIALS[o.materialId].name) : '',
      });
    case 'no-jam':
      return t('levels.objective.noJam');
    case 'trucks':
      return t('levels.objective.trucks', { target });
  }
}

/** Localized "From – To" road label (mirrors the factory's roadDisplayName). */
export function roadDisplayName(map: MapConfig, roadId: string): string {
  const road = map.roads.find((r) => r.id === roadId);
  if (!road) return roadId;
  const nameOf = (id: string) => {
    const n = map.nodes.find((node) => node.id === id)?.name;
    return n ? tx(n) : id;
  };
  return `${nameOf(road.from)} – ${nameOf(road.to)}`;
}

/** Replaces `event.message` for scripted level events. */
export function eventMessage(event: GameEvent, map: MapConfig): string {
  switch (event.type) {
    case 'rain':
      return t('levels.event.rain');
    case 'target-increase':
      return t('levels.event.target', { amount: event.amount ?? 0 });
    case 'road-closure':
      return t('levels.event.closure', { road: roadDisplayName(map, event.target ?? '') });
    case 'road-open':
      return t('levels.event.reopen', { road: roadDisplayName(map, event.target ?? '') });
    case 'breakdown':
      return t('levels.event.breakdown');
    case 'fuel-outage':
      return t('levels.event.outage', { seconds: event.durationSeconds ?? 0 });
    default:
      return tx(event.message);
  }
}
