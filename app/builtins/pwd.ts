/**
 * The pwd (print working directory) builtin prints the full, absolute path of the current working directory to stdout.
 */

import {
  ResultTag,
  type Command,
  type CommandArgs,
  type IOEvalResult
} from '../types';

import fs from 'fs';

import * as IOE from 'fp-ts/IOEither';

export const pwd: Command<CommandArgs> = {
  eval: (): IOEvalResult =>
    IOE.right({
      _tag: ResultTag.Output,
      text: fs.realpathSync(process.cwd())
    })
};
