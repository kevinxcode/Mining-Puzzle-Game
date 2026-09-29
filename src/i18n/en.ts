import * as shell from './messages/shell';
import * as game from './messages/game';
import * as levels from './messages/levels';
import * as induction from './messages/induction';
import * as editor from './messages/editor';

export const EN = { ...shell.en, ...game.en, ...levels.en, ...induction.en, ...editor.en } as const;
