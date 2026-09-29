import * as shell from './messages/shell';
import * as game from './messages/game';
import * as levels from './messages/levels';
import * as induction from './messages/induction';
import * as editor from './messages/editor';

export const ID_CONTENT: Record<string, string> = {
  ...shell.idContent,
  ...game.idContent,
  ...levels.idContent,
  ...induction.idContent,
  ...editor.idContent,
};
