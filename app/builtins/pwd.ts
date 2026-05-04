import {
  ResultTag,
  type Command,
  type CommandArgs,
  type IOEvalResult
} from '../types';

import fs from 'fs';

import * as IOE from 'fp-ts/IOEither';
import * as O from 'fp-ts/Option';
import { pipe } from 'fp-ts/lib/function';

export const pwd: Command = {
  eval: (): IOEvalResult =>
    IOE.right({
      _tag: ResultTag.Output,
      text: pipe(fs.realpathSync(process.cwd()), O.some)
    })
};
