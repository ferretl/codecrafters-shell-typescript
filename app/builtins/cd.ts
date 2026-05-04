import {
  type Command,
  type CommandArgs,
  ResultTag,
  type IOEvalResult
} from '../types';
import * as IOE from 'fp-ts/IOEither';
import * as RA from 'fp-ts/ReadonlyArray';
import * as O from 'fp-ts/Option';
import { pipe } from 'fp-ts/lib/function';
export const cd: Command = {
  eval: (args): IOEvalResult =>
    pipe(
      RA.head(args),
      O.getOrElse(() => '~'),
      (targetDir) =>
        IOE.tryCatch(
          () => {
            process.chdir(targetDir);
            return {
              _tag: ResultTag.Output,
              text: O.none
            };
          },
          (_) => {
            return {
              message: `cd: ${targetDir}: No such file or directory`
            };
          }
        )
    )
};
