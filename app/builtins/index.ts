import type { Command, CommandArgs } from '../types/Command';

import * as O from 'fp-ts/Option';
import * as A from 'fp-ts/Array';
import { pipe } from 'fp-ts/lib/function';
import path from 'path';
import fs from 'fs';

export type CommandName = string;

export type CommandRegistry = Record<CommandName, Command>;

export type FilePath = string;

// Dynamically import all built-in commands from the current directory
export const builtins: CommandRegistry = pipe(
  fs.readdirSync(__dirname),
  A.filter((f) => f.endsWith('.ts') && f !== 'index.ts'),
  A.map((f) => path.basename(f, '.ts')),
  A.reduce({} as CommandRegistry, (acc, name) => ({
    ...acc,
    [name]: require(`./${name}`)[name]
  }))
);

export const findBuiltin = (builtinName: string): O.Option<Command> =>
  O.fromNullable(builtins[builtinName]);

export const findExecutable = (fileName: string): O.Option<FilePath> =>
  pipe(
    O.fromNullable(process.env.PATH),
    O.map((pathContents) => pathContents.split(path.delimiter)),
    O.chain(
      A.findFirst((filePath) =>
        O.isSome(
          O.tryCatch(() => {
            fs.accessSync(`${filePath}/${fileName}`, fs.constants.X_OK);
          })
        )
      )
    )
  );
