/**
 * Share custom levels offline as text codes ("MPL1.…"), and validate drafts
 * coming from codes or storage before they reach the editor or the engine.
 */

import type { MaterialTypeId, TruckClass } from '@/types/game';
import { decodeShareCode, encodeShareCode } from '../shareCodec';
import {
  CUSTOM_PREFIX,
  GRID_MAX,
  GRID_MIN,
  GRID_STEP,
  MAX_NODES,
  MAX_ROADS,
  MAX_TRUCKS,
  TIME_OPTIONS,
  type DraftNode,
  type DraftNodeType,
  type DraftRoad,
  type LevelDraft,
} from './customLevel';

export const LEVEL_CODE_PREFIX = 'MPL1.';
const NODE_TYPES: readonly DraftNodeType[] = ['parking', 'excavator', 'dump', 'fuel', 'junction'];
const MATERIALS: readonly MaterialTypeId[] = ['ore', 'overburden', 'coal', 'gravel'];
const TRUCKS: readonly TruckClass[] = ['Compact', 'Standard', 'Heavy', 'Ultra'];
const ID_RE = /^[a-z0-9-]{1,24}$/;

export type DraftParse = { ok: true; draft: Omit<LevelDraft, 'id' | 'updatedAt'> } | { ok: false; reason: 'missing' | 'checksum' | 'unreadable' | 'invalid' };

export function encodeLevelCode(d: LevelDraft): string {
  return encodeShareCode(LEVEL_CODE_PREFIX, {
    v: 1,
    n: d.name,
    nodes: d.nodes.map((n) => [n.id, n.type, n.x, n.y, n.materialId ?? null]),
    roads: d.roads.map((r) => [r.id, r.from, r.to, r.oneWay ? 'o' : r.mud ? 'm' : r.narrow ? 'n' : '']),
    t: d.trucks,
    target: d.targetTons,
    time: d.timeLimit,
  });
}

const onGrid = (v: unknown): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= GRID_MIN && v <= GRID_MAX && v % GRID_STEP === 0;

/** Strict structural validation; gameplay validity is compileDraft's job. */
export function validateDraftShape(data: unknown): DraftParse {
  if (typeof data !== 'object' || data === null) return { ok: false, reason: 'invalid' };
  const o = data as Record<string, unknown>;
  if (o.v !== 1 || !Array.isArray(o.nodes) || !Array.isArray(o.roads) || !Array.isArray(o.t)) return { ok: false, reason: 'invalid' };
  if (o.nodes.length > MAX_NODES || o.roads.length > MAX_ROADS || o.t.length > MAX_TRUCKS) return { ok: false, reason: 'invalid' };

  const nodes: DraftNode[] = [];
  const cells = new Set<string>();
  for (const raw of o.nodes) {
    if (!Array.isArray(raw)) return { ok: false, reason: 'invalid' };
    const [id, type, x, y, material] = raw;
    if (typeof id !== 'string' || !ID_RE.test(id) || nodes.some((n) => n.id === id)) return { ok: false, reason: 'invalid' };
    if (!NODE_TYPES.includes(type as DraftNodeType) || !onGrid(x) || !onGrid(y)) return { ok: false, reason: 'invalid' };
    if (cells.has(`${x},${y}`)) return { ok: false, reason: 'invalid' };
    cells.add(`${x},${y}`);
    const needsMaterial = type === 'excavator' || type === 'dump';
    if (needsMaterial !== (material !== null) || (needsMaterial && !MATERIALS.includes(material as MaterialTypeId))) {
      return { ok: false, reason: 'invalid' };
    }
    nodes.push({ id, type: type as DraftNodeType, x, y, ...(needsMaterial ? { materialId: material as MaterialTypeId } : {}) });
  }
  if (nodes.filter((n) => n.type === 'parking').length !== 1) return { ok: false, reason: 'invalid' };

  const roads: DraftRoad[] = [];
  for (const raw of o.roads) {
    if (!Array.isArray(raw)) return { ok: false, reason: 'invalid' };
    const [id, from, to, kind] = raw;
    if (typeof id !== 'string' || !ID_RE.test(id) || roads.some((r) => r.id === id)) return { ok: false, reason: 'invalid' };
    if (typeof from !== 'string' || typeof to !== 'string' || from === to) return { ok: false, reason: 'invalid' };
    if (!nodes.some((n) => n.id === from) || !nodes.some((n) => n.id === to)) return { ok: false, reason: 'invalid' };
    if (!['', 'o', 'm', 'n'].includes(kind as string)) return { ok: false, reason: 'invalid' };
    roads.push({ id, from, to, ...(kind === 'o' ? { oneWay: true } : kind === 'm' ? { mud: true } : kind === 'n' ? { narrow: true } : {}) });
  }

  if (!o.t.every((c) => TRUCKS.includes(c as TruckClass))) return { ok: false, reason: 'invalid' };
  if (typeof o.target !== 'number' || !Number.isInteger(o.target) || o.target < 20 || o.target > 2000) return { ok: false, reason: 'invalid' };
  if (!TIME_OPTIONS.includes(o.time as (typeof TIME_OPTIONS)[number])) return { ok: false, reason: 'invalid' };
  const name = typeof o.n === 'string' ? o.n.trim().slice(0, 40) : '';

  return {
    ok: true,
    draft: { name: name || 'Shared Pit', nodes, roads, trucks: o.t as TruckClass[], targetTons: o.target, timeLimit: o.time as number },
  };
}

export function decodeLevelCode(text: string): DraftParse {
  const decoded = decodeShareCode(LEVEL_CODE_PREFIX, text);
  if (!decoded.ok) return decoded;
  return validateDraftShape(decoded.data);
}

/** Round-trips a stored draft through the same validation used for codes. */
export function sanitizeStoredDraft(d: unknown): LevelDraft | null {
  if (typeof d !== 'object' || d === null) return null;
  const s = d as LevelDraft;
  if (typeof s.id !== 'string' || !s.id.startsWith(CUSTOM_PREFIX)) return null;
  try {
    const parsed = decodeLevelCode(encodeLevelCode(s));
    return parsed.ok ? { ...parsed.draft, id: s.id, updatedAt: typeof s.updatedAt === 'number' ? s.updatedAt : 0 } : null;
  } catch {
    return null;
  }
}
