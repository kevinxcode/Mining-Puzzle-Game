/**
 * Tiny i18n core. English is the source language; Indonesian dictionaries are
 * typed against it so a missing key is a compile error. `t` reads the current
 * language from module state so non-React code (engine messages, reports)
 * can translate too.
 */

import { EN } from './en';
import { ID } from './id';
import { ID_CONTENT } from './idContent';

export type Lang = 'en' | 'id';
export type MessageKey = keyof typeof EN;
export type Vars = Record<string, string | number>;

export const LANGUAGES: readonly { id: Lang; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'id', label: 'Bahasa Indonesia' },
];

let current: Lang = 'en';

export const getLanguage = (): Lang => current;
export function setLanguageNow(lang: Lang): void {
  current = lang;
}

function fill(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m));
}

/** UI message by key. */
export function t(key: MessageKey, vars?: Vars, lang: Lang = current): string {
  const dict: Record<string, string> = lang === 'id' ? ID : EN;
  return fill(dict[key] ?? EN[key] ?? String(key), vars);
}

/** Data text (level names, equipment…) translated by its English source; falls back to English. */
export function tx(english: string, lang: Lang = current): string {
  if (lang === 'en') return english;
  return ID_CONTENT[english] ?? english;
}

/** Plural helper: picks `{key}_one` / `{key}_other` style pairs by count. */
export function tn(one: MessageKey, other: MessageKey, count: number, vars?: Vars, lang: Lang = current): string {
  return t(count === 1 ? one : other, { count, ...vars }, lang);
}
