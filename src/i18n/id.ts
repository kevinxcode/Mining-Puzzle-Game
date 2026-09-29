import type { EN } from './en';
import * as shell from './messages/shell';
import * as game from './messages/game';
import * as levels from './messages/levels';
import * as induction from './messages/induction';
import * as editor from './messages/editor';

export const ID: Record<keyof typeof EN, string> = { ...shell.id, ...game.id, ...levels.id, ...induction.id, ...editor.id };
