import type { Command, CommandArgs } from '../types/Command';
import { echo } from './echo';
import { exit } from './exit';
import { type } from './type';
import * as O from 'fp-ts/Option';
import * as A from 'fp-ts/Array';
import { pipe } from 'fp-ts/lib/function';
import path from 'path';
import fs from 'fs';

export type CommandName = string;

export type CommandRegistry = Record<CommandName, Command<CommandArgs>>;

export type FilePath = string;

export const builtins: CommandRegistry = {
  echo,
  exit,
  type
};

export const findBuiltin = (
  builtinName: string
): O.Option<Command<CommandArgs>> => O.fromNullable(builtins[builtinName]);

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
