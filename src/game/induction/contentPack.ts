/**
 * Site Induction content packs — the modules, glossary and pre-start checklists
 * as one JSON document, so a site's HSE team can adapt the training without an
 * app release. Imported packs are validated strictly before use.
 */

import { getLevelById } from '../levels/levelFactory';
import { GLOSSARY } from './glossary';
import { INDUCTION_MODULES } from './modules';
import { PRESTART_SCENARIOS, type PrestartArea, type PrestartScenario } from './prestart';
import type { GlossaryTerm, InductionArt, InductionModule } from './types';

export const CONTENT_PACK_FORMAT = 'mining-puzzle-induction-pack';
/** Imports above this size are rejected before parsing. */
const MAX_PACK_CHARS = 500_000;
const MAX_TEXT = 1200;

export interface ContentPack {
  format: typeof CONTENT_PACK_FORMAT;
  name: string;
  /** Bump when the content changes; certificates from an older version must be renewed. */
  version: string;
  modules: InductionModule[];
  glossary: GlossaryTerm[];
  prestart: PrestartScenario[];
}

export const DEFAULT_CONTENT_PACK: ContentPack = {
  format: CONTENT_PACK_FORMAT,
  name: 'Mining Puzzle Game Induction',
  version: '1.0',
  modules: INDUCTION_MODULES,
  glossary: GLOSSARY,
  prestart: PRESTART_SCENARIOS,
};

export function contentPackJson(pack: ContentPack): string {
  return JSON.stringify(pack, null, 2);
}

export type ParseResult = { ok: true; pack: ContentPack } | { ok: false; errors: string[] };

const MODULE_ICONS = new Set(['cycle', 'bucket', 'queue', 'route', 'fuel', 'safety']);
const ART = new Set<InductionArt>([
  'diagram-cycle', 'diagram-passes', 'diagram-queue', 'diagram-routes', 'diagram-fuel', 'diagram-right-of-way',
  'icon-timer', 'icon-payload', 'icon-match', 'icon-warning', 'icon-idle', 'icon-balance', 'icon-traffic',
  'icon-plan', 'icon-speed', 'icon-one-way', 'icon-breakdown', 'icon-checklist',
]);
const AREAS = new Set<PrestartArea>(['walkaround', 'cab', 'safety']);

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isText = (v: unknown, max = MAX_TEXT): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= max;

