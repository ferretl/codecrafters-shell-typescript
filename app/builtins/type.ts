import * as IOE from 'fp-ts/lib/IOEither';
import * as O from 'fp-ts/Option';
import * as RA from 'fp-ts/ReadonlyArray';
import {
  ResultTag,
  output,
  type Command,
  type CommandArgs,
  type IOEvalResult
} from '../types';
import { findBuiltin, findExecutable } from '.';
import { pipe } from 'fp-ts/lib/function';

export const type: Command = {
  eval: (args): IOEvalResult =>
    pipe(
      RA.head(args),
      O.fold(
        () => IOE.left({ message: 'No arguments given!' }),
        (name) => {
          const text = pipe(
            pipe(
              findBuiltin(name),
              O.map(() => `${name} is a shell builtin`)
            ),
            O.alt(() =>
              pipe(
                findExecutable(name),
                O.map((filePath) => `${name} is ${filePath}/${name}`)
              )
            ),
            O.alt(() => O.some(`${name} not found`))
          );
          return IOE.right(output(text));
        }
      )
    )
};
