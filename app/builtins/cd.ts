import { type Command, output } from '../types';
import * as IOE from 'fp-ts/IOEither';
import * as RA from 'fp-ts/ReadonlyArray';
import * as O from 'fp-ts/Option';
import { pipe } from 'fp-ts/lib/function';
export const cd: Command = (args) =>
  pipe(
    RA.head(args),
    O.getOrElse(() => '~'),
    (targetDir) =>
      IOE.tryCatch(
        () => {
          process.chdir(targetDir);
          return output(O.none);
        },
        () => ({ message: `cd: ${targetDir}: No such file or directory` })
      )
  );