export function parseContentPack(raw: string): ParseResult {
  if (raw.length > MAX_PACK_CHARS) return { ok: false, errors: ['File is too large for a content pack (max 500 KB).'] };
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, errors: ['File is not valid JSON.'] };
  }
  const errors: string[] = [];
  const err = (msg: string) => {
    if (errors.length < 30) errors.push(msg);
  };
  if (!isObj(data)) return { ok: false, errors: ['Content pack must be a JSON object.'] };
  if (data.format !== CONTENT_PACK_FORMAT) err(`"format" must be "${CONTENT_PACK_FORMAT}".`);
  if (!isText(data.name, 80)) err('Pack needs a "name" (max 80 characters).');
  if (!isText(data.version, 20)) err('Pack needs a "version" such as "2026.1".');

  // Modules
  const modules = Array.isArray(data.modules) ? data.modules : [];
  if (modules.length === 0) err('Pack needs at least one module.');
  const moduleIds = new Set<string>();
  modules.forEach((m: unknown, mi) => {
    const where = `Module ${mi + 1}`;
    if (!isObj(m)) return err(`${where} must be an object.`);
    if (!isText(m.id, 40)) err(`${where}: missing "id".`);
    else if (moduleIds.has(m.id)) err(`${where}: duplicate module id "${m.id}".`);
    else moduleIds.add(m.id);
    if (!isText(m.title, 80)) err(`${where}: missing "title".`);
    if (!isText(m.summary)) err(`${where}: missing "summary".`);
    if (typeof m.number !== 'number') err(`${where}: "number" must be a number.`);
    if (!MODULE_ICONS.has(m.icon as string)) err(`${where}: "icon" must be one of ${[...MODULE_ICONS].join(', ')}.`);
    if (!isText(m.practiceLevelId, 10) || !getLevelById(m.practiceLevelId as string))
      err(`${where}: practice level "${String(m.practiceLevelId)}" does not exist (use 1–60).`);
    if (!isText(m.practiceNote)) err(`${where}: missing "practiceNote".`);
    const cards = Array.isArray(m.cards) ? m.cards : [];
    if (cards.length === 0) err(`${where}: needs at least one card.`);
    cards.forEach((c: unknown, ci) => {
      if (!isObj(c) || !isText(c.id, 40) || !isText(c.title, 80) || !isText(c.body) || !ART.has(c.art as InductionArt))
        err(`${where}, card ${ci + 1}: needs id, title, body and a valid "art".`);
    });
    const questions = Array.isArray(m.questions) ? m.questions : [];
    if (questions.length === 0) err(`${where}: needs at least one question.`);
    questions.forEach((q: unknown, qi) => {
      const qw = `${where}, question ${qi + 1}`;
      if (!isObj(q) || !isText(q.id, 40) || !isText(q.prompt) || !isText(q.explanation))
        return err(`${qw}: needs id, prompt and explanation.`);
      const options = Array.isArray(q.options) ? q.options : [];
      if (options.length < 2) err(`${qw}: needs at least two options.`);
      if (options.some((o: unknown) => !isObj(o) || !isText(o.id, 40) || !isText(o.text) || typeof o.correct !== 'boolean'))
        err(`${qw}: every option needs id, text and correct (true/false).`);
      if (options.filter((o: unknown) => isObj(o) && o.correct === true).length !== 1)
        err(`${qw}: must have exactly one correct option.`);
    });
  });

  // Glossary
  const glossary = Array.isArray(data.glossary) ? data.glossary : [];
  glossary.forEach((g: unknown, gi) => {
    if (!isObj(g) || !isText(g.term, 60) || !isText(g.definition)) err(`Glossary entry ${gi + 1}: needs term and definition.`);
  });

  // Pre-start checks
  const prestart = Array.isArray(data.prestart) ? data.prestart : [];
  const scenarioIds = new Set<string>();
  prestart.forEach((s: unknown, si) => {
    const where = `Pre-start check ${si + 1}`;
    if (!isObj(s)) return err(`${where} must be an object.`);
    if (!isText(s.id, 40)) err(`${where}: missing "id".`);
    else if (scenarioIds.has(s.id)) err(`${where}: duplicate check id "${s.id}".`);
    else scenarioIds.add(s.id);
    if (!isText(s.title, 80) || !isText(s.brief)) err(`${where}: needs title and brief.`);
    const items = Array.isArray(s.items) ? s.items : [];
    if (items.length === 0) err(`${where}: needs at least one item.`);
    const itemIds = new Set<string>();
    items.forEach((it: unknown, ii) => {
      const iw = `${where}, item ${ii + 1}`;
      if (!isObj(it)) return err(`${iw} must be an object.`);
      if (!isText(it.id, 40)) err(`${iw}: missing "id".`);
      else if (itemIds.has(it.id)) err(`${iw}: duplicate item id "${it.id}".`);
      else itemIds.add(it.id);
      if (!AREAS.has(it.area as PrestartArea)) err(`${iw}: "area" must be walkaround, cab or safety.`);
      if (!isText(it.label, 60) || !isText(it.observation) || !isText(it.explanation))
        err(`${iw}: needs label, observation and explanation.`);
      if (typeof it.defect !== 'boolean') err(`${iw}: "defect" must be true or false.`);
      if (it.critical === true && it.defect !== true) err(`${iw}: a critical item must also be a defect.`);
    });
  });

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    pack: {
      format: CONTENT_PACK_FORMAT,
      name: (data.name as string).trim(),
      version: (data.version as string).trim(),
      modules: modules as InductionModule[],
      glossary: glossary as GlossaryTerm[],
      prestart: prestart as PrestartScenario[],
    },
  };
}
