import {
  ResultTag,
  type Command,
  type CommandArgs,
  type IOEvalResult
} from '../types';

import fs from 'fs';

import * as IOE from 'fp-ts/IOEither';
import * as O from 'fp-ts/Option';

export const pwd: Command = {
  eval: (): IOEvalResult =>
    IOE.right({
      _tag: ResultTag.Output,
      text: O.some(fs.realpathSync(process.cwd()))
    })
};
