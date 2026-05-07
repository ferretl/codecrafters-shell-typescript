import { output, type Command } from '../types';

import fs from 'fs';

import * as IOE from 'fp-ts/IOEither';
import * as O from 'fp-ts/Option';
import { pipe } from 'fp-ts/lib/function';

export const pwd: Command = () =>
  IOE.right(pipe(fs.realpathSync(process.cwd()), O.some, output));
