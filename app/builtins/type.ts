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
      O.match(
        () => IOE.left({ message: 'No arguments given!' }),
        (name) => {
          const text = pipe(
            findBuiltin(name),
            O.map(() => `${name} is a shell builtin`),
            O.alt(() =>
              pipe(
                findExecutable(name),
                O.map((filePath) => `${name} is ${filePath}/${name}`)
              )
            ),
            O.getOrElse(() => `${name} not found`)
          );
          return IOE.right(pipe(text, O.some, output));
        }
      )
    )
};
