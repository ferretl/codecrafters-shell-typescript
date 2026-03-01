import * as IOE from 'fp-ts/lib/IOEither';
import * as O from 'fp-ts/Option';
import * as A from 'fp-ts/Array';
import type { Command, CommandArgs, IOEvalResult } from '../types/Command';
import { builtins } from '.';
import { pipe } from 'fp-ts/lib/function';
import path from 'path';
import fs from 'fs';

const findBuiltin = (input: string): O.Option<string> =>
  pipe(
    O.fromNullable(builtins[input]),
    O.map(() => `${input} is a shell builtin`)
  );

const findExecutable = (input: string): O.Option<string> =>
  pipe(
    O.fromNullable(process.env.PATH),
    O.map((pathContents) => pathContents.split(path.delimiter)),
    O.chain(
      A.findFirst((filePath) =>
        O.isSome(
          O.tryCatch(() => {
            fs.accessSync(`${filePath}/${input}`, fs.constants.X_OK);
          })
        )
      )
    ),
    O.map((filePath) => `${input} is ${filePath}/${input}`)
  );

export const type: Command<CommandArgs> = {
  eval: (args: CommandArgs): IOEvalResult => {
    const input = args[0];

    const text = pipe(
      findBuiltin(input),
      O.alt(() => findExecutable(input)),
      O.getOrElse(() => `${input}: not found`)
    );

    return IOE.right({
      _tag: 'Output',
      text
    });
  }
};
