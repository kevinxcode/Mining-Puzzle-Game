/**
 * Site Induction content packs — the modules, glossary and pre-start checklists
 * as one JSON document, so a site's HSE team can adapt the training without an
 * app release. Imported packs are validated strictly before use.
 */

import { t } from '@/i18n/core';
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
  if (raw.length > MAX_PACK_CHARS) return { ok: false, errors: [t('induction.val.tooLarge')] };
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, errors: [t('induction.val.json')] };
  }
  const errors: string[] = [];
  const err = (msg: string) => {
    if (errors.length < 30) errors.push(msg);
  };
  if (!isObj(data)) return { ok: false, errors: [t('induction.val.object')] };
  if (data.format !== CONTENT_PACK_FORMAT) err(t('induction.val.format', { format: CONTENT_PACK_FORMAT }));
  if (!isText(data.name, 80)) err(t('induction.val.name'));
  if (!isText(data.version, 20)) err(t('induction.val.version'));

  // Modules
  const modules = Array.isArray(data.modules) ? data.modules : [];
  if (modules.length === 0) err(t('induction.val.noModules'));
  const moduleIds = new Set<string>();
  modules.forEach((m: unknown, mi) => {
    const where = t('induction.val.whereModule', { n: mi + 1 });
    if (!isObj(m)) return err(t('induction.val.mustBeObject', { where }));
    if (!isText(m.id, 40)) err(t('induction.val.missingField', { where, field: 'id' }));
    else if (moduleIds.has(m.id)) err(t('induction.val.dupModule', { where, id: m.id }));
    else moduleIds.add(m.id);
    if (!isText(m.title, 80)) err(t('induction.val.missingField', { where, field: 'title' }));
    if (!isText(m.summary)) err(t('induction.val.missingField', { where, field: 'summary' }));
    if (typeof m.number !== 'number') err(t('induction.val.number', { where }));
    if (!MODULE_ICONS.has(m.icon as string)) err(t('induction.val.icon', { where, icons: [...MODULE_ICONS].join(', ') }));
    if (!isText(m.practiceLevelId, 10) || !getLevelById(m.practiceLevelId as string))
      err(t('induction.val.level', { where, id: String(m.practiceLevelId) }));
    if (!isText(m.practiceNote)) err(t('induction.val.missingField', { where, field: 'practiceNote' }));
    const cards = Array.isArray(m.cards) ? m.cards : [];
    if (cards.length === 0) err(t('induction.val.noCards', { where }));
    cards.forEach((c: unknown, ci) => {
      if (!isObj(c) || !isText(c.id, 40) || !isText(c.title, 80) || !isText(c.body) || !ART.has(c.art as InductionArt))
        err(t('induction.val.card', { where: t('induction.val.whereCard', { where, n: ci + 1 }) }));
    });
    const questions = Array.isArray(m.questions) ? m.questions : [];
    if (questions.length === 0) err(t('induction.val.noQuestions', { where }));
    questions.forEach((q: unknown, qi) => {
      const qw = t('induction.val.whereQuestion', { where, n: qi + 1 });
      if (!isObj(q) || !isText(q.id, 40) || !isText(q.prompt) || !isText(q.explanation))
        return err(t('induction.val.question', { where: qw }));
      const options = Array.isArray(q.options) ? q.options : [];
      if (options.length < 2) err(t('induction.val.twoOptions', { where: qw }));
      if (options.some((o: unknown) => !isObj(o) || !isText(o.id, 40) || !isText(o.text) || typeof o.correct !== 'boolean'))
        err(t('induction.val.option', { where: qw }));
      if (options.filter((o: unknown) => isObj(o) && o.correct === true).length !== 1)
        err(t('induction.val.oneCorrect', { where: qw }));
    });
  });

  // Glossary
  const glossary = Array.isArray(data.glossary) ? data.glossary : [];
  glossary.forEach((g: unknown, gi) => {
    if (!isObj(g) || !isText(g.term, 60) || !isText(g.definition)) err(t('induction.val.glossary', { n: gi + 1 }));
  });

  // Pre-start checks
  const prestart = Array.isArray(data.prestart) ? data.prestart : [];
  const scenarioIds = new Set<string>();
  prestart.forEach((s: unknown, si) => {
    const where = t('induction.val.wherePrestart', { n: si + 1 });
    if (!isObj(s)) return err(t('induction.val.mustBeObject', { where }));
    if (!isText(s.id, 40)) err(t('induction.val.missingField', { where, field: 'id' }));
    else if (scenarioIds.has(s.id)) err(t('induction.val.dupCheck', { where, id: s.id }));
    else scenarioIds.add(s.id);
    if (!isText(s.title, 80) || !isText(s.brief)) err(t('induction.val.titleBrief', { where }));
    const items = Array.isArray(s.items) ? s.items : [];
    if (items.length === 0) err(t('induction.val.noItems', { where }));
    const itemIds = new Set<string>();
    items.forEach((it: unknown, ii) => {
      const iw = t('induction.val.whereItem', { where, n: ii + 1 });
      if (!isObj(it)) return err(t('induction.val.mustBeObject', { where: iw }));
      if (!isText(it.id, 40)) err(t('induction.val.missingField', { where: iw, field: 'id' }));
      else if (itemIds.has(it.id)) err(t('induction.val.dupItem', { where: iw, id: it.id }));
      else itemIds.add(it.id);
      if (!AREAS.has(it.area as PrestartArea)) err(t('induction.val.area', { where: iw }));
      if (!isText(it.label, 60) || !isText(it.observation) || !isText(it.explanation))
        err(t('induction.val.itemText', { where: iw }));
      if (typeof it.defect !== 'boolean') err(t('induction.val.defect', { where: iw }));
      if (it.critical === true && it.defect !== true) err(t('induction.val.critical', { where: iw }));
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
