import { EN } from '@/i18n/en';
import { ID } from '@/i18n/id';
import { ID_CONTENT } from '@/i18n/idContent';
import { t, tx } from '@/i18n/core';
import * as shell from '@/i18n/messages/shell';
import * as game from '@/i18n/messages/game';
import * as levels from '@/i18n/messages/levels';
import * as induction from '@/i18n/messages/induction';
import * as editor from '@/i18n/messages/editor';

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('i18n dictionaries', () => {
  it('every key has a non-empty Indonesian translation', () => {
    for (const key of Object.keys(EN) as (keyof typeof EN)[]) {
      expect(typeof ID[key]).toBe('string');
      expect(ID[key].trim().length).toBeGreaterThan(0);
    }
  });

  it('Indonesian strings use the same {placeholders} as English', () => {
    for (const key of Object.keys(EN) as (keyof typeof EN)[]) {
      expect([key, placeholders(ID[key])]).toEqual([key, placeholders(EN[key])]);
    }
  });

  it('keys are namespaced and do not collide across files', () => {
    const all = [
      ...Object.keys(shell.en).map((k) => ['shell', k]),
      ...Object.keys(game.en).map((k) => ['game', k]),
      ...Object.keys(levels.en).map((k) => ['levels', k]),
      ...Object.keys(induction.en).map((k) => ['induction', k]),
      ...Object.keys(editor.en).map((k) => ['editor', k]),
    ];
    for (const [ns, key] of all) expect(key.startsWith(`${ns}.`)).toBe(true);
    expect(new Set(all.map(([, k]) => k)).size).toBe(all.length);
  });

  it('content translations are non-empty', () => {
    for (const [en, id] of Object.entries(ID_CONTENT)) {
      expect([en, id.trim().length > 0]).toEqual([en, true]);
    }
  });

  it('falls back to English', () => {
    expect(tx('No such text anywhere', 'id')).toBe('No such text anywhere');
    const anyKey = Object.keys(EN)[0] as keyof typeof EN | undefined;
    if (anyKey) expect(t(anyKey, undefined, 'en')).toBe(EN[anyKey]);
  });
});
